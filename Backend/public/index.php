<?php

declare(strict_types=1);

/**
 * Hiram Debt Tracker - API front controller.
 * All requests are rewritten here by public/.htaccess.
 */

use App\Core\Cors;
use App\Core\Env;
use App\Core\Kernel;

ini_set('display_errors', '0');
error_reporting(E_ALL);
date_default_timezone_set('Asia/Manila');

$basePath = dirname(__DIR__);

require $basePath . '/app/autoload.php';

Env::load($basePath . '/.env');
if (!is_file($basePath . '/.env')) {
    Env::load($basePath . '/.env.example');
}

Cors::apply();

// Opportunistically clean out dead sessions.
try {
    if (random_int(1, 25) === 1) {
        \App\Models\AuthToken::purgeExpired();
    }
} catch (Throwable) {
    // Never let housekeeping break a request.
}

(new Kernel($basePath))->run();
