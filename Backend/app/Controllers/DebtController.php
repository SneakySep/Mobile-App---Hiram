<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Models\Debt;
use App\Models\Payment;
use App\Services\DebtService;

final class DebtController
{
    public function __construct(private readonly DebtService $service = new DebtService())
    {
    }

    public function index(Request $request): Response
    {
        $debtorId = $request->query('debtorId');

        return Response::ok(Debt::allForUser(
            $request->userId(),
            $request->query('status'),
            $request->query('q'),
            ($debtorId === null || !ctype_digit($debtorId)) ? null : (int) $debtorId,
            $request->query('overdue') === '1' ? true : null,
            (string) $request->query('sort', 'recent')
        ));
    }

    public function show(Request $request): Response
    {
        $debt = $this->find($request);
        $debt['payments'] = Payment::forDebt((int) $debt['id'], $request->userId());

        return Response::ok($debt);
    }

    public function store(Request $request): Response
    {
        $userId = $request->userId();

        $data = (new Validator($request->body))
            ->integer('debtorId', false)
            ->string('debtorName', 2, 80, false)
            ->amount('amount')
            ->date('dueDate')
            ->string('note', 0, 500, false)
            ->validate();

        $debtor = $this->service->resolveDebtor($userId, $data['debtorId'] ?? null, $data['debtorName'] ?? null);

        $id = Debt::create($userId, [
            'debtor_id' => $debtor['debtorId'],
            'amount' => $data['amount'],
            'due_date' => $data['dueDate'],
            'note' => $data['note'],
        ]);

        /** @var array<string,mixed> $debt */
        $debt = Debt::find($id, $userId);

        return Response::created($debt + ['debtorCreated' => $debtor['created']]);
    }

    public function update(Request $request): Response
    {
        $userId = $request->userId();
        $id = $request->paramInt('id');

        if (Debt::find($id, $userId) === null) {
            throw ApiException::notFound('Debt not found.');
        }

        $data = (new Validator($request->body))
            ->integer('debtorId', false)
            ->amount('amount', false, false)
            ->date('dueDate')
            ->string('note', 0, 500, false)
            ->validate();

        $updates = [];

        if (($data['debtorId'] ?? null) !== null) {
            $this->service->resolveDebtor($userId, $data['debtorId'], null);
            $updates['debtor_id'] = (int) $data['debtorId'];
        }

        // Lowering the amount below what has already been paid would make the
        // balance negative, so the paid total caps it.
        if (isset($data['amount']) && $data['amount'] !== null) {
            $paid = Payment::sumForDebt($id, $userId);
            if ((float) $data['amount'] + 0.009 < $paid) {
                throw ApiException::validation([
                    'amount' => sprintf(
                        'Amount cannot be less than the %s already recorded in payments.',
                        number_format($paid, 2)
                    ),
                ]);
            }
            $updates['amount'] = $data['amount'];
        }

        if (array_key_exists('dueDate', $data)) {
            $updates['due_date'] = $data['dueDate'];
        }

        if (array_key_exists('note', $data)) {
            $updates['note'] = $data['note'];
        }

        Debt::update($id, $userId, $updates);
        Debt::refreshStatus($id, $userId);

        /** @var array<string,mixed> $debt */
        $debt = Debt::find($id, $userId);

        return Response::ok($debt);
    }

    public function destroy(Request $request): Response
    {
        $id = $request->paramInt('id');

        if (!Debt::softDelete($id, $request->userId())) {
            throw ApiException::notFound('Debt not found.');
        }

        return Response::ok(['id' => $id, 'deleted' => true]);
    }

    /**
     * Settle in one tap: records a payment for whatever is still owed.
     */
    public function settle(Request $request): Response
    {
        $userId = $request->userId();
        $debt = $this->find($request);

        if ($debt['status'] !== 'settled') {
            $balance = (float) $debt['balance'];

            if ($balance > 0) {
                Payment::create($userId, [
                    'debt_id' => (int) $debt['id'],
                    'amount' => number_format($balance, 2, '.', ''),
                    'method' => (string) ($request->input('method') ?? 'cash'),
                    'paid_at' => date('Y-m-d H:i:s'),
                    'note' => 'Marked as settled',
                ]);
            }

            Debt::update((int) $debt['id'], $userId, [
                'status' => 'settled',
                'settled_at' => date('Y-m-d H:i:s'),
            ]);
        }

        /** @var array<string,mixed> $fresh */
        $fresh = Debt::find((int) $debt['id'], $userId);
        $fresh['payments'] = Payment::forDebt((int) $debt['id'], $userId);

        return Response::ok($fresh);
    }

    /**
     * Re-open a settled debt. Recorded payments are kept - silently deleting
     * money history is worse than an extra payment row.
     */
    public function reopen(Request $request): Response
    {
        $userId = $request->userId();
        $debt = $this->find($request);

        $paid = Payment::sumForDebt((int) $debt['id'], $userId);

        Debt::update((int) $debt['id'], $userId, [
            'status' => $paid > 0 ? 'partial' : 'pending',
            'settled_at' => null,
        ]);

        /** @var array<string,mixed> $fresh */
        $fresh = Debt::find((int) $debt['id'], $userId);
        $fresh['payments'] = Payment::forDebt((int) $debt['id'], $userId);

        return Response::ok($fresh);
    }

    /**
     * @return array<string,mixed>
     */
    private function find(Request $request): array
    {
        $debt = Debt::find($request->paramInt('id'), $request->userId());
        if ($debt === null) {
            throw ApiException::notFound('Debt not found.');
        }

        return $debt;
    }
}

