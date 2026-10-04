<?php

declare(strict_types=1);

namespace App\Models;

/**
 * A person who owes the user money. Kept separate from a debt so one person
 * can owe several amounts.
 */
final class Debtor extends Model
{
    protected static string $table = 'debtors';

    /**
     * @return list<array<string,mixed>>
     */
    public static function allForUser(int $userId, ?string $search = null): array
    {
        $sql = 'SELECT d.*,
                       COUNT(de.id) AS debt_count,
                       COALESCE(SUM(CASE WHEN de.deleted_at IS NULL THEN de.amount ELSE 0 END), 0) AS total_amount,
                       COALESCE(SUM(CASE WHEN de.deleted_at IS NULL THEN
                            (de.amount - (
                                SELECT COALESCE(SUM(p.amount), 0) FROM payments p
                                WHERE p.debt_id = de.id AND p.deleted_at IS NULL
                            )) ELSE 0 END), 0) AS outstanding_amount,
                       COALESCE(SUM(CASE WHEN de.deleted_at IS NULL AND de.status <> \'settled\'
                            AND de.due_date IS NOT NULL AND de.due_date < CURDATE() THEN 1 ELSE 0 END), 0) AS overdue_count
                FROM debtors d
                LEFT JOIN debts de ON de.debtor_id = d.id
                WHERE d.user_id = ? AND d.deleted_at IS NULL';

        $bindings = [$userId];

        if ($search !== null && $search !== '') {
            $sql .= ' AND (d.name LIKE ? OR d.phone LIKE ?)';
            $like = '%' . $search . '%';
            $bindings[] = $like;
            $bindings[] = $like;
        }

        $sql .= ' GROUP BY d.id ORDER BY outstanding_amount DESC, d.name ASC';

        $statement = static::db()->prepare($sql);
        $statement->execute($bindings);

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

    /**
     * @param array<string,mixed> $data
     */
    public static function create(int $userId, array $data): int
    {
        return static::insert([
            'user_id' => $userId,
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'note' => $data['note'] ?? null,
        ]);
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function update(int $id, int $userId, array $data): void
    {
        static::updateById($id, $userId, $data);
    }

    public static function softDelete(int $id, int $userId): bool
    {
        return static::updateById($id, $userId, ['deleted_at' => date('Y-m-d H:i:s')]) > 0;
    }

    public static function countActiveDebts(int $debtorId, int $userId): int
    {
        $statement = static::db()->prepare(
            'SELECT COUNT(*) FROM debts WHERE debtor_id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $statement->execute([$debtorId, $userId]);

        return (int) $statement->fetchColumn();
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function present(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'] ?? null,
            'note' => $row['note'] ?? null,
            'debtCount' => isset($row['debt_count']) ? (int) $row['debt_count'] : null,
            'totalAmount' => isset($row['total_amount']) ? number_format((float) $row['total_amount'], 2, '.', '') : null,
            'outstandingAmount' => isset($row['outstanding_amount'])
                ? number_format((float) $row['outstanding_amount'], 2, '.', '')
                : null,
            'overdueCount' => isset($row['overdue_count']) ? (int) $row['overdue_count'] : null,
            'deletedAt' => $row['deleted_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}
