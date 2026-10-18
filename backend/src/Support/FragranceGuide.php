<?php

declare(strict_types=1);

namespace App\Support;

use App\Database;

/**
 * Builds the long-form "about this fragrance" guide: what it smells like in
 * words, note-by-note explanation, how and when to wear it, layering ideas
 * and an FAQ — composed from the product record plus this dictionary.
 */
final class FragranceGuide
{
    /** Sensible wearing defaults when a product has no curated values. */
    private const FAMILY_DEFAULTS = [
        'floral' => [
            'longevity' => '6–8 hours',
            'sillage'   => 'Moderate — a scent bubble, not a cloud',
            'season'    => 'Spring and summer',
            'occasion'  => 'Daytime, weddings and celebrations',
            'sprays'    => 'Two to three sprays: neck, wrists and the base of the throat',
            'intensity' => 3,
        ],
        'woody' => [
            'longevity' => '7–9 hours',
            'sillage'   => 'Moderate to strong',
            'season'    => 'Autumn and winter, and cool evenings year round',
            'occasion'  => 'The office, dinners and everyday elegance',
            'sprays'    => 'Two sprays on skin, one on fabric — the woods love cloth',
            'intensity' => 4,
        ],
        'citrus' => [
            'longevity' => '4–6 hours',
            'sillage'   => 'Soft to moderate',
            'season'    => 'Spring and summer',
            'occasion'  => 'Daytime, work and travel',
            'sprays'    => 'Three to four sprays; citrus is the one family that rewards a top-up',
            'intensity' => 2,
        ],
        'oriental' => [
            'longevity' => '8–12 hours',
            'sillage'   => 'Strong and generous',
            'season'    => 'Autumn and winter',
            'occasion'  => 'Evenings, celebrations and cold weather',
            'sprays'    => 'One or two sprays is plenty — amber grows as it warms',
            'intensity' => 5,
        ],
        'fresh' => [
            'longevity' => '5–7 hours',
            'sillage'   => 'Soft and intimate',
            'season'    => 'Spring and summer',
            'occasion'  => 'Everyday, the office and weekends',
            'sprays'    => 'Three sprays, refreshed after lunch if you like',
            'intensity' => 2,
        ],
        'gourmand' => [
            'longevity' => '8–10 hours',
            'sillage'   => 'Moderate to strong',
            'season'    => 'Autumn and winter',
            'occasion'  => 'Evenings, cosy weekends and cold-weather outings',
            'sprays'    => 'Two sprays — sweetness carries further than you expect',
            'intensity' => 4,
        ],
    ];

    /** Which families flatter each other when layered. */
    private const LAYERING_PARTNERS = [
        'floral'   => ['gourmand', 'woody', 'fresh'],
        'woody'    => ['citrus', 'floral', 'gourmand'],
        'citrus'   => ['woody', 'oriental', 'fresh'],
        'oriental' => ['floral', 'fresh', 'woody'],
        'fresh'    => ['oriental', 'woody', 'floral'],
        'gourmand' => ['floral', 'woody', 'citrus'],
    ];

    private const SELECT = "SELECT p.*, c.slug AS category_slug, c.name AS category_name,
                    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
             FROM products p
             JOIN categories c ON c.id = p.category_id";

    public static function build(array $row): array
    {
        $product = ProductPresenter::one($row);
        $family = $product['category']['slug'];
        $defaults = self::FAMILY_DEFAULTS[$family] ?? self::FAMILY_DEFAULTS['woody'];

        $longevity = self::value($row['longevity'] ?? null, $defaults['longevity']);
        $sillage = self::value($row['sillage'] ?? null, $defaults['sillage']);

        $profile = [
            'longevity'  => $longevity,
            'sillage'    => $sillage,
            'season'     => self::value($row['best_season'] ?? null, $defaults['season']),
            'occasion'   => self::value($row['occasion'] ?? null, $defaults['occasion']),
            'sprays'     => $defaults['sprays'],
            'intensity'  => $defaults['intensity'],
            'format'     => 'Extrait de parfum, 20–30% concentration',
            'families'   => NoteLibrary::familiesOf(ProductPresenter::allNotes($product)),
        ];

        $layerings = self::layering($product, $family);
        $curve = self::scentCurve($product);

        return [
            'product'   => $product,
            'tagline'   => self::tagline($product, $row),
            'story'     => self::value($row['story'] ?? null, self::generatedStory($product)),
            'craft'     => self::value($row['craft_notes'] ?? null, self::generatedCraft($product)),
            'profile'   => $profile,
            'layers'    => NoteLibrary::explainLayers($product['notes']),
            'curve'     => $curve,
            'layering'  => $layerings,
            'faq'       => self::faq($product, $profile, $layerings),
            'related'   => self::related($product),
        ];
    }

    private static function value(?string $candidate, string $fallback): string
    {
        $candidate = trim((string) $candidate);

        return $candidate !== '' ? $candidate : $fallback;
    }

    private static function tagline(array $product, array $row): string
    {
        if (!empty($row['tagline'])) {
            return (string) $row['tagline'];
        }

        $lead = $product['notes']['top'][0] ?? 'the opening';
        $heart = $product['notes']['heart'][0] ?? 'the heart';
        $base = $product['notes']['base'][0] ?? 'the base';

        return sprintf('A %s built on %s, %s and %s.', mb_strtolower($product['category']['name']), $lead, $heart, $base);
    }

    private static function generatedStory(array $product): string
    {
        $notes = $product['notes'];
        $top = implode(' and ', array_slice($notes['top'], 0, 2));
        $heart = implode(' and ', array_slice($notes['heart'], 0, 2));
        $base = implode(' and ', array_slice($notes['base'], 0, 3));

        return sprintf(
            "%s opens on %s, the kind of introduction that makes people lean closer before they can help it. " .
            "Within twenty minutes the composition settles into %s — this is the part you will smell on your scarf at the end of the day. " .
            "What remains, for hours, is %s.\n\n%s",
            $product['name'],
            $top ?: 'bright citrus',
            $heart ?: 'a soft floral heart',
            $base ?: 'warm woods',
            $product['description']
        );
    }

    private static function generatedCraft(array $product): string
    {
        return sprintf(
            'Composed in Grasse and macerated for eight weeks before bottling, %s is blended at extrait strength ' .
            'so a small amount goes a long way. Each batch is filled, labelled and numbered by hand in the atelier.',
            $product['name']
        );
    }

    /** A readable description of how the fragrance develops over time. */
    private static function scentCurve(array $product): array
    {
        return [
            [
                'label' => '0–15 minutes',
                'title' => 'The opening',
                'text'  => sprintf(
                    'You smell %s first — bright, immediate and designed to make an entrance.',
                    implode(', ', $product['notes']['top']) ?: 'the top notes'
                ),
            ],
            [
                'label' => '15 minutes – 3 hours',
                'title' => 'The heart',
                'text'  => sprintf(
                    'The composition finds its character: %s takes over and the fragrance becomes recognisably itself.',
                    implode(', ', $product['notes']['heart']) ?: 'the heart notes'
                ),
            ],
            [
                'label' => '3 hours onwards',
                'title' => 'The base',
                'text'  => sprintf(
                    '%s settles into skin and stays there — this is what people smell when they stand close to you.',
                    implode(', ', $product['notes']['base']) ?: 'the base notes'
                ),
            ],
        ];
    }

    /** Two well-chosen layering partners from the live catalogue. */
    private static function layering(array $product, string $family): array
    {
        $partners = self::LAYERING_PARTNERS[$family] ?? ['floral', 'woody'];

        $placeholders = implode(', ', array_fill(0, count($partners), '?'));

        $stmt = Database::connection()->prepare(
            self::SELECT . " WHERE c.slug IN ({$placeholders}) AND p.id != ? AND p.stock > 0
             ORDER BY FIELD(c.slug, {$placeholders}), p.rating DESC LIMIT 2"
        );

        $stmt->execute([...$partners, $product['id'], ...$partners]);
        $rows = $stmt->fetchAll();

        $suggestions = [];

        foreach ($rows as $index => $row) {
            $partner = ProductPresenter::one($row);

            $suggestions[] = [
                'product'   => $partner,
                'rationale' => $index === 0
                    ? sprintf(
                        'Spray %s first, then %s over the top. The %s base gives %s something to sit on, while its own %s opening keeps the pair from turning heavy.',
                        $partner['name'],
                        $product['name'],
                        mb_strtolower($partner['category']['name']),
                        $product['name'],
                        mb_strtolower($product['category']['name'])
                    )
                    : sprintf(
                        'For a softer reading, wear %s alone and dab a single spray of %s behind the ears — the %s heart lifts the %s drydown without competing with it.',
                        $product['name'],
                        $partner['name'],
                        mb_strtolower($partner['category']['name']),
                        mb_strtolower($product['name'])
                    ),
            ];
        }

        return $suggestions;
    }

    /** Other guides to read next — the same family first. */
    private static function related(array $product): array
    {
        $stmt = Database::connection()->prepare(
            self::SELECT . ' WHERE p.category_id = (SELECT category_id FROM products WHERE id = :pid)
             AND p.id != :sid ORDER BY p.featured DESC, p.rating DESC LIMIT 4'
        );
        $stmt->execute(['pid' => $product['id'], 'sid' => $product['id']]);

        return array_map(
            static fn (array $row): array => [
                'id'       => (int) $row['id'],
                'name'     => $row['name'],
                'price'    => (float) $row['price'],
                'size_ml'  => (int) $row['size_ml'],
                'colors'   => [
                    'a'     => $row['color_a'],
                    'b'     => $row['color_b'],
                    'shape' => $row['shape'],
                ],
                'category' => [
                    'slug' => $row['category_slug'],
                    'name' => $row['category_name'],
                ],
                'rating'   => (float) $row['rating'],
            ],
            $stmt->fetchAll()
        );
    }

    private static function faq(array $product, array $profile, array $layerings): array
    {
        $gender = match ($product['gender']) {
            'women' => 'It is composed with women in mind, though fragrance has no rules — plenty of clients who wear it are men.',
            'men'   => 'It is composed with men in mind, though it suits anyone who likes a deeper, warmer register.',
            default => 'It is unisex: composed without a gender in mind, and worn by everyone.',
        };

        $pairings = array_map(
            static fn (array $item): string => $item['product']['name'],
            $layerings
        );

        $faq = [
            [
                'question' => sprintf('How long does %s last on skin?', $product['name']),
                'answer'   => sprintf(
                    'Expect %s. Sillage is %s, so it stays close enough for a conversation rather than entering the room before you do.',
                    $profile['longevity'],
                    mb_strtolower($profile['sillage'])
                ),
            ],
            [
                'question' => 'Is this for women or men?',
                'answer'   => $gender,
            ],
            [
                'question' => 'When is the best time to wear it?',
                'answer'   => sprintf('Best in %s. Our note suggests it for %s.', mb_strtolower($profile['season']), mb_strtolower($profile['occasion'])),
            ],
            [
                'question' => 'How many sprays should I use?',
                'answer'   => sprintf('%s. Because it is an extrait (20–30%% concentration), resist the urge to overspray on the first wearing — the base notes appear an hour in.', $profile['sprays']),
            ],
            [
                'question' => 'Can I layer it with something else?',
                'answer'   => $pairings
                    ? sprintf('Yes. We would try it with %s first — both are in the catalogue, and the guide for each explains the pairing.', implode(' or ', $pairings))
                    : 'Yes — a citrus or a soft musk both work underneath without fighting the composition.',
            ],
            [
                'question' => 'What size is the bottle, and is it in stock?',
                'answer'   => $product['stock'] > 0
                    ? sprintf(
                        'It comes in a %d ml extrait de parfum flacon at %s, and we currently have %d in stock.',
                        $product['size_ml'],
                        '$' . number_format($product['price'], 2),
                        $product['stock']
                    )
                    : sprintf('It comes in a %d ml extrait de parfum flacon at %s. It is currently sold out — join the letter and we will write the moment it returns.', $product['size_ml'], '$' . number_format($product['price'], 2)),
            ],
        ];

        return $faq;
    }
}
