<?php

declare(strict_types=1);

namespace App\Models;

/**
 * @extends Model
 */
final class User extends Model
{
    protected static string $table = 'users';

    /**
     * @return array<string,mixed>|null
     */
    public static function findByEmail(string $email): ?array
    {
        $statement = static::db()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $statement->execute([strtolower($email)]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function findById(int $id): ?array
    {
        $statement = static::db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $statement->execute([$id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public static function create(string $name, string $email, string $password, string $currency): int
    {
        return static::insert([
            'name' => $name,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'currency' => $currency,
        ]);
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function updateProfile(int $id, array $data): void
    {
        if (isset($data['password'])) {
            $data['password_hash'] = password_hash((string) $data['password'], PASSWORD_DEFAULT);
            unset($data['password']);
        }

        unset($data['id'], $data['email_verified'], $data['created_at']);

        static::updateByIdNoUser($id, $data);
    }

    /**
     * @param array<string,mixed> $data
     */
    private static function updateByIdNoUser(int $id, array $data): void
    {
        if ($data === []) {
            return;
        }

        $assignments = implode(', ', array_map(
            static fn (string $c): string => "`{$c}` = :{$c}",
            array_keys($data)
        ));

        $data['id'] = $id;

        static::db()->prepare("UPDATE users SET {$assignments} WHERE id = :id")->execute($data);
    }

    /**
     * Public shape of a user - never leaks the password hash.
     *
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function present(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'currency' => $row['currency'],
            'createdAt' => $row['created_at'],
        ];
    }
}
