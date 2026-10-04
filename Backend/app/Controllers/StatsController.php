<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\DebtService;

final class StatsController
{
    public function __construct(private readonly DebtService $service = new DebtService())
    {
    }

    /**
     * GET /api/stats/summary - the numbers shown at the top of the dashboard.
     */
    public function summary(Request $request): Response
    {
        $userId = $request->userId();

        return Response::ok($this->service->summary($userId) + [
            'recentCollections' => $this->service->collectionsByDay($userId, 14),
        ]);
    }
}
