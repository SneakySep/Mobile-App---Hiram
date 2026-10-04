<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;
use App\Core\Response;
use App\Models\Debt;
use App\Models\Debtor;
use App\Models\Payment;

/**
 * GET /api/sync?since= - everything that changed since a timestamp, so the
 * app can keep a local mirror without refetching the whole dataset.
 * Omitting "since" returns the full snapshot.
 */
final class SyncController
{
    public function changes(Request $request): Response
    {
        $userId = $request->userId();
        $since = $request->query('since');

        if ($since !== null && !preg_match('/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?Z?$/', $since)) {
            throw ApiException::validation(['since' => 'since must be an ISO-8601 timestamp.']);
        }

        $normalized = $since === null ? null : $this->normalize($since);

        return Response::ok([
            'serverTime' => date('c'),
            'debtors' => array_map([Debtor::class, 'present'], $this->debtorRows($userId, $normalized)),
            'debts' => array_map([Debt::class, 'present'], $this->debtRows($userId, $normalized)),
            'payments' => $normalized === null
                ? $this->allPayments($userId)
                : Payment::changedSince($userId, $normalized),
        ]);
    }

    /**
     * Debtor rows, including soft-deleted ones when syncing a delta.
     *
     * @return list<array<string,mixed>>
     */
    private function debtorRows(int $userId, ?string $normalized): array
    {
        $sql = 'SELECT * FROM debtors WHERE user_id = ?';
        $bindings = [$userId];

        if ($normalized !== null) {
            $sql .= ' AND updated_at > ?';
            $bindings[] = $normalized;
        } else {
            $sql .= ' AND deleted_at IS NULL';
        }

        $statement = \App\Config\Database::connection()->prepare($sql);
        $statement->execute($bindings);

        /** @var list<array<string,mixed>> $rows */
        $rows = $statement->fetchAll();

        return $rows;
    }

    /**
     * Debts joined with the debtor's name so the app can render rows without
     * an extra join of its own. Soft-deleted rows are included when syncing
     * deltas (so the mirror can drop them) and excluded in a full snapshot.
     *
     * @return list<array<string,mixed>>
     */
    private function debtRows(int $userId, ?string $normalized): array
    {
        $sql = 'SELECT de.*, dr.name AS debtor_name, dr.phone AS debtor_phone,
                       COALESCE((SELECT SUM(p.amount) FROM payments p
                                 WHERE p.debt_id = de.id AND p.deleted_at IS NULL), 0) AS paid_amount
                FROM debts de JOIN debtors dr ON dr.id = de.debtor_id
                WHERE de.user_id = ?';
        $bindings = [$userId];

        if ($normalized !== null) {
            $sql .= ' AND de.updated_at > ?';
            $bindings[] = $normalized;
        } else {
            $sql .= ' AND de.deleted_at IS NULL';
        }

        $statement = \App\Config\Database::connection()->prepare($sql);
        $statement->execute($bindings);

        /** @var list<array<string,mixed>> $rows */
        $rows = $statement->fetchAll();

        return $rows;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function allPayments(int $userId): array
    {
        $statement = \App\Config\Database::connection()->prepare(
            'SELECT * FROM payments WHERE user_id = ? ORDER BY paid_at ASC'
        );
        $statement->execute([$userId]);

        /** @var list<array<string,mixed>> $rows */
        $rows = $statement->fetchAll();

        return array_map([Payment::class, 'present'], $rows);
    }

    private function normalize(string $since): string
    {
        try {
            return (new \DateTimeImmutable($since))
                ->setTimezone(new \DateTimeZone(date_default_timezone_get()))
                ->format('Y-m-d H:i:s');
        } catch (\Exception) {
            throw ApiException::validation(['since' => 'since must be an ISO-8601 timestamp.']);
        }
    }
}
