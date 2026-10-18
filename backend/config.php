<?php

declare(strict_types=1);

/**
 * Application configuration.
 *
 * Values are resolved from real environment variables first, then from a
 * backend/.env file (for local development), then from the defaults below.
 */

$envFile = __DIR__ . '/.env';

if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \t\"'");
        if (getenv($key) === false) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
        }
    }
}

return [
    'db' => [
        'host'    => getenv('DB_HOST') ?: '127.0.0.1',
        'port'    => getenv('DB_PORT') ?: '3306',
        'name'    => getenv('DB_NAME') ?: 'maison_lumiere',
        'user'    => getenv('DB_USER') ?: 'root',
        'pass'    => getenv('DB_PASS') !== false ? getenv('DB_PASS') : '',
        'charset' => 'utf8mb4',
    ],
    'cors_origin' => getenv('CORS_ORIGIN') ?: 'http://localhost:5173',
    'env'         => getenv('APP_ENV') ?: 'development',
    'admin_key'   => getenv('ADMIN_KEY') ?: 'lumiere-admin-2026',
];
