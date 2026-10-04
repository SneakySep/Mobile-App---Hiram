<?php

declare(strict_types=1);

/**
 * One-shot installer: creates the database + tables and seeds a demo account.
 *
 *   cd Backend
 *   E:\Xampp\Files\php\php.exe database\install.php
 *   E:\Xampp\Files\php\php.exe database\install.php --fresh   (drops DB first)
 *   E:\Xampp\Files\php\php.exe database\install.php --noseed
 */

use App\Config\Database;
use App\Core\Env;
use App\Models\User;

$basePath = dirname(__DIR__);

require $basePath . '/app/autoload.php';

Env::load($basePath . '/.env');
if (!is_file($basePath . '/.env')) {
    Env::load($basePath . '/.env.example');
}

date_default_timezone_set('Asia/Manila');

$argv = $_SERVER['argv'] ?? [];
$fresh = in_array('--fresh', $argv, true);
$seed = !in_array('--noseed', $argv, true);

$dbName = Env::get('DB_NAME', 'hiram_db') ?? 'hiram_db';

echo "== Hiram installer ==\n";
echo 'PHP ' . PHP_VERSION . ' | database: ' . $dbName . "\n\n";

$server = Database::serverConnection();

if ($fresh) {
    $server->exec("DROP DATABASE IF EXISTS `{$dbName}`");
    echo "[ok] dropped existing database\n";
}

// schema.sql already issues CREATE DATABASE / USE, so just run it statement by statement.
$schema = (string) file_get_contents(__DIR__ . '/schema.sql');

// Drop "--" comment lines first so they never glue themselves onto a statement.
$sql = preg_replace('/^\s*--.*$/m', '', $schema) ?? $schema;

$statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r\n|\n)/', $sql) ?: []));

$applied = 0;
foreach ($statements as $statement) {
    if ($statement === '') {
        continue;
    }

    $server->exec($statement);
    $applied++;
}

echo "[ok] schema applied ({$applied} statements)\n";

$pdo = Database::connection();
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
sort($tables);
echo '[ok] tables: ' . implode(', ', $tables) . "\n";

if (!$seed) {
    echo "\nDone. Seeding skipped.\n";
    exit(0);
}

$demoEmail = 'demo@hiram.app';
$demoPassword = 'password123';

if (User::findByEmail($demoEmail) === null) {
    $userId = User::create('Hiram', $demoEmail, $demoPassword, 'PHP');
    echo "[ok] created demo user {$demoEmail} / {$demoPassword} (id {$userId})\n";
} else {
    $userId = (int) User::findByEmail($demoEmail)['id'];
    echo "[--] demo user already exists (id {$userId})\n";
}

// A little sample data so the app has something to show on first launch.
$existing = (int) $pdo->query("SELECT COUNT(*) FROM debtors WHERE user_id = {$userId}")->fetchColumn();

if ($existing === 0) {
    $pdo->beginTransaction();

    $debtors = [
        ['Marco Reyes', '0917 555 1234', 'Sari-sari store, monthly load'],
        ['Jing Dela Cruz', '0928 444 7781', ''],
        ['Arnel Bautista', '', 'Tricycle fare pooling'],
        ['Sheila Ocampo', '0995 121 3345', 'Utang sa groceries'],
    ];

    $insertDebtor = $pdo->prepare('INSERT INTO debtors (user_id, name, phone, note) VALUES (?, ?, ?, ?)');
    $debtorIds = [];

    foreach ($debtors as $debtor) {
        $insertDebtor->execute([$userId, $debtor[0], $debtor[1] !== '' ? $debtor[1] : null, $debtor[2] !== '' ? $debtor[2] : null]);
        $debtorIds[] = (int) $pdo->lastInsertId();
    }

    $insertDebt = $pdo->prepare(
        'INSERT INTO debts (user_id, debtor_id, amount, due_date, note, status, settled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $insertPayment = $pdo->prepare(
        'INSERT INTO payments (user_id, debt_id, amount, method, paid_at, note) VALUES (?, ?, ?, ?, ?, ?)'
    );

    $today = time();
    $day = 86400;

    $debts = [
        // debtor index, amount, due offset days, note, status, settled?, payments[]
        [0, '4500.00', -6, 'Sulong sa tindahan', 'partial', false, [['1500.00', 'gcash', -9]]],
        [0, '1200.00', 4, 'Load + load', 'pending', false, []],
        [1, '8000.00', -14, 'Baon sa birthday', 'partial', false, [['3000.00', 'cash', -20], ['1000.00', 'maya', -5]]],
        [2, '750.00', 2, 'Pamana sa trike', 'pending', false, []],
        [3, '2300.00', -30, 'Groceries', 'settled', true, [['2300.00', 'cash', -12]]],
        [3, '600.00', 9, 'Extra bigas', 'pending', false, []],
        [1, '1500.00', -2, 'Print + binding', 'pending', false, []],
    ];

    foreach ($debts as $debt) {
        [$debtorIndex, $amount, $dueOffset, $note, $status, $settled, $payments] = $debt;

        $dueDate = date('Y-m-d', $today + ($dueOffset * $day));
        $settledAt = $settled ? date('Y-m-d H:i:s', $today - (3 * $day)) : null;

        $insertDebt->execute([
            $userId,
            $debtorIds[$debtorIndex],
            $amount,
            $dueDate,
            $note,
            $status,
            $settledAt,
        ]);

        $debtId = (int) $pdo->lastInsertId();

        foreach ($payments as $payment) {
            [$paid, $method, $paidOffset] = $payment;
            $insertPayment->execute([
                $userId,
                $debtId,
                $paid,
                $method,
                date('Y-m-d H:i:s', $today + ($paidOffset * $day)),
                null,
            ]);
        }
    }

    $pdo->commit();
    echo '[ok] seeded ' . count($debtorIds) . " debtors, " . count($debts) . " debts\n";
} else {
    echo "[--] data already present, skipping sample debts\n";
}

echo "\nDone.\n";
echo "API base URL: http://localhost/MA%20Hiram/Backend/public\n";
echo "Sign in with {$demoEmail} / {$demoPassword}\n";
