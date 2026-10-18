<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http;
use App\Response;
use App\Validator;

final class OrderController
{
    private const SHIPPING_FLAT = 12.00;
    private const FREE_SHIPPING_OVER = 150.00;

    /** POST /api/orders — validate the cart server-side and place the order. */
    public function store(): void
    {
        $input = Http::body();

        $v = new Validator($input);
        $v->text('customer_name', 'Full name', 2, 100)
            ->email('email')
            ->text('address', 'Address', 5, 200)
            ->text('city', 'City', 2, 100)
            ->text('postal_code', 'Postal code', 3, 20)
            ->text('country', 'Country', 2, 60)
            ->optionalText('phone', 'Phone', 30)
            ->optionalText('notes', 'Order note', 500);
        $v->check();

        $items = $input['items'] ?? null;

        if (!is_array($items) || $items === []) {
            Response::error('Your cart is empty.', 422, ['items' => 'Add at least one fragrance to your cart.']);
        }

        if (count($items) > 20) {
            Response::error('A maximum of 20 line items is allowed.', 422, ['items' => 'Too many line items.']);
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $lineItems = [];
            $subtotal = 0.0;

            foreach ($items as $item) {
                $productId = is_array($item) ? (int) ($item['product_id'] ?? 0) : 0;
                $quantity = is_array($item) ? (int) ($item['quantity'] ?? 0) : 0;

                if ($productId <= 0 || $quantity < 1 || $quantity > 10) {
                    throw new \RuntimeException('invalid_item');
                }

                $stmt = $pdo->prepare(
                    'SELECT id, name, size_ml, price, stock FROM products WHERE id = :id FOR UPDATE'
                );
                $stmt->execute(['id' => $productId]);
                $product = $stmt->fetch();

                if ($product === false) {
                    throw new \RuntimeException('missing_product');
                }

                if ((int) $product['stock'] < $quantity) {
                    Response::error(
                        '"' . $product['name'] . '" only has ' . (int) $product['stock'] . ' bottle(s) left in stock.',
                        409,
                        ['items' => 'Stock changed while you were checking out.']
                    );
                }

                $unitPrice = (float) $product['price'];
                $subtotal += $unitPrice * $quantity;

                $lineItems[] = [
                    'product_id'   => $productId,
                    'product_name' => $product['name'],
                    'unit_price'   => $unitPrice,
                    'quantity'     => $quantity,
                    'size_ml'      => (int) $product['size_ml'],
                ];
            }

            $shipping = $subtotal >= self::FREE_SHIPPING_OVER ? 0.0 : self::SHIPPING_FLAT;
            $total = $subtotal + $shipping;
            $reference = $this->reference();

            $orderStmt = $pdo->prepare(
                'INSERT INTO orders
                    (reference, customer_name, email, phone, address, city, postal_code, country, notes,
                     subtotal, shipping, total, status)
                 VALUES
                    (:reference, :customer_name, :email, :phone, :address, :city, :postal_code, :country, :notes,
                     :subtotal, :shipping, :total, "pending")'
            );
            $orderStmt->execute([
                'reference'     => $reference,
                'customer_name' => $v->get('customer_name'),
                'email'         => $v->get('email'),
                'phone'         => $v->get('phone'),
                'address'       => $v->get('address'),
                'city'          => $v->get('city'),
                'postal_code'   => $v->get('postal_code'),
                'country'       => $v->get('country'),
                'notes'         => $v->get('notes'),
                'subtotal'      => number_format($subtotal, 2, '.', ''),
                'shipping'      => number_format($shipping, 2, '.', ''),
                'total'         => number_format($total, 2, '.', ''),
            ]);

            $orderId = (int) $pdo->lastInsertId();

            $itemStmt = $pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, size_ml)
                 VALUES (:order_id, :product_id, :product_name, :unit_price, :quantity, :size_ml)'
            );
            $stockStmt = $pdo->prepare('UPDATE products SET stock = stock - :qty WHERE id = :id');

            foreach ($lineItems as $line) {
                $itemStmt->execute([
                    'order_id'     => $orderId,
                    'product_id'   => $line['product_id'],
                    'product_name' => $line['product_name'],
                    'unit_price'   => number_format($line['unit_price'], 2, '.', ''),
                    'quantity'     => $line['quantity'],
                    'size_ml'      => $line['size_ml'],
                ]);
                $stockStmt->execute(['qty' => $line['quantity'], 'id' => $line['product_id']]);
            }

            $pdo->commit();
        } catch (\RuntimeException $e) {
            $pdo->rollBack();

            if ($e->getMessage() === 'missing_product') {
                Response::error('One of the products in your cart no longer exists.', 409);
            }
            Response::error('Your cart contains an invalid item.', 422);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        Response::success([
            'data' => [
                'reference' => $reference,
                'total'     => $total,
                'shipping'  => $shipping,
                'subtotal'  => $subtotal,
                'email'     => $v->get('email'),
                'name'      => $v->get('customer_name'),
            ],
        ], 201);
    }

    /** GET /api/orders/{reference} — look up an order for the confirmation page. */
    public function show(string $reference): void
    {
        $stmt = Database::connection()->prepare(
            'SELECT reference, customer_name, email, subtotal, shipping, total, status, created_at
             FROM orders WHERE reference = :reference'
        );
        $stmt->execute(['reference' => strtoupper($reference)]);
        $order = $stmt->fetch();

        if ($order === false) {
            Response::error('Order not found.', 404);
        }

        $itemsStmt = Database::connection()->prepare(
            'SELECT product_name, unit_price, quantity, size_ml
             FROM order_items WHERE order_id = (SELECT id FROM orders WHERE reference = :reference)'
        );
        $itemsStmt->execute(['reference' => strtoupper($reference)]);

        $order['items'] = $itemsStmt->fetchAll();

        Response::success(['data' => $order]);
    }

    private function reference(): string
    {
        return 'LM-' . strtoupper(bin2hex(random_bytes(3)));
    }
}
