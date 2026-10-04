<?php

declare(strict_types=1);

namespace App\Models;

/**
 * A single amount owed to the user. Status is always derived from the sum of
 * its payments so the two can never drift apart.
 */
final class Debt extends Model
{
    protected static string $table = 'debts';

    private const SORTS = [
        'recent' => 'de.updated_at DESC',
        'oldest' => 'de.created_at ASC',
        'amount_high' => 'de.amount DESC',
        'amount_low' => 'de.amount ASC',
        'due_soon' => 'de.due_date IS NULL, de.due_date ASC',
    ];

    private const BASE_SELECT = 'SELECT de.*, dr.name AS debtor_name, dr.phone AS debtor_phone,
                    COALESCE((SELECT SUM(p.amount) FROM payments p
                              WHERE p.debt_id = de.id AND p.deleted_at IS NULL), 0) AS paid_amount
                FROM debts de
                JOIN debtors dr ON dr.id = de.debtor_id
                WHERE de.user_id = ?';

    /**
     * @return list<array<string,mixed>>
     */
    public static function allForUser(
        int $userId,
        ?string $status = null,
        ?string $search = null,
        ?int $debtorId = null,
        ?bool $overdue = null,
        string $sort = 'recent',
    ): array {
        $sql = self::BASE_SELECT . ' AND de.deleted_at IS NULL';
        $bindings = [$userId];

        if ($status !== null && $status !== 'all') {
            if (in_array($status, ['pending', 'partial', 'settled'], true)) {
                $sql .= ' AND de.status = ?';
                $bindings[] = $status;
            }
        }

        if ($overdue === true) {
            $sql .= " AND de.status <> 'settled' AND de.due_date IS NOT NULL AND de.due_date < CURDATE()";
        }

        if ($debtorId !== null) {
            $sql .= ' AND de.debtor_id = ?';
            $bindings[] = $debtorId;
        }

        if ($search !== null && $search !== '') {
            $sql .= ' AND (dr.name LIKE ? OR de.note LIKE ?)';
            $like = '%' . $search . '%';
            $bindings[] = $like;
            $bindings[] = $like;
        }

        $sql .= ' ORDER BY ' . (self::SORTS[$sort] ?? self::SORTS['recent']);

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
        $statement = static::db()->prepare(self::BASE_SELECT . ' AND de.id = ?');
        $statement->execute([$userId, $id]);
        $row = $statement->fetch();

        return $row === false ? null : self::present($row);
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function findWithTrashed(int $id, int $userId): ?array
    {
        return static::findForUser($id, $userId, true);
    }

    /**
     * @param array<string,mixed> $data
     */
    public static function create(int $userId, array $data): int
    {
        return static::insert([
            'user_id' => $userId,
            'debtor_id' => $data['debtor_id'],
            'amount' => $data['amount'],
            'due_date' => $data['due_date'] ?? null,
            'note' => $data['note'] ?? null,
            'status' => 'pending',
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

    /**
     * When a debtor is removed their debts go with it, so totals stay honest.
     */
    public static function softDeleteForDebtor(int $debtorId, int $userId): int
    {
        $statement = static::db()->prepare(
            'UPDATE debts SET deleted_at = NOW()
             WHERE debtor_id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $statement->execute([$debtorId, $userId]);

        return $statement->rowCount();
    }

    /**
     * Recompute status (+ settled_at) from the payment total.
     */
    public static function refreshStatus(int $debtId, int $userId): void
    {
        $statement = static::db()->prepare(
            'SELECT amount,
                    COALESCE((SELECT SUM(p.amount) FROM payments p
                              WHERE p.debt_id = debts.id AND p.deleted_at IS NULL), 0) AS paid
             FROM debts WHERE id = ? AND user_id = ? AND deleted_at IS NULL'
        );
        $statement->execute([$debtId, $userId]);
        $row = $statement->fetch();

        if ($row === false) {
            return;
        }

        $amount = (float) $row['amount'];
        $paid = (float) $row['paid'];

        $status = $paid <= 0 ? 'pending' : ($paid < $amount ? 'partial' : 'settled');

        static::updateById($debtId, $userId, [
            'status' => $status,
            'settled_at' => $status === 'settled' ? date('Y-m-d H:i:s') : null,
        ]);
    }

    /**
     * @param array<string,mixed> $row
     * @return array<string,mixed>
     */
    public static function present(array $row): array
    {
        $amount = (float) $row['amount'];
        $paid = number_format((float) ($row['paid_amount'] ?? 0), 2, '.', '');
        $dueDate = $row['due_date'] ?? null;

        return [
            'id' => (int) $row['id'],
            'debtorId' => (int) $row['debtor_id'],
            'debtorName' => $row['debtor_name'] ?? null,
            'debtorPhone' => $row['debtor_phone'] ?? null,
            'amount' => number_format($amount, 2, '.', ''),
            'paidAmount' => $paid,
            'balance' => number_format(max($amount - (float) $paid, 0.0), 2, '.', ''),
            'dueDate' => $dueDate,
            'isOverdue' => $row['status'] !== 'settled' && $dueDate !== null && $dueDate < date('Y-m-d'),
            'note' => $row['note'] ?? null,
            'status' => $row['status'],
            'settledAt' => $row['settled_at'] ?? null,
            'deletedAt' => $row['deleted_at'] ?? null,
            'createdAt' => $row['created_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
}
