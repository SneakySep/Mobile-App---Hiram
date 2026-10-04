<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Resolves the "Authorization: Bearer <token>" header to a user row and
 * exposes it to controllers through an immutable cloned Request.
 */
final class Auth
{
    public function __construct(private readonly \App\Models\AuthToken $tokens)
    {
    }

    public function authenticate(Request $request): Request
    {
        $token = $request->bearerToken();
        if ($token === null || $token === '') {
            throw ApiException::unauthenticated('Missing access token. Sign in first.');
        }

        $record = $this->tokens->findValid($token);
        if ($record === null) {
            throw ApiException::unauthenticated('Your session has expired. Please sign in again.');
        }

        $user = \App\Models\User::findById((int) $record['user_id']);
        if ($user === null) {
            throw ApiException::unauthenticated('Account no longer exists.');
        }

        return $request->withUser($user);
    }
}
