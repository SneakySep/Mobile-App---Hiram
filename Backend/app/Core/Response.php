<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Tiny JSON response wrapper. Every success payload is { "data": ... }.
 */
final class Response
{
    /**
     * @param array<string,mixed> $payload
     */
    public function __construct(
        public readonly int $status = 200,
        public readonly array $payload = [],
    ) {
    }

    public static function ok(mixed $data = null, array $extra = []): self
    {
        return new self(200, ['data' => $data] + $extra);
    }

    public static function created(mixed $data = null): self
    {
        return new self(201, ['data' => $data]);
    }

    public static function noContent(): self
    {
        return new self(204, []);
    }

    /**
     * @param array<string,string> $errors
     */
    public static function error(string $code, string $message, int $status = 400, array $errors = []): self
    {
        $error = ['code' => $code, 'message' => $message];
        if ($errors !== []) {
            $error['errors'] = $errors;
        }

        return new self($status, ['error' => $error]);
    }

    public function send(): void
    {
        http_response_code($this->status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');

        if ($this->status === 204 || $this->payload === []) {
            return;
        }

        echo json_encode(
            $this->payload,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT
        );
    }
}
