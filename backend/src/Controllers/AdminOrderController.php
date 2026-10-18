<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http;
use App\Response;
use App\Validator;

/** Order tracking for the admin area: list, detail and status updates. */
final class AdminOrderController
{
    /** GET /api/admin/orders?status=&search=&limit=&offset= */
    public function index(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $where = [];
        $params = [];

        $status = Http::queryString('status');
        if (in_array($status, ['pending', 'paid', 'shipped', 'cancelled'], true)) {
            $where[] = 'o.status = :status';
            $params['status'] = $status;
        }

        $search = Http::queryString('search');
        if (mb_strlen($search) >= 2) {
            $where[] = '(o.reference LIKE :q0 OR o.customer_name LIKE :q1 OR o.email LIKE :q2 OR o.city LIKE :q3)';
            foreach (['q0', 'q1', 'q2', 'q3'] as $key) {
                $params[$key] = '%' . $search . '%';
            }
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $limit = Http::queryInt('limit', 20, 1, 100);
        $offset = Http::queryInt('offset', 0, 0, 100000);

        $countStmt = $pdo->prepare("SELECT COUNT(*) c FROM orders o {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['c'];

        $stmt = $pdo->prepare(
            "SELECT o.*,
                    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                    (SELECT GROUP_CONCAT(CONCAT(oi.quantity, 'x ', oi.product_name) SEPARATOR ' + ')
                     FROM order_items oi WHERE oi.order_id = o.id) AS items_preview,
                    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS units
             FROM orders o
             {$whereSql}
             ORDER BY o.created_at DESC, o.id DESC
             LIMIT {$limit} OFFSET {$offset}"
        );
        $stmt->execute($params);

        $statuses = $pdo->query(
            'SELECT status, COUNT(*) AS count FROM orders GROUP BY status'
        )->fetchAll();
        $byStatus = ['pending' => 0, 'paid' => 0, 'shipped' => 0, 'cancelled' => 0];

        foreach ($statuses as $row) {
            $byStatus[(string) $row['status']] = (int) $row['count'];
        }

        Response::success([
            'data' => array_map([self::class, 'shape'], $stmt->fetchAll()),
            'meta' => [
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'by_status' => $byStatus,
            ],
        ]);
    }

    /** GET /api/admin/orders/{id} — full detail with line items. */
    public function show(string $id): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $stmt = $pdo->prepare('SELECT o.* FROM orders o WHERE o.id = :id');
        $stmt->execute(['id' => (int) $id]);
        $row = $stmt->fetch();

        if ($row === false) {
            Response::error('Order not found.', 404);
        }

        $itemsStmt = $pdo->prepare(
            'SELECT id, product_id, product_name, unit_price, quantity, size_ml
             FROM order_items WHERE order_id = :id ORDER BY id ASC'
        );
        $itemsStmt->execute(['id' => (int) $id]);

        $order = self::shape($row);
        $order['items'] = array_map(static fn (array $item): array => [
            'id'           => (int) $item['id'],
            'product_id'   => $item['product_id'] !== null ? (int) $item['product_id'] : null,
            'product_name' => $item['product_name'],
            'unit_price'   => (float) $item['unit_price'],
            'quantity'     => (int) $item['quantity'],
            'size_ml'      => (int) $item['size_ml'],
            'line_total'   => round((float) $item['unit_price'] * (int) $item['quantity'], 2),
        ], $itemsStmt->fetchAll());

        Response::success(['data' => $order]);
    }

    /** PATCH /api/admin/orders/{id} — status, tracking number, admin note. */
    public function update(string $id): void
    {
        Auth::verify();

        $v = new Validator(Http::body());
        $v->oneOf('status', 'Status', ['pending', 'paid', 'shipped', 'cancelled'])
            ->optionalText('tracking_number', 'Tracking number', 60)
            ->optionalText('admin_note', 'Internal note', 4000);
        $v->check();

        $pdo = Database::connection();

        $exists = $pdo->prepare('SELECT id FROM orders WHERE id = :id');
        $exists->execute(['id' => (int) $id]);

        if ($exists->fetch() === false) {
            Response::error('Order not found.', 404);
        }

        $stmt = $pdo->prepare(
            'UPDATE orders SET status = :status, tracking_number = :tracking, admin_note = :note
             WHERE id = :id'
        );
        $stmt->execute([
            'status'   => $v->get('status'),
            'tracking' => $v->get('tracking_number'),
            'note'     => $v->get('admin_note'),
            'id'       => (int) $id,
        ]);

        $fresh = $pdo->prepare('SELECT o.* FROM orders o WHERE o.id = :id');
        $fresh->execute(['id' => (int) $id]);
        $row = $fresh->fetch();

        if ($row === false) {
            Response::error('Order not found.', 404);
        }

        $order = self::shape($row);
        $order['items'] = [];

        $itemsStmt = $pdo->prepare(
            'SELECT id, product_id, product_name, unit_price, quantity, size_ml
             FROM order_items WHERE order_id = :id ORDER BY id ASC'
        );
        $itemsStmt->execute(['id' => (int) $id]);

        foreach ($itemsStmt->fetchAll() as $item) {
            $order['items'][] = [
                'id'           => (int) $item['id'],
                'product_id'   => $item['product_id'] !== null ? (int) $item['product_id'] : null,
                'product_name' => $item['product_name'],
                'unit_price'   => (float) $item['unit_price'],
                'quantity'     => (int) $item['quantity'],
                'size_ml'      => (int) $item['size_ml'],
                'line_total'   => round((float) $item['unit_price'] * (int) $item['quantity'], 2),
            ];
        }

        Response::success(['data' => $order]);
    }

    private static function shape(array $row): array
    {
        return [
            'id'              => (int) $row['id'],
            'reference'       => $row['reference'],
            'customer_name'   => $row['customer_name'],
            'email'           => $row['email'],
            'phone'           => $row['phone'],
            'address'         => $row['address'],
            'city'            => $row['city'],
            'postal_code'     => $row['postal_code'],
            'country'         => $row['country'],
            'notes'           => $row['notes'],
            'subtotal'        => (float) $row['subtotal'],
            'shipping'        => (float) $row['shipping'],
            'total'           => (float) $row['total'],
            'status'          => $row['status'],
            'tracking_number' => $row['tracking_number'],
            'admin_note'      => $row['admin_note'],
            'item_count'      => isset($row['item_count']) ? (int) $row['item_count'] : null,
            'units'           => isset($row['units']) ? (int) $row['units'] : null,
            'items_preview'   => $row['items_preview'] ?? null,
            'created_at'      => $row['created_at'],
            'updated_at'      => $row['updated_at'] ?? null,
        ];
    }
}
