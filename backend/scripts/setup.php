<?php

declare(strict_types=1);

/**
 * Database bootstrap for the Maison Lumière shop.
 *
 *   php scripts/setup.php            create the database, tables and demo data
 *   php scripts/setup.php --fresh    drop every table first (destructive)
 *
 * Connection details come from backend/.env (see .env.example) or environment
 * variables, falling back to root@127.0.0.1 with an empty password.
 */

$config = require dirname(__DIR__) . '/config.php';
$db = $config['db'];

$fresh = in_array('--fresh', $argv ?? [], true);

$dsn = sprintf('mysql:host=%s;port=%s;charset=%s', $db['host'], $db['port'], $db['charset']);

echo "Maison Lumière — database setup\n";
echo "  server   : {$db['host']}:{$db['port']}\n";
echo "  database : {$db['name']}\n";
echo "  user     : {$db['user']}\n";
echo "  mode     : " . ($fresh ? 'fresh (all tables dropped)' : 'create if missing') . "\n\n";

try {
    $pdo = new PDO($dsn, $db['user'], $db['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, "Cannot connect to MySQL: {$e->getMessage()}\n");
    fwrite(STDERR, "Is the MySQL server running? Check backend/README notes and backend/.env\n");
    exit(1);
}

$pdo->exec(
    "CREATE DATABASE IF NOT EXISTS `{$db['name']}`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
);
$pdo->exec("USE `{$db['name']}`");
$pdo->exec('SET NAMES utf8mb4');

if ($fresh) {
    echo "Dropping existing tables...\n";
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
    foreach (['order_items', 'orders', 'reviews', 'products', 'categories', 'contacts', 'newsletter_subscribers'] as $table) {
        $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}

runSqlFile($pdo, __DIR__ . '/../database/schema.sql');
echo "Schema ready.\n";

$productCount = (int) $pdo->query('SELECT COUNT(*) AS c FROM products')->fetch()['c'];

if ($productCount === 0 || $fresh) {
    runSqlFile($pdo, __DIR__ . '/../database/seed.sql');
    echo "Demo catalogue seeded.\n";
} else {
    echo "Catalogue already contains {$productCount} products — skipping seed (use --fresh to reset).\n";
}

$stats = [
    'categories' => (int) $pdo->query('SELECT COUNT(*) AS c FROM categories')->fetch()['c'],
    'products'   => (int) $pdo->query('SELECT COUNT(*) AS c FROM products')->fetch()['c'],
    'reviews'    => (int) $pdo->query('SELECT COUNT(*) AS c FROM reviews')->fetch()['c'],
];

echo "\nDone.  ";
foreach ($stats as $label => $count) {
    echo "{$label}: {$count}  ";
}
echo "\n";

/**
 * Execute a .sql file statement by statement (comments and empty lines removed).
 */
function runSqlFile(PDO $pdo, string $path): void
{
    if (!is_file($path)) {
        fwrite(STDERR, "Missing SQL file: {$path}\n");
        exit(1);
    }

    $sql = file_get_contents($path);
    $lines = preg_split('/\R/', $sql) ?: [];

    $lines = array_filter($lines, static function (string $line): bool {
        $trimmed = ltrim($line);
        return $trimmed !== '' && !str_starts_with($trimmed, '--');
    });

    foreach (explode(';', implode("\n", $lines)) as $statement) {
        $statement = trim($statement);
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }
}
