<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Models\AuthToken;
use App\Models\User;

final class AuthController
{
    public function register(Request $request): Response
    {
        $data = (new Validator($request->body))
            ->string('name', 2, 80)
            ->email('email')
            ->string('password', 8, 100)
            ->string('currency', 1, 8, false)
            ->validate();

        if (User::findByEmail((string) $data['email']) !== null) {
            throw ApiException::conflict('That email is already registered.', ['email' => 'Already in use.']);
        }

        $userId = User::create(
            (string) $data['name'],
            (string) $data['email'],
            (string) $data['password'],
            (string) ($data['currency'] ?? 'PHP')
        );

        return Response::created($this->tokenPayload($userId));
    }

    public function login(Request $request): Response
    {
        $data = (new Validator($request->body))
            ->email('email')
            ->string('password', 1, 100)
            ->validate();

        $user = User::findByEmail((string) $data['email']);

        if ($user === null || !password_verify((string) $data['password'], (string) $user['password_hash'])) {
            throw new ApiException('invalid_credentials', 'Incorrect email or password.', 401);
        }

        // Keep at most a handful of live sessions per account.
        if (AuthToken::countForUser((int) $user['id']) >= 8) {
            AuthToken::revokeOldestForUser((int) $user['id'], 5);
        }

        return Response::ok($this->tokenPayload((int) $user['id']));
    }

    public function me(Request $request): Response
    {
        /** @var array<string,mixed> $user */
        $user = $request->user;

        return Response::ok(User::present($user));
    }

    public function logout(Request $request): Response
    {
        $token = $request->bearerToken();
        if ($token !== null) {
            AuthToken::revoke($token);
        }

        return Response::ok(['message' => 'Signed out.']);
    }

    public function updateProfile(Request $request): Response
    {
        $data = (new Validator($request->body))
            ->string('name', 2, 80, false)
            ->string('currency', 1, 8, false)
            ->string('password', 8, 100, false)
            ->validate();

        $data = array_filter($data, static fn ($value): bool => $value !== null);

        /** @var array<string,mixed> $user */
        $user = $request->user;
        User::updateProfile((int) $user['id'], $data);

        return Response::ok(User::present(User::findById((int) $user['id']) ?? $user));
    }

    /**
     * @return array<string,mixed>
     */
    private function tokenPayload(int $userId): array
    {
        $issued = AuthToken::issue($userId, Env::int('TOKEN_TTL_DAYS', 30));
        $user = User::findById($userId);

        if ($user === null) {
            throw ApiException::unauthenticated();
        }

        return [
            'token' => $issued['token'],
            'expiresAt' => $issued['expiresAt'],
            'user' => User::present($user),
        ];
    }
}
