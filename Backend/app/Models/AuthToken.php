<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Opaque bearer tokens. Only the SHA-256 hash of a token is stored, so a
 * database leak cannot be replayed against the API.
 */
final class AuthToken extends Model
{
    protected static string $table = 'auth_tokens';

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }

    /**
     * @return array{token:string, expiresAt:string}
     */
    public static function issue(int $userId, int $daysValid = 30): array
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = (new \DateTimeImmutable("+{$daysValid} days"))->format('Y-m-d H:i:s');

        static::insert([
            'user_id' => $userId,
            'token_hash' => self::hash($token),
            'expires_at' => $expiresAt,
        ]);

        return ['token' => $token, 'expiresAt' => $expiresAt];
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function findValid(string $token): ?array
    {
        $statement = static::db()->prepare(
            'SELECT * FROM auth_tokens WHERE token_hash = ? AND expires_at > NOW() LIMIT 1'
        );
        $statement->execute([self::hash($token)]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public static function revoke(string $token): void
    {
        $statement = static::db()->prepare('DELETE FROM auth_tokens WHERE token_hash = ?');
        $statement->execute([self::hash($token)]);
    }

    public static function revokeAllForUser(int $userId): void
    {
        static::db()->prepare('DELETE FROM auth_tokens WHERE user_id = ?')->execute([$userId]);
    }

    public static function countForUser(int $userId): int
    {
        $statement = static::db()->prepare('SELECT COUNT(*) FROM auth_tokens WHERE user_id = ?');
        $statement->execute([$userId]);

        return (int) $statement->fetchColumn();
    }

    /**
     * Trim the oldest sessions so a logged-in device does not pile up forever.
     */
    public static function revokeOldestForUser(int $userId, int $keep): void
    {
        $statement = static::db()->prepare(
            'DELETE FROM auth_tokens WHERE user_id = ? ORDER BY created_at ASC LIMIT ?'
        );
        $statement->bindValue(1, $userId, \PDO::PARAM_INT);
        $statement->bindValue(2, max(0, self::countForUser($userId) - $keep), \PDO::PARAM_INT);
        $statement->execute();
    }

    public static function purgeExpired(): int
    {
        $statement = static::db()->prepare('DELETE FROM auth_tokens WHERE expires_at <= NOW()');
        $statement->execute();

        return $statement->rowCount();
    }
}
