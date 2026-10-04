<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Database;
use App\Core\Env;
use App\Core\Request;
use App\Core\Response;

final class HealthController
{
    public function index(Request $request): Response
    {
        $database = ['connected' => false, 'error' => null];

        try {
            Database::connection()->query('SELECT 1');
            $database['connected'] = true;
        } catch (\Throwable $e) {
            $database['error'] = $e->getMessage();
        }

        return Response::ok([
            'app' => 'Hiram Debt Tracker API',
            'version' => '1.0.0',
            'php' => PHP_VERSION,
            'database' => $database,
            'time' => date('c'),
        ]);
    }
}
