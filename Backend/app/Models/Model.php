<?php

declare(strict_types=1);

namespace App\Models;

use App\Config\Database;
use PDO;

/**
 * Shared plumbing for the row mappers.
 */
abstract class Model
{
    protected static string $table = '';

    protected static function db(): PDO
    {
        return Database::connection();
    }

    /**
     * @param array<string,mixed> $data Column => value.
     */
    protected static function insert(array $data): int
    {
        $columns = array_keys($data);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            static::$table,
            implode(', ', array_map(static fn (string $c): string => "`{$c}`", $columns)),
            implode(', ', array_map(static fn (string $c): string => ":{$c}", $columns))
        );

        static::db()->prepare($sql)->execute($data);

        return (int) static::db()->lastInsertId();
    }

    /**
     * @param array<string,mixed> $data Column => value.
     */
    protected static function updateById(int $id, int $userId, array $data): int
    {
        if ($data === []) {
            return 0;
        }

        $assignments = implode(', ', array_map(
            static fn (string $c): string => "`{$c}` = :set_{$c}",
            array_keys($data)
        ));

        $bindings = [];
        foreach ($data as $column => $value) {
            $bindings["set_{$column}"] = $value;
        }
        $bindings['id'] = $id;
        $bindings['user_id'] = $userId;

        $sql = sprintf(
            'UPDATE %s SET %s WHERE id = :id AND user_id = :user_id',
            static::$table,
            $assignments
        );

        $statement = static::db()->prepare($sql);
        $statement->execute($bindings);

        return $statement->rowCount();
    }

    /**
     * @return array<string,mixed>|null
     */
    protected static function findForUser(int $id, int $userId, bool $withTrashed = false): ?array
    {
        $sql = sprintf('SELECT * FROM %s WHERE id = :id AND user_id = :user_id', static::$table);
        if (!$withTrashed) {
            $sql .= ' AND deleted_at IS NULL';
        }

        $statement = static::db()->prepare($sql);
        $statement->execute(['id' => $id, 'user_id' => $userId]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }
}
