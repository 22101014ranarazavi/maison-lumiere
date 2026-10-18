<?php

declare(strict_types=1);

use App\Controllers\AdminController;
use App\Controllers\AdminOrderController;
use App\Controllers\AdminProductController;
use App\Controllers\CategoryController;
use App\Controllers\ChatController;
use App\Controllers\ContactController;
use App\Controllers\NewsletterController;
use App\Controllers\OrderController;
use App\Controllers\ProductController;
use App\Http;
use App\Response;

require dirname(__DIR__) . '/src/bootstrap.php';

Http::cors();

$routes = [
    ['GET',  '#^/api/products$#',                       [ProductController::class, 'index']],
    ['GET',  '#^/api/products/(\d+)$#',                 [ProductController::class, 'show']],
    ['GET',  '#^/api/products/(\d+)/guide$#',           [ProductController::class, 'guide']],
    ['GET',  '#^/api/categories$#',                     [CategoryController::class, 'index']],
    ['GET',  '#^/api/orders/([A-Za-z0-9-]+)$#',         [OrderController::class, 'show']],
    ['POST', '#^/api/orders$#',                         [OrderController::class, 'store']],
    ['POST', '#^/api/contact$#',                        [ContactController::class, 'store']],
    ['POST', '#^/api/newsletter$#',                     [NewsletterController::class, 'store']],
    ['POST', '#^/api/chat$#',                           [ChatController::class, 'store']],

    // --- admin -----------------------------------------------------------
    ['POST',   '#^/api/admin/login$#',                  [AdminController::class, 'login']],
    ['GET',    '#^/api/admin/summary$#',                [AdminController::class, 'summary']],
    ['GET',    '#^/api/admin/messages$#',               [AdminController::class, 'messages']],
    ['PATCH',  '#^/api/admin/messages/(\d+)$#',         [AdminController::class, 'updateMessage']],
    ['GET',    '#^/api/admin/subscribers$#',            [AdminController::class, 'subscribers']],
    ['GET',    '#^/api/admin/orders$#',                 [AdminOrderController::class, 'index']],
    ['GET',    '#^/api/admin/orders/(\d+)$#',           [AdminOrderController::class, 'show']],
    ['PATCH',  '#^/api/admin/orders/(\d+)$#',           [AdminOrderController::class, 'update']],
    ['GET',    '#^/api/admin/products$#',               [AdminProductController::class, 'index']],
    ['POST',   '#^/api/admin/products$#',               [AdminProductController::class, 'store']],
    ['GET',    '#^/api/admin/products/(\d+)$#',         [AdminProductController::class, 'show']],
    ['PATCH',  '#^/api/admin/products/(\d+)$#',         [AdminProductController::class, 'update']],
    ['DELETE', '#^/api/admin/products/(\d+)$#',         [AdminProductController::class, 'destroy']],
];

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    $path = rtrim($path, '/') ?: '/';

    // Normalise the mount point so the API also works when served from a
    // subdirectory (e.g. http://localhost/backend/public/api/products).
    $apiPos = strpos($path, '/api');
    if ($apiPos !== false) {
        $path = substr($path, $apiPos);
    }

    foreach ($routes as [$verb, $pattern, $handler]) {
        if ($verb === $method && preg_match($pattern, $path, $matches)) {
            array_shift($matches);
            [$class, $action] = $handler;
            (new $class())->$action(...$matches);
            exit;
        }
    }

    foreach ($routes as [, $pattern]) {
        if (preg_match($pattern, $path)) {
            Response::error('Method ' . $method . ' is not allowed for this endpoint.', 405);
        }
    }

    Response::error('Endpoint not found.', 404);
} catch (\Throwable $e) {
    error_log('Unhandled API error: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    Response::error('An unexpected server error occurred.', 500);
}
