<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http;
use App\Response;
use App\Support\FragranceGuide;
use App\Support\ProductPresenter;

final class ProductController
{
    private const SELECT = "SELECT p.*, c.slug AS category_slug, c.name AS category_name,
                    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
             FROM products p
             JOIN categories c ON c.id = p.category_id";

    /** GET /api/products — list with filtering, search, sorting and paging. */
    public function index(): void
    {
        $pdo = Database::connection();

        $where = [];
        $params = [];

        $family = Http::queryString('family');
        if ($family !== '' && $family !== 'all') {
            $where[] = 'c.slug = :family';
            $params['family'] = $family;
        }

        $gender = Http::queryString('gender');
        if (in_array($gender, ['women', 'men', 'unisex'], true)) {
            $where[] = 'p.gender = :gender';
            $params['gender'] = $gender;
        }

        $search = Http::queryString('search');
        if (mb_strlen($search) >= 2) {
            // Native prepares require one placeholder per occurrence.
            $searchColumns = ['p.name', 'p.house', 'p.top_notes', 'p.heart_notes', 'p.base_notes', 'p.description'];
            $searchClauses = [];

            foreach ($searchColumns as $index => $column) {
                $key = 'q' . $index;
                $searchClauses[] = "{$column} LIKE :{$key}";
                $params[$key] = '%' . $search . '%';
            }

            $where[] = '(' . implode(' OR ', $searchClauses) . ')';
        }

        if (Http::queryString('featured') === '1') {
            $where[] = 'p.featured = 1';
        }

        if (Http::queryString('in_stock') === '1') {
            $where[] = 'p.stock > 0';
        }

        $sorts = [
            'latest'     => 'p.created_at DESC, p.id DESC',
            'price_asc'  => 'p.price ASC',
            'price_desc' => 'p.price DESC',
            'rating'     => 'p.rating DESC',
            'name'       => 'p.name ASC',
        ];
        $orderBy = $sorts[Http::queryString('sort', 'latest')] ?? $sorts['latest'];

        $limit = Http::queryInt('limit', 12, 1, 60);
        $offset = Http::queryInt('offset', 0, 0, 100000);

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) AS total FROM products p
             JOIN categories c ON c.id = p.category_id {$whereSql}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['total'];

        $stmt = $pdo->prepare(self::SELECT . " {$whereSql} ORDER BY {$orderBy} LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute($params);

        Response::success([
            'data' => ProductPresenter::many($stmt->fetchAll()),
            'meta' => [
                'total'  => $total,
                'limit'  => $limit,
                'offset' => $offset,
            ],
        ]);
    }

    /** GET /api/products/{id} — single product with reviews and related items. */
    public function show(string $id): void
    {
        $pdo = Database::connection();
        $row = $this->find((int) $id);

        if ($row === null) {
            Response::error('Product not found.', 404);
        }

        $reviewsStmt = $pdo->prepare(
            'SELECT author, rating, comment, created_at
             FROM reviews WHERE product_id = :id
             ORDER BY created_at DESC, id DESC LIMIT 20'
        );
        $reviewsStmt->execute(['id' => (int) $id]);

        $relatedStmt = $pdo->prepare(
            self::SELECT . ' WHERE p.category_id = :category AND p.id != :id
             ORDER BY p.featured DESC, p.rating DESC LIMIT 4'
        );
        $relatedStmt->execute(['category' => (int) $row['category_id'], 'id' => (int) $id]);

        $product = ProductPresenter::one($row);
        $product['reviews'] = $reviewsStmt->fetchAll();
        $product['related'] = ProductPresenter::many($relatedStmt->fetchAll());

        Response::success(['data' => $product]);
    }

    /** GET /api/products/{id}/guide — long-form explainer for one fragrance. */
    public function guide(string $id): void
    {
        $row = $this->find((int) $id);

        if ($row === null) {
            Response::error('Product not found.', 404);
        }

        Response::success(['data' => FragranceGuide::build($row)]);
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE p.id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }
}
