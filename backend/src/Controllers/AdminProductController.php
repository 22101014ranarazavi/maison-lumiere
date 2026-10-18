<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http;
use App\Response;
use App\Support\ProductPresenter;
use App\Validator;
use PDO;

/** Product CRUD for the admin area (includes the guide/editorial fields). */
final class AdminProductController
{
    private const SELECT = "SELECT p.*, c.slug AS category_slug, c.name AS category_name,
                    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
             FROM products p
             JOIN categories c ON c.id = p.category_id";

    /** GET /api/admin/products?search=&family=&stock=&sort= */
    public function index(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $where = [];
        $params = [];

        $search = Http::queryString('search');
        if (mb_strlen($search) >= 2) {
            $where[] = '(p.name LIKE :q0 OR p.sku LIKE :q1 OR p.description LIKE :q2)';
            $params['q0'] = '%' . $search . '%';
            $params['q1'] = '%' . $search . '%';
            $params['q2'] = '%' . $search . '%';
        }

        $family = Http::queryString('family');
        if ($family !== '' && $family !== 'all') {
            $where[] = 'c.slug = :family';
            $params['family'] = $family;
        }

        $stock = Http::queryString('stock');
        if ($stock === 'low') {
            $where[] = 'p.stock > 0 AND p.stock <= 5';
        } elseif ($stock === 'out') {
            $where[] = 'p.stock = 0';
        } elseif ($stock === 'in') {
            $where[] = 'p.stock > 5';
        }

        $sorts = [
            'newest'     => 'p.created_at DESC, p.id DESC',
            'name'       => 'p.name ASC',
            'price_desc' => 'p.price DESC',
            'price_asc'  => 'p.price ASC',
            'stock_asc'  => 'p.stock ASC, p.name ASC',
            'rating'     => 'p.rating DESC',
        ];
        $orderBy = $sorts[Http::queryString('sort', 'newest')] ?? $sorts['newest'];

        $limit = Http::queryInt('limit', 24, 1, 100);
        $offset = Http::queryInt('offset', 0, 0, 100000);
        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);

        $countStmt = $pdo->prepare(
            "SELECT COUNT(*) c FROM products p JOIN categories c ON c.id = p.category_id {$whereSql}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['c'];

        $stmt = $pdo->prepare(self::SELECT . " {$whereSql} ORDER BY {$orderBy} LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute($params);

        Response::success([
            'data' => array_map([self::class, 'shape'], $stmt->fetchAll()),
            'meta' => ['total' => $total, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    /** GET /api/admin/products/{id} */
    public function show(string $id): void
    {
        Auth::verify();
        $row = $this->find((int) $id);

        if ($row === null) {
            Response::error('Product not found.', 404);
        }

        Response::success(['data' => self::shape($row)]);
    }

    /** POST /api/admin/products */
    public function store(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $v = $this->validatePayload();
        $v->check();

        $sku = $this->resolveSku($v);

        if ($this->skuTaken($sku)) {
            Response::error('Please fix the highlighted fields.', 422, ['sku' => 'That SKU is already in use.']);
        }

        $stmt = $pdo->prepare($this->writeSql('INSERT'));
        $stmt->execute($this->params($v) + ['sku' => $sku]);

        $row = $this->find((int) $pdo->lastInsertId());

        if ($row === null) {
            Response::error('Product could not be saved.', 500);
        }

        Response::success(['data' => self::shape($row)], 201);
    }

    /** PATCH /api/admin/products/{id} */
    public function update(string $id): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $existing = $this->find((int) $id);

        if ($existing === null) {
            Response::error('Product not found.', 404);
        }

        $v = $this->validatePayload();
        $v->check();

        $sku = $this->resolveSku($v, $existing['sku']);

        if ($this->skuTaken($sku, (int) $id)) {
            Response::error('Please fix the highlighted fields.', 422, ['sku' => 'That SKU is already in use.']);
        }

        $stmt = $pdo->prepare($this->writeSql('UPDATE'));
        $stmt->execute($this->params($v) + ['sku' => $sku, 'id' => (int) $id]);

        $row = $this->find((int) $id);

        if ($row === null) {
            Response::error('Product could not be saved.', 500);
        }

        Response::success(['data' => self::shape($row)]);
    }

    /** DELETE /api/admin/products/{id} */
    public function destroy(string $id): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $row = $this->find((int) $id);

        if ($row === null) {
            Response::error('Product not found.', 404);
        }

        $stmt = $pdo->prepare('DELETE FROM products WHERE id = :id');
        $stmt->execute(['id' => (int) $id]);

        Response::success([
            'data' => [
                'id'      => (int) $id,
                'message' => "“{$row['name']}” was deleted.",
            ],
        ]);
    }

    /** Shared validation for create and update. */
    private function validatePayload(): Validator
    {
        $v = new Validator(Http::body());

        $v->text('name', 'Name', 2, 120)
            ->optionalText('sku', 'SKU', 30)
            ->optionalText('house', 'House', 80)
            ->text('description', 'Description', 10, 4000)
            ->integer('category_id', 'Category', 1, 1000000)
            ->oneOf('gender', 'Gender', ['women', 'men', 'unisex'])
            ->integer('size_ml', 'Size', 10, 500)
            ->number('price', 'Price', 0, 100000)
            ->optionalNumber('compare_at_price', 'Compare-at price', 0, 100000)
            ->integer('stock', 'Stock', 0, 1000000)
            ->optionalText('top_notes', 'Top notes', 255)
            ->optionalText('heart_notes', 'Heart notes', 255)
            ->optionalText('base_notes', 'Base notes', 255)
            ->optionalText('color_a', 'Colour A', 7)
            ->optionalText('color_b', 'Colour B', 7)
            ->oneOf('shape', 'Bottle shape', ['tall', 'square', 'round', 'faceted'])
            ->boolean('featured', 'Featured')
            ->number('rating', 'Rating', 0, 5)
            ->optionalText('tagline', 'Tagline', 255)
            ->optionalText('story', 'Story', 8000)
            ->optionalText('craft_notes', 'Craft notes', 4000)
            ->optionalText('longevity', 'Longevity', 60)
            ->optionalText('sillage', 'Sillage', 60)
            ->optionalText('best_season', 'Best season', 60)
            ->optionalText('occasion', 'Occasion', 140);

        foreach (['color_a', 'color_b'] as $field) {
            if (!$v->fails($field) && $v->get($field) !== null
                && !preg_match('/^#[0-9a-fA-F]{6}$/', (string) $v->get($field))) {
                $v->reject($field, 'Use a hex colour such as #b08d57.');
            }
        }

        if (!$v->fails('compare_at_price') && !$v->fails('price')) {
            $compare = $v->get('compare_at_price');

            if ($compare !== null && (float) $compare <= (float) $v->get('price')) {
                $v->reject('compare_at_price', 'The compare-at price must be higher than the selling price.');
            }
        }

        if (!$v->fails('category_id')) {
            $stmt = Database::connection()->prepare('SELECT id FROM categories WHERE id = :id');
            $stmt->execute(['id' => $v->get('category_id')]);

            if ($stmt->fetch() === false) {
                $v->reject('category_id', 'That category does not exist.');
            }
        }

        return $v;
    }

    /** Blank SKU fields get a generated LM-### code. */
    private function resolveSku(Validator $v, ?string $current = null): string
    {
        $sku = trim((string) $v->get('sku'));

        if ($sku !== '') {
            return $sku;
        }

        if ($current !== null && $current !== '') {
            return $current;
        }

        $pdo = Database::connection();
        $candidate = (int) $pdo->query('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM products')->fetch()['next'];

        do {
            $sku = sprintf('LM-%03d', $candidate);
            $candidate++;
        } while ($this->skuTaken($sku));

        return $sku;
    }

    private function skuTaken(string $sku, int $exceptId = 0): bool
    {
        $stmt = Database::connection()->prepare('SELECT id FROM products WHERE sku = :sku AND id != :id');
        $stmt->execute(['sku' => $sku, 'id' => $exceptId]);

        return $stmt->fetch() !== false;
    }

    /** Column list shared by INSERT and UPDATE statements. */
    private function writeSql(string $verb): string
    {
        $columns = [
            'sku', 'name', 'house', 'description', 'category_id', 'gender', 'size_ml', 'price',
            'compare_at_price', 'stock', 'top_notes', 'heart_notes', 'base_notes', 'color_a',
            'color_b', 'shape', 'featured', 'rating', 'tagline', 'story', 'craft_notes',
            'longevity', 'sillage', 'best_season', 'occasion',
        ];

        if ($verb === 'INSERT') {
            $names = implode(', ', $columns);
            $placeholders = implode(', ', array_map(
                static fn (string $column): string => ':' . $column,
                $columns
            ));

            return "INSERT INTO products ({$names}) VALUES ({$placeholders})";
        }

        $pairs = implode(', ', array_map(
            static fn (string $column): string => "{$column} = :{$column}",
            $columns
        ));

        return "UPDATE products SET {$pairs} WHERE id = :id";
    }

    private function params(Validator $v): array
    {
        return [
            'name'             => $v->get('name'),
            'house'            => $v->get('house') ?: 'Maison Lumière',
            'description'      => $v->get('description'),
            'category_id'      => $v->get('category_id'),
            'gender'           => $v->get('gender'),
            'size_ml'          => $v->get('size_ml'),
            'price'            => number_format((float) $v->get('price'), 2, '.', ''),
            'compare_at_price' => $v->get('compare_at_price') !== null
                ? number_format((float) $v->get('compare_at_price'), 2, '.', '')
                : null,
            'stock'            => $v->get('stock'),
            'top_notes'        => $v->get('top_notes') ?? '',
            'heart_notes'      => $v->get('heart_notes') ?? '',
            'base_notes'       => $v->get('base_notes') ?? '',
            'color_a'          => $v->get('color_a') ?: '#e3d2b8',
            'color_b'          => $v->get('color_b') ?: '#8a6f4d',
            'shape'            => $v->get('shape'),
            'featured'         => $v->get('featured'),
            'rating'           => number_format((float) $v->get('rating'), 1, '.', ''),
            'tagline'          => $v->get('tagline'),
            'story'            => $v->get('story'),
            'craft_notes'      => $v->get('craft_notes'),
            'longevity'        => $v->get('longevity'),
            'sillage'          => $v->get('sillage'),
            'best_season'      => $v->get('best_season'),
            'occasion'         => $v->get('occasion'),
        ];
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(self::SELECT . ' WHERE p.id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    private static function shape(array $row): array
    {
        $product = ProductPresenter::one($row);

        // The editor needs the raw foreign key, which the storefront shape omits.
        $product['category_id'] = (int) $row['category_id'];

        $product['guide'] = [
            'tagline'     => $row['tagline'],
            'story'       => $row['story'],
            'craft_notes' => $row['craft_notes'],
            'longevity'   => $row['longevity'],
            'sillage'     => $row['sillage'],
            'best_season' => $row['best_season'],
            'occasion'    => $row['occasion'],
        ];

        return $product;
    }
}
