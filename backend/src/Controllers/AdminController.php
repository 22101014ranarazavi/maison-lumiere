<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Auth;
use App\Database;
use App\Http;
use App\Response;
use App\Validator;

/** Admin session, dashboard summary, inbox and subscriber list. */
final class AdminController
{
    /** POST /api/admin/login — exchange the admin key for a signed token. */
    public function login(): void
    {
        $v = new Validator(Http::body());
        $v->text('key', 'Admin key', 1, 200);
        $v->check();

        if (!Auth::checkKey((string) $v->get('key'))) {
            usleep(250000); // slow brute-force attempts down
            Response::error('That admin key is not correct.', 401);
        }

        Response::success(['data' => Auth::issue()]);
    }

    /** GET /api/admin/summary — numbers for the dashboard. */
    public function summary(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $byStatus = ['pending' => 0, 'paid' => 0, 'shipped' => 0, 'cancelled' => 0];
        $revenue = 0.0;
        $ordersTotal = 0;

        foreach ($pdo->query('SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
                              FROM orders GROUP BY status') as $row) {
            $status = (string) $row['status'];
            $count = (int) $row['count'];
            $byStatus[$status] = $count;
            $ordersTotal += $count;

            if ($status !== 'cancelled') {
                $revenue += (float) $row['revenue'];
            }
        }

        $recent = $pdo->query(
            'SELECT id, reference, customer_name, email, total, status, created_at
             FROM orders ORDER BY created_at DESC, id DESC LIMIT 6'
        )->fetchAll();

        $lowStock = $pdo->query(
            'SELECT id, name, sku, stock, price FROM products
             WHERE stock <= 5 ORDER BY stock ASC, name ASC LIMIT 8'
        )->fetchAll();

        foreach ($lowStock as &$row) {
            $row['stock'] = (int) $row['stock'];
            $row['price'] = (float) $row['price'];
            $row['id'] = (int) $row['id'];
        }
        unset($row);

        $scalar = static fn (string $sql): int => (int) $pdo->query($sql)->fetch()['c'];

        Response::success([
            'data' => [
                'orders' => [
                    'total'  => $ordersTotal,
                    'by_status' => $byStatus,
                    'revenue' => round($revenue, 2),
                ],
                'products' => [
                    'total'      => $scalar('SELECT COUNT(*) c FROM products'),
                    'stock_units' => $scalar('SELECT COALESCE(SUM(stock), 0) c FROM products'),
                    'low_stock'  => $lowStock,
                ],
                'inbox' => [
                    'unread' => $scalar('SELECT COUNT(*) c FROM contacts WHERE handled = 0'),
                    'total'  => $scalar('SELECT COUNT(*) c FROM contacts'),
                ],
                'subscribers' => $scalar('SELECT COUNT(*) c FROM newsletter_subscribers'),
                'reviews'     => $scalar('SELECT COUNT(*) c FROM reviews'),
                'recent_orders' => $recent,
            ],
        ]);
    }

    /** GET /api/admin/messages?handled=&limit=&offset= */
    public function messages(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $where = [];
        $params = [];

        $handled = Http::queryString('handled');
        if (in_array($handled, ['0', '1'], true)) {
            $where[] = 'handled = :handled';
            $params['handled'] = (int) $handled;
        }

        $search = Http::queryString('search');
        if (mb_strlen($search) >= 2) {
            $where[] = '(name LIKE :q0 OR email LIKE :q1 OR subject LIKE :q2 OR message LIKE :q3)';
            foreach (['q0', 'q1', 'q2', 'q3'] as $key) {
                $params[$key] = '%' . $search . '%';
            }
        }

        $whereSql = $where === [] ? '' : 'WHERE ' . implode(' AND ', $where);
        $limit = Http::queryInt('limit', 50, 1, 100);
        $offset = Http::queryInt('offset', 0, 0, 100000);

        $countStmt = $pdo->prepare("SELECT COUNT(*) c FROM contacts {$whereSql}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch()['c'];

        $stmt = $pdo->prepare(
            "SELECT id, name, email, subject, message, handled, created_at
             FROM contacts {$whereSql}
             ORDER BY handled ASC, created_at DESC, id DESC
             LIMIT {$limit} OFFSET {$offset}"
        );
        $stmt->execute($params);

        $rows = array_map(static function (array $row): array {
            $row['id'] = (int) $row['id'];
            $row['handled'] = (bool) $row['handled'];

            return $row;
        }, $stmt->fetchAll());

        $unread = (int) $pdo->query('SELECT COUNT(*) c FROM contacts WHERE handled = 0')->fetch()['c'];

        Response::success([
            'data' => $rows,
            'meta' => ['total' => $total, 'unread' => $unread, 'limit' => $limit, 'offset' => $offset],
        ]);
    }

    /** PATCH /api/admin/messages/{id} — mark handled / unhandled. */
    public function updateMessage(string $id): void
    {
        Auth::verify();

        $v = new Validator(Http::body());
        $v->boolean('handled', 'Handled');
        $v->check();

        $stmt = Database::connection()->prepare('UPDATE contacts SET handled = :handled WHERE id = :id');
        $stmt->execute(['handled' => $v->get('handled'), 'id' => (int) $id]);

        if ($stmt->rowCount() === 0) {
            $exists = Database::connection()->prepare('SELECT id FROM contacts WHERE id = :id');
            $exists->execute(['id' => (int) $id]);

            if ($exists->fetch() === false) {
                Response::error('Message not found.', 404);
            }
        }

        $fresh = Database::connection()->prepare(
            'SELECT id, name, email, subject, message, handled, created_at FROM contacts WHERE id = :id'
        );
        $fresh->execute(['id' => (int) $id]);
        $row = $fresh->fetch();

        if ($row === false) {
            Response::error('Message not found.', 404);
        }

        $row['id'] = (int) $row['id'];
        $row['handled'] = (bool) $row['handled'];

        Response::success(['data' => $row]);
    }

    /** GET /api/admin/subscribers */
    public function subscribers(): void
    {
        Auth::verify();
        $pdo = Database::connection();

        $limit = Http::queryInt('limit', 100, 1, 200);
        $total = (int) $pdo->query('SELECT COUNT(*) c FROM newsletter_subscribers')->fetch()['c'];

        $stmt = $pdo->prepare(
            "SELECT id, email, created_at FROM newsletter_subscribers
             ORDER BY created_at DESC, id DESC LIMIT {$limit}"
        );
        $stmt->execute();

        $rows = array_map(static function (array $row): array {
            $row['id'] = (int) $row['id'];

            return $row;
        }, $stmt->fetchAll());

        Response::success([
            'data' => $rows,
            'meta' => ['total' => $total],
        ]);
    }
}
