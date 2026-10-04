<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Models\Debt;
use App\Models\Debtor;

final class DebtorController
{
    public function index(Request $request): Response
    {
        $search = $request->query('q');

        return Response::ok(Debtor::allForUser($request->userId(), $search));
    }

    public function show(Request $request): Response
    {
        $debtor = Debtor::find($request->paramInt('id'), $request->userId());
        if ($debtor === null) {
            throw ApiException::notFound('Debtor not found.');
        }

        return Response::ok($debtor);
    }

    public function store(Request $request): Response
    {
        $data = (new Validator($request->body))
            ->string('name', 2, 80)
            ->string('phone', 0, 30, false)
            ->string('note', 0, 500, false)
            ->validate();

        $id = Debtor::create($request->userId(), $data);

        /** @var array<string,mixed> $debtor */
        $debtor = Debtor::find($id, $request->userId());

        return Response::created($debtor);
    }

    public function update(Request $request): Response
    {
        $id = $request->paramInt('id');
        $userId = $request->userId();

        if (Debtor::find($id, $userId) === null) {
            throw ApiException::notFound('Debtor not found.');
        }

        $data = (new Validator($request->body))
            ->string('name', 2, 80, false)
            ->string('phone', 0, 30, false)
            ->string('note', 0, 500, false)
            ->validate();

        Debtor::update($id, $userId, array_filter($data, static fn ($value): bool => $value !== null));

        /** @var array<string,mixed> $debtor */
        $debtor = Debtor::find($id, $userId);

        return Response::ok($debtor);
    }

    public function destroy(Request $request): Response
    {
        $id = $request->paramInt('id');
        $userId = $request->userId();

        if (Debtor::find($id, $userId) === null) {
            throw ApiException::notFound('Debtor not found.');
        }

        if (!Debtor::softDelete($id, $userId)) {
            throw ApiException::notFound('Debtor not found.');
        }

        // Their open debts disappear with them, otherwise they would linger in
        // the totals with no owner to pay them off.
        $debtsRemoved = Debt::softDeleteForDebtor($id, $userId);

        return Response::ok(['id' => $id, 'deleted' => true, 'debtsRemoved' => $debtsRemoved]);
    }
}
