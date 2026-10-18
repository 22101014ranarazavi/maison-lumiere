<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Normalises product rows into the JSON shape the frontend expects.
 * Shared by the storefront, the guide pages and the chatbot.
 */
final class ProductPresenter
{
    public static function one(array $row): array
    {
        $split = static function (?string $value): array {
            $parts = array_map('trim', explode(',', (string) $value));

            return array_values(array_filter($parts, static fn (string $note): bool => $note !== ''));
        };

        return [
            'id'               => (int) $row['id'],
            'sku'              => $row['sku'],
            'name'             => $row['name'],
            'house'            => $row['house'],
            'description'      => $row['description'],
            'category'         => [
                'slug' => $row['category_slug'],
                'name' => $row['category_name'],
            ],
            'gender'           => $row['gender'],
            'size_ml'          => (int) $row['size_ml'],
            'price'            => (float) $row['price'],
            'compare_at_price' => $row['compare_at_price'] !== null ? (float) $row['compare_at_price'] : null,
            'stock'            => (int) $row['stock'],
            'notes'            => [
                'top'   => $split($row['top_notes']),
                'heart' => $split($row['heart_notes']),
                'base'  => $split($row['base_notes']),
            ],
            'colors'           => [
                'a'     => $row['color_a'],
                'b'     => $row['color_b'],
                'shape' => $row['shape'],
            ],
            'featured'         => (bool) $row['featured'],
            'rating'           => (float) $row['rating'],
            'review_count'     => (int) ($row['review_count'] ?? 0),
            'created_at'       => $row['created_at'],
        ];
    }

    /** @param array<int, array<string, mixed>> $rows */
    public static function many(array $rows): array
    {
        return array_map([self::class, 'one'], $rows);
    }

    /** Flattened list of every note on a product. */
    public static function allNotes(array $presented): array
    {
        return array_merge(
            $presented['notes']['top'],
            $presented['notes']['heart'],
            $presented['notes']['base'],
        );
    }
}
