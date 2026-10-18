<?php

declare(strict_types=1);

namespace App;

final class Http
{
    /** Send CORS headers for the React dev server; answer preflight requests. */
    public static function cors(): void
    {
        $config = require dirname(__DIR__) . '/config.php';

        header('Access-Control-Allow-Origin: ' . $config['cors_origin']);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token');
        header('Access-Control-Max-Age: 86400');
        header('Cache-Control: no-store');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    /** Decode the JSON request body as an array. */
    public static function body(): array
    {
        $raw = file_get_contents('php://input');

        if ($raw === false || trim($raw) === '') {
            return [];
        }

        $data = json_decode($raw, true);

        if (!is_array($data)) {
            Response::error('Invalid JSON body.', 400);
        }

        return $data;
    }

    public static function queryString(string $key, string $default = ''): string
    {
        $value = $_GET[$key] ?? $default;

        return is_string($value) ? trim($value) : $default;
    }

    public static function queryInt(string $key, int $default, int $min, int $max): int
    {
        $value = $_GET[$key] ?? null;

        if ($value === null || !is_numeric($value)) {
            return $default;
        }

        return max($min, min($max, (int) $value));
    }
}
