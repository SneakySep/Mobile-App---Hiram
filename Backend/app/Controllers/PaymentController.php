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

final class PaymentController
{
    public function __construct(private readonly DebtService $service = new DebtService())
    {
    }

    /**
     * GET /api/debts/{id}/payments
     */
    public function index(Request $request): Response
    {
        $debtId = $request->paramInt('id');

        if (Debt::find($debtId, $request->userId()) === null) {
            throw ApiException::notFound('Debt not found.');
        }

        return Response::ok(Payment::forDebt($debtId, $request->userId()));
    }

    /**
     * POST /api/debts/{id}/payments
     */
    public function store(Request $request): Response
    {
        $userId = $request->userId();
        $debtId = $request->paramInt('id');

        $data = (new Validator($request->body))
            ->amount('amount')
            ->oneOf('method', Payment::METHODS, false, 'cash')
            ->dateTime('paidAt')
            ->string('note', 0, 300, false)
            ->validate();

        $this->service->assertPaymentFits($debtId, $userId, (string) $data['amount']);

        $id = Payment::create($userId, [
            'debt_id' => $debtId,
            'amount' => $data['amount'],
            'method' => $data['method'] ?? 'cash',
            'paid_at' => $data['paidAt'] ?? date('Y-m-d H:i:s'),
            'note' => $data['note'],
        ]);

        Debt::refreshStatus($debtId, $userId);

        /** @var array<string,mixed> $payment */
        $payment = Payment::find($id, $userId);

        return Response::created([
            'payment' => $payment,
            'debt' => Debt::find($debtId, $userId),
        ]);
    }

    /**
     * DELETE /api/payments/{id} - undo a payment (e.g. mistyped amount).
     */
    public function destroy(Request $request): Response
    {
        $userId = $request->userId();
        $id = $request->paramInt('id');

        $payment = Payment::find($id, $userId);
        if ($payment === null) {
            throw ApiException::notFound('Payment not found.');
        }

        if (!Payment::softDelete($id, $userId)) {
            throw ApiException::notFound('Payment not found.');
        }

        $debtId = (int) $payment['debtId'];
        Debt::refreshStatus($debtId, $userId);

        return Response::ok([
            'id' => $id,
            'deleted' => true,
            'debt' => Debt::find($debtId, $userId),
        ]);
    }
}
