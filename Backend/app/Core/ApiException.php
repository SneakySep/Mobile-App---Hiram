<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * An error that maps cleanly onto an HTTP JSON error response.
 */
final class ApiException extends RuntimeException
{
    /**
     * @param array<string,string> $errors Field-level validation errors.
     */
    public function __construct(
        public readonly string $errorCode,
        string $message,
        public readonly int $status = 400,
        public readonly array $errors = [],
    ) {
        parent::__construct($message, $status);
    }

    public static function unauthenticated(string $message = 'You must be signed in.'): self
    {
        return new self('unauthenticated', $message, 401);
    }

    public static function notFound(string $message = 'Resource not found.'): self
    {
        return new self('not_found', $message, 404);
    }

    public static function forbidden(string $message = 'Not allowed.'): self
    {
        return new self('forbidden', $message, 403);
    }

    public static function conflict(string $message, array $errors = []): self
    {
        return new self('conflict', $message, 409, $errors);
    }

    public static function validation(array $errors, string $message = 'The submitted data is invalid.'): self
    {
        return new self('validation_failed', $message, 422, $errors);
    }
}
