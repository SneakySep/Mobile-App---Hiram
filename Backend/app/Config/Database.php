<?php

declare(strict_types=1);

namespace App\Config;

use App\Core\Env;
use PDO;
use RuntimeException;

/**
 * Lazily created shared PDO connection.
 */
final class Database
{
    private static ?PDO $pdo = null;

    public static function connection(): PDO
    {
        if (self::$pdo instanceof PDO) {
            return self::$pdo;
        }

        $host = Env::get('DB_HOST', '127.0.0.1') ?? '127.0.0.1';
        $port = Env::get('DB_PORT', '3306') ?? '3306';
        $name = Env::get('DB_NAME', 'hiram_db') ?? 'hiram_db';
        $user = Env::get('DB_USER', 'root') ?? 'root';
        $pass = Env::get('DB_PASS', '') ?? '';

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

        try {
            self::$pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (\PDOException $e) {
            throw new RuntimeException(
                'Unable to connect to the database. Check Backend/.env and that MySQL is running. ' .
                $e->getMessage()
            );
        }

        return self::$pdo;
    }

    /**
     * Connect without selecting a database - used by the installer.
     */
    public static function serverConnection(): PDO
    {
        $host = Env::get('DB_HOST', '127.0.0.1') ?? '127.0.0.1';
        $port = Env::get('DB_PORT', '3306') ?? '3306';
        $user = Env::get('DB_USER', 'root') ?? 'root';
        $pass = Env::get('DB_PASS', '') ?? '';

        return new PDO(
            sprintf('mysql:host=%s;port=%s;charset=utf8mb4', $host, $port),
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }
}
