<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Immutable HTTP request value object built from PHP superglobals.
 */
final class Request
{
    /**
     * @param array<string,mixed> $query
     * @param array<string,mixed> $body
     * @param array<string,string> $params Route parameters (e.g. {id}).
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $query = [],
        public readonly array $body = [],
        public array $params = [],
        public ?array $user = null,
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $path = self::resolvePath();

        $body = [];
        $raw = file_get_contents('php://input');
        $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));

        if ($raw !== false && $raw !== '') {
            if (str_contains($contentType, 'application/json')) {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $body = $decoded;
                }
            } elseif (str_contains($contentType, 'x-www-form-urlencoded')) {
                parse_str($raw, $body);
            }
        }

        if ($body === [] && $method === 'POST' && $_POST !== []) {
            $body = $_POST;
        }

        return new self($method, $path, $_GET ?? [], is_array($body) ? $body : []);
    }

    public function withUser(array $user): self
    {
        $clone = clone $this;
        $clone->user = $user;

        return $clone;
    }

    /**
     * The path relative to the API root, tolerating the fact that this project
     * can live inside a folder whose name contains a space ("MA Hiram").
     */
    private static function resolvePath(): string
    {
        $uri = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?? '/');
        $uri = rawurldecode($uri);

        $base = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '')));
        if ($base !== '' && $base !== '/' && str_starts_with($uri, $base)) {
            $uri = substr($uri, strlen($base));
        }

        if (str_starts_with($uri, '/index.php')) {
            $uri = substr($uri, strlen('/index.php'));
        }

        return '/' . trim($uri, '/');
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $value = $_SERVER[$key] ?? null;

        // Apache (mod_php) drops the Authorization header before it reaches
        // $_SERVER, so fall back to the request header list it does expose.
        if ($value === null && function_exists('getallheaders')) {
            static $headers = null;
            $headers ??= array_change_key_case((array) getallheaders(), CASE_LOWER);
            $value = $headers[strtolower($name)] ?? null;
        }

        return $value === null ? null : (string) $value;
    }

    public function bearerToken(): ?string
    {
        $header = $this->header('Authorization') ?? $this->header('X-Api-Token');
        if ($header === null || trim($header) === '') {
            return null;
        }

        if (preg_match('/Bearer\s+(.+)/i', $header, $m) === 1) {
            return trim($m[1]);
        }

        return trim($header);
    }

    public function userId(): int
    {
        if ($this->user === null) {
            throw ApiException::unauthenticated();
        }

        return (int) $this->user['id'];
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function param(string $key): ?string
    {
        return $this->params[$key] ?? null;
    }

    public function paramInt(string $key): int
    {
        $value = $this->param($key);
        if ($value === null || !ctype_digit($value)) {
            throw ApiException::notFound();
        }

        return (int) $value;
    }

    public function query(string $key, ?string $default = null): ?string
    {
        $value = $this->query[$key] ?? null;

        return ($value === null || $value === '') ? $default : (string) $value;
    }
}
