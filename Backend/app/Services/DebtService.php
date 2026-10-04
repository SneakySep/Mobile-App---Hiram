<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Core\ApiException;
use App\Models\Debt;
use App\Models\Debtor;
use App\Models\Payment;

/**
 * Business rules that span more than one table: money guards and totals.
 */
final class DebtService
{
    /**
     * Resolve the debtor for a new/updated debt: accept an existing debtorId,
     * or create a debtor from a name typed inline.
     *
     * @return array{debtorId:int, created:bool}
     */
    public function resolveDebtor(int $userId, mixed $debtorId, ?string $debtorName): array
    {
        if ($debtorId !== null && $debtorId !== '') {
            $id = (int) $debtorId;
            if (Debtor::find($id, $userId) === null) {
                throw new ApiException('debtor_not_found', 'That debtor does not exist.', 404);
            }

            return ['debtorId' => $id, 'created' => false];
        }

        if ($debtorName === null || trim($debtorName) === '') {
            throw ApiException::validation(['debtorId' => 'Choose a debtor or enter a new name.']);
        }

        return ['debtorId' => Debtor::create($userId, ['name' => trim($debtorName)]), 'created' => true];
    }

    /**
     * Reject a payment that would exceed what is still owed. The app UI does
     * this too, but the server is the one that keeps the numbers honest.
     */
    public function assertPaymentFits(int $debtId, int $userId, string $amount, bool $allowOverpay = false): array
    {
        $debt = Debt::find($debtId, $userId);
        if ($debt === null) {
            throw ApiException::notFound('Debt not found.');
        }

        if ($debt['status'] === 'settled' && !$allowOverpay) {
            throw ApiException::conflict('This debt is already settled.');
        }

        $balance = (float) $debt['balance'];
        $incoming = (float) $amount;

        if (!$allowOverpay && $incoming - $balance > 0.009) {
            throw ApiException::validation(
                ['amount' => sprintf('Payment exceeds the remaining balance of %s.', number_format($balance, 2))],
                'That payment is more than what is left.'
            );
        }

        return $debt;
    }

    /**
     * @return array<string,mixed>
     */
    public function summary(int $userId): array
    {
        $pdo = Database::connection();
        $today = date('Y-m-d');

        $statement = $pdo->prepare(
            "SELECT
                COUNT(*) AS debt_count,
                COALESCE(SUM(de.amount), 0) AS total_lent,
                COALESCE(SUM((SELECT SUM(p.amount) FROM payments p
                              WHERE p.debt_id = de.id AND p.deleted_at IS NULL)), 0) AS total_collected,
                COALESCE(SUM(CASE WHEN de.status <> 'settled' THEN de.amount ELSE 0 END), 0) AS outstanding_gross,
                COALESCE(SUM(CASE WHEN de.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
                COALESCE(SUM(CASE WHEN de.status = 'partial' THEN 1 ELSE 0 END), 0) AS partial_count,
                COALESCE(SUM(CASE WHEN de.status = 'settled' THEN 1 ELSE 0 END), 0) AS settled_count,
                COALESCE(SUM(CASE WHEN de.status <> 'settled' AND de.due_date IS NOT NULL
                                  AND de.due_date < :today THEN 1 ELSE 0 END), 0) AS overdue_count,
                COALESCE(SUM(CASE WHEN de.status <> 'settled' AND de.due_date IS NOT NULL
                                  AND de.due_date < :today2 THEN de.amount ELSE 0 END), 0) AS overdue_amount
             FROM debts de
             WHERE de.user_id = :user_id AND de.deleted_at IS NULL"
        );
        $statement->execute(['user_id' => $userId, 'today' => $today, 'today2' => $today]);
        $totals = $statement->fetch() ?: [];

        $paidOut = (float) ($totals['total_collected'] ?? 0);
        $outstanding = max((float) ($totals['total_lent'] ?? 0) - $paidOut, 0.0);

        $debtorStatement = $pdo->prepare(
            'SELECT COUNT(*) FROM debtors WHERE user_id = ? AND deleted_at IS NULL'
        );
        $debtorStatement->execute([$userId]);

        return [
            'totalLent' => number_format((float) ($totals['total_lent'] ?? 0), 2, '.', ''),
            'totalCollected' => number_format($paidOut, 2, '.', ''),
            'totalOutstanding' => number_format($outstanding, 2, '.', ''),
            'debtCount' => (int) ($totals['debt_count'] ?? 0),
            'debtorCount' => (int) $debtorStatement->fetchColumn(),
            'pendingCount' => (int) ($totals['pending_count'] ?? 0),
            'partialCount' => (int) ($totals['partial_count'] ?? 0),
            'settledCount' => (int) ($totals['settled_count'] ?? 0),
            'overdueCount' => (int) ($totals['overdue_count'] ?? 0),
            'overdueAmount' => number_format((float) ($totals['overdue_amount'] ?? 0), 2, '.', ''),
            'collectedPercent' => ((float) ($totals['total_lent'] ?? 0)) > 0
                ? round(($paidOut / (float) $totals['total_lent']) * 100, 1)
                : 0.0,
            'asOf' => date('c'),
        ];
    }

    /**
     * Money collected per day for the last N days - powers the dashboard chart.
     *
     * @return list<array<string,mixed>>
     */
    public function collectionsByDay(int $userId, int $days = 14): array
    {
        $statement = Database::connection()->prepare(
            'SELECT DATE(paid_at) AS day, COALESCE(SUM(amount), 0) AS total
             FROM payments
             WHERE user_id = ? AND deleted_at IS NULL AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(paid_at)
             ORDER BY day ASC'
        );
        $statement->execute([$userId, $days]);

        return $statement->fetchAll() ?: [];
    }
}
