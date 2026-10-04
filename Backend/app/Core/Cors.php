<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Adds permissive CORS headers. Expo on a real device is a different origin
 * than the XAMPP host, and the dev server proxy does not always preserve it.
 */
final class Cors
{
    public static function apply(): void
    {
        $allowed = Env::get('CORS_ORIGIN', '*') ?? '*';

        if ($allowed === '*') {
            header('Access-Control-Allow-Origin: *');
        } else {
            $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
            $allowedList = array_map('trim', explode(',', $allowed));

            if ($origin !== '' && in_array($origin, $allowedList, true)) {
                header('Access-Control-Allow-Origin: ' . $origin);
            } elseif ($allowedList !== []) {
                header('Access-Control-Allow-Origin: ' . $allowedList[0]);
            }
        }

        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Api-Token');
        header('Access-Control-Max-Age: 86400');

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
