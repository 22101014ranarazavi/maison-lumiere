<?php

/**
 * Router script for PHP's built-in web server:
 *
 *   cd backend && php -S 127.0.0.1:8000 router.php
 *
 * Everything under /api/ is handled by the API front controller;
 * anything else gets a JSON 404 (the React app is served by Vite).
 */

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if (preg_match('#^/api(?:/|$)#', $path)) {
    require __DIR__ . '/public/index.php';
    return true;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'success' => false,
    'message' => 'Not found. The API lives under /api/.',
]);

return true;
