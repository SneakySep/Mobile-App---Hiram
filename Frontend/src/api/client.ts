/**
 * Thin fetch wrapper around the Hiram API.
 *
 * Responsibilities:
 *  - prefix every call with EXPO_PUBLIC_API_URL
 *  - attach `Authorization: Bearer <token>` via an injected getter, so this
 *    module never has to import the auth store (which would be a cycle)
 *  - unwrap the `{ data: ... }` envelope into a plain value
 *  - turn `{ error: { code, message, errors } }` into a typed ApiError
 *  - notify the app exactly once when the server says the token is dead
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Per-field validation messages keyed by field name, when the server sent them. */
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** Convenience for screens that want to show "field: message" inline. */
  get firstFieldMessage(): string | null {
    const values = Object.values(this.fields);
    return values.length > 0 ? values[0]! : null;
  }
}

type TokenGetter = () => string | null;

let apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
let getToken: TokenGetter = () => null;
let onUnauthorized: ((error: ApiError) => void) | null = null;
let unauthorizedInFlight = false;

export function configureApi(options: { baseUrl?: string; tokenGetter?: TokenGetter }): void {
  if (options.baseUrl !== undefined) {
    apiBaseUrl = options.baseUrl.replace(/\/+$/, '');
  }
  if (options.tokenGetter !== undefined) {
    getToken = options.tokenGetter;
  }
}

/**
 * Register the handler for a rejected/expired token. Fires once per burst so a
 * screen with four parallel queries does not sign the user out four times.
 */
export function setUnauthorizedHandler(handler: ((error: ApiError) => void) | null): void {
  onUnauthorized = handler;
  unauthorizedInFlight = false;
}

export function getApiBaseUrl(): string {
  return apiBaseUrl;
}

function normalizeBaseUrl(): string {
  if (apiBaseUrl === '') {
    throw new ApiError(0, 'not_configured', 'EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env.');
  }
  return apiBaseUrl;
}

function fieldMessages(errors: unknown): Record<string, string> {
  if (typeof errors !== 'object' || errors === null || Array.isArray(errors)) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    if (typeof value === 'string') {
      out[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      out[key] = value[0] as string;
    }
  }
  return out;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function buildQuery(params: QueryParams = {}): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs === '' ? '' : `?${qs}`;
}

export type RequestBody = object | undefined;

async function request<T>(method: string, path: string, body?: RequestBody, query?: QueryParams): Promise<T> {
  const url = `${normalizeBaseUrl()}${path}${buildQuery(query)}`;
  const token = getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      'network_error',
      'Cannot reach the server. Check that Apache and MySQL are running and that the API URL is correct.',
    );
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text !== '') {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; errors?: unknown } } | null)?.error;
    const apiError = new ApiError(
      response.status,
      error?.code ?? 'request_failed',
      error?.message ?? `Request failed (${response.status}).`,
      fieldMessages(error?.errors),
    );

    if (response.status === 401 && !unauthorizedInFlight) {
      unauthorizedInFlight = true;
      onUnauthorized?.(apiError);
    }

    throw apiError;
  }

  const envelope = payload as { data?: T } | null;
  if (envelope === null) {
    throw new ApiError(response.status, 'bad_response', 'The server returned an unreadable response.');
  }

  return envelope.data as T;
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => request<T>('GET', path, undefined, query),
  post: <T>(path: string, body?: RequestBody) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: RequestBody) => request<T>('PUT', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
