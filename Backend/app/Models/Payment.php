<?php

declare(strict_types=1);

namespace App\Models;

/**
 * A payment made towards one debt.
 */
final class Payment extends Model
{
    protected static string $table = 'payments';

    public const METHODS = ['cash', 'gcash', 'maya', 'bank', 'other'];

    /**
     * @return list<array<string,mixed>>
     */
    public static function forDebt(int $debtId, int $userId): array
    {
        $statement = static::db()->prepare(
            'SELECT * FROM payments WHERE debt_id = ? AND user_id = ? AND deleted_at IS NULL
             ORDER BY paid_at DESC, id DESC'
        );
        $statement->execute([$debtId, $userId]);

        /** @var list<array<string,mixed>> $rows */
        $rows = $statement->fetchAll();

        return array_map([self::class, 'present'], $rows);
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function find(int $id, int $userId): ?array
    {
        $row = static::findForUser($id, $userId);

        return $row === null ? null : self::present($row);
    }

    public static function sumForDebt(int $debtId, int $userId): float
    {
        $statement = static::db()->prepare(
            'SELECT COALESCE(SUM(amount), 0) FROM payments
             WHERE debt_id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $statement->execute([$debtId, $userId]);

        return (float) $statement->fetchColumn();
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function create(int $userId, array $data): int
    {
        return static::insert([
            'user_id' => $userId,
            'debt_id' => $data['debt_id'],
            'amount' => $data['amount'],
            'method' => $data['method'] ?? 'cash',
            'paid_at' => $data['paid_at'] ?? date('Y-m-d H:i:s'),
            'note' => $data['note'] ?? null,
        ]);
    }

    public static function softDelete(int $id, int $userId): bool
    {
        return static::updateById($id, $userId, ['deleted_at' => date('Y-m-d H:i:s')]) > 0;
    }

    /**
     * Rows changed since a timestamp, for the app's background refresh.
     *
     * @return list<array<string,mixed>>
     */
    public static function changedSince(int $userId, string $since): array
    {
        $statement = static::db()->prepare(
            'SELECT * FROM payments WHERE user_id = ? AND updated_at > ? ORDER BY updated_at ASC LIMIT 500'
        );
        $statement->execute([$userId, $since]);

        /** @var list<array<string,mixed>> $rows */
        $rows = $statement->fetchAll();

        return array_map([self::class, 'present'], $rows);
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function present(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'debtId' => (int) $row['debt_id'],
            'amount' => number_format((float) $row['amount'], 2, '.', ''),
            'method' => $row['method'] ?? 'cash',
            'paidAt' => $row['paid_at'] ?? null,
            'note' => $row['note'] ?? null,
            'deletedAt' => $row['deleted_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}
