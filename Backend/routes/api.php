<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\DebtController;
use App\Controllers\DebtorController;
use App\Controllers\HealthController;
use App\Controllers\PaymentController;
use App\Controllers\StatsController;
use App\Controllers\SyncController;
use App\Core\Router;

/**
 * Route table. Routes tagged ['auth'] require a valid bearer token.
 * The autoloader is loaded by public/index.php before this file is included.
 */
return static function (Router $router): void {
    $auth = ['auth'];

    $router->get('/api/health', [HealthController::class, 'index']);
    $router->post('/api/health', [HealthController::class, 'index']);

    $router->post('/api/auth/register', [AuthController::class, 'register']);
    $router->post('/api/auth/login', [AuthController::class, 'login']);
    $router->get('/api/auth/me', [AuthController::class, 'me'], $auth);
    $router->post('/api/auth/logout', [AuthController::class, 'logout'], $auth);
    $router->put('/api/auth/profile', [AuthController::class, 'updateProfile'], $auth);

    $router->get('/api/debtors', [DebtorController::class, 'index'], $auth);
    $router->post('/api/debtors', [DebtorController::class, 'store'], $auth);
    $router->get('/api/debtors/:id', [DebtorController::class, 'show'], $auth);
    $router->put('/api/debtors/:id', [DebtorController::class, 'update'], $auth);
    $router->delete('/api/debtors/:id', [DebtorController::class, 'destroy'], $auth);

    $router->get('/api/debts', [DebtController::class, 'index'], $auth);
    $router->post('/api/debts', [DebtController::class, 'store'], $auth);
    $router->get('/api/debts/:id', [DebtController::class, 'show'], $auth);
    $router->put('/api/debts/:id', [DebtController::class, 'update'], $auth);
    $router->delete('/api/debts/:id', [DebtController::class, 'destroy'], $auth);
    $router->post('/api/debts/:id/settle', [DebtController::class, 'settle'], $auth);
    $router->post('/api/debts/:id/reopen', [DebtController::class, 'reopen'], $auth);

    $router->get('/api/debts/:id/payments', [PaymentController::class, 'index'], $auth);
    $router->post('/api/debts/:id/payments', [PaymentController::class, 'store'], $auth);
    $router->delete('/api/payments/:id', [PaymentController::class, 'destroy'], $auth);

    $router->get('/api/stats/summary', [StatsController::class, 'summary'], $auth);
    $router->get('/api/sync', [SyncController::class, 'changes'], $auth);

    // Root of the API - handy when you open it in a browser.
    $router->get('/', [HealthController::class, 'index']);
};
