<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Response;

final class CategoryController
{
    /** GET /api/categories — fragrance families with product counts. */
    public function index(): void
    {
        $stmt = Database::connection()->query(
            'SELECT c.id, c.slug, c.name, c.description, c.accent,
                    (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
             FROM categories c
             ORDER BY c.sort_order ASC, c.name ASC'
        );

        Response::success(['data' => $stmt->fetchAll()]);
    }
}
