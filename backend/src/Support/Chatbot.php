<?php

declare(strict_types=1);

namespace App\Support;

use App\Database;

/**
 * A rules-only fragrance concierge.
 *
 * Every answer is derived deterministically from the live catalogue — there is
 * no model, no API key and no network call. A message is normalised, matched
 * against a priority-ordered list of intents, and answered with a short piece
 * of prose plus up to three product cards the shop can render.
 */
final class Chatbot
{
    /** How many product cards an answer may carry. */
    private const MAX_PRODUCTS = 3;

    /** family slug => words that hint at it (family is the storefront's shop category). */
    private const FAMILY_WORDS = [
        'floral'   => ['floral', 'flower', 'flowers', 'flowery', 'bloomy', 'bouquet', 'rose'],
        'woody'    => ['woody', 'wood', 'woods', 'woodland', 'forest'],
        'citrus'   => ['citrus', 'citrussy', 'citrusy', 'zesty'],
        'oriental' => ['oriental', 'ambery', 'spicy', 'spice', 'incense', 'sultry'],
        'fresh'    => ['fresh', 'clean', 'aquatic', 'marine', 'seaside', 'crisp'],
        'gourmand' => ['gourmand', 'dessert', 'edible', 'caramel', 'chocolate', 'praline'],
    ];

    private const SEASON_WORDS = [
        'summer' => ['summer', 'hot weather', 'warm weather', 'beach', 'holiday heat'],
        'winter' => ['winter', 'cold weather', 'colder', 'frost'],
        'spring' => ['spring', 'springtime'],
        'autumn' => ['autumn', 'fall', 'autumnal'],
    ];

    /** Occasion keywords matched against each product's curated occasion note. */
    private const OCCASION_WORDS = [
        'wedding', 'evening', 'date', 'date night', 'night out', 'party', 'office',
        'for work', 'at work', 'workday', 'everyday', 'daily', 'gym', 'sport',
        'holiday', 'formal', 'interview', 'dinner', 'weekend', 'celebration',
        'birthday', 'anniversary', 'travel', 'brunch', 'cosy',
    ];

    /** @var array<int, array<string, mixed>> */
    private array $catalogue;

    /** @var array<string, string> flattened note name => canonical note name */
    private array $noteIndex;

    private function __construct(array $catalogue)
    {
        $this->catalogue = $catalogue;
        $this->noteIndex = self::buildNoteIndex();
    }

    // ------------------------------------------------------------------ boot

    /** Load the live catalogue once and wrap it in a bot instance. */
    public static function boot(): self
    {
        $rows = Database::connection()->query(
            "SELECT p.*, c.slug AS category_slug, c.name AS category_name,
                    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
             FROM products p
             JOIN categories c ON c.id = p.category_id
             ORDER BY p.featured DESC, p.rating DESC, p.price ASC"
        )->fetchAll();

        $catalogue = [];

        foreach ($rows as $row) {
            $product = ProductPresenter::one($row);

            // Extra guide copy the bot needs; kept outside ProductPresenter so
            // the storefront payload stays unchanged.
            $product['tagline']        = self::cleanText($row['tagline'] ?? null);
            $product['longevity']      = self::cleanText($row['longevity'] ?? null);
            $product['sillage']        = self::cleanText($row['sillage'] ?? null);
            $product['best_season']    = self::cleanText($row['best_season'] ?? null);
            $product['occasion_note']  = self::cleanText($row['occasion'] ?? null);
            $product['longevity_hours'] = self::parseHours($row['longevity'] ?? null);

            $catalogue[] = $product;
        }

        return new self($catalogue);
    }

    // ------------------------------------------------------------------- api

    /**
     * Answer a customer message.
     *
     * @return array{reply: string, intent: string, products: array<int, array<string, mixed>>, suggestions: array<int, string>}
     */
    public function respond(string $message): array
    {
        $text = self::normalise($message);

        if ($text === '') {
            return $this->finish($this->answer(
                'Ask me anything about the collection — a note you love, an occasion, a budget, or the status of an order.',
                'empty',
                [],
                $this->defaultSuggestions()
            ));
        }

        $handlers = [
            'orderStatus', 'greeting', 'thanks', 'farewell', 'help',
            'shippingInfo', 'returnsInfo', 'paymentInfo', 'contactInfo',
            'comparison', 'layeringAdvice', 'longevityAdvice',
            'productDetail', 'noteDetail',
            'gift', 'budget', 'bestsellers',
            'wearingAdvice', 'formatAdvice', 'genderAdvice', 'discovery',
        ];

        foreach ($handlers as $handler) {
            $answer = $this->{$handler}($text);

            if ($answer !== null) {
                return $this->finish($answer);
            }
        }

        return $this->finish($this->fallback($text));
    }

    // -------------------------------------------------------------- handlers

    /** "Where is LM-7C2F9A?" — the only intent that touches the database. */
    private function orderStatus(string $text): ?array
    {
        if (!preg_match('/\blm[-\s]?([a-z0-9]{6})\b/', $text, $match)) {
            return null;
        }

        $reference = 'LM-' . strtoupper($match[1]);

        $stmt = Database::connection()->prepare(
            'SELECT reference, status, tracking_number FROM orders WHERE reference = :ref'
        );
        $stmt->execute(['ref' => $reference]);
        $order = $stmt->fetch();

        $suggestions = ['How long does delivery take?', 'What is your returns policy?', 'Contact the atelier'];

        if ($order === false) {
            return $this->answer(
                "I can't find an order with the reference {$reference}. Double-check the code from your confirmation email — it is shaped like LM-XXXXXX.",
                'order_status',
                [],
                $suggestions
            );
        }

        $status = [
            'pending'   => 'has been received and is awaiting payment',
            'paid'      => 'is paid and queued to be packed',
            'shipped'   => 'has left the atelier',
            'cancelled' => 'was cancelled',
        ][$order['status']] ?? 'is being processed';

        $reply = "Order {$order['reference']} {$status}.";

        if (!empty($order['tracking_number'])) {
            $reply .= " It is travelling under tracking number {$order['tracking_number']}.";
        }

        if ($order['status'] === 'pending') {
            $reply .= ' As soon as payment clears we will wrap it and write to you with the tracking.';
        }

        if ($order['status'] === 'cancelled') {
            $reply .= ' Any payment taken has been returned to the original method.';
        }

        return $this->answer($reply, 'order_status', [], $suggestions);
    }

    private function greeting(string $text): ?array
    {
        $words = ['hi', 'hiya', 'hello', 'hey', 'bonjour', 'salut', 'good morning', 'good afternoon', 'good evening'];

        if (!$this->hits($text, $words) || $this->wordCount($text) > 6) {
            return null;
        }

        return $this->answer(
            'Hello — welcome to Maison Lumière. I can help you find a fragrance, explain a note, compare two bottles, or check an order.',
            'greeting',
            [],
            $this->defaultSuggestions()
        );
    }

    private function thanks(string $text): ?array
    {
        if (!$this->hits($text, ['thanks', 'thank you', 'thankyou', 'merci', 'much appreciated'])) {
            return null;
        }

        return $this->answer(
            'A pleasure. If you tell me an occasion or a note you love, I can narrow it down further.',
            'thanks',
            [],
            $this->defaultSuggestions()
        );
    }

    private function farewell(string $text): ?array
    {
        if (!$this->hits($text, ['bye', 'goodbye', 'see you', 'au revoir', 'good night', 'farewell'])) {
            return null;
        }

        return $this->answer('À bientôt — enjoy the search.', 'farewell', [], ['What do you recommend?']);
    }

    private function help(string $text): ?array
    {
        if (!$this->hits($text, ['help', 'what can you do', 'what can you help', 'how can you help', 'what do you know', 'options'])) {
            return null;
        }

        return $this->answer(
            "I know the whole catalogue: I can describe any fragrance or note, compare two bottles, suggest something for an occasion or a budget, explain longevity and layering, or look up an order by its LM-XXXXXX reference.",
            'help',
            [],
            [
                'What do you recommend for a wedding?',
                'Something warm for winter under $150',
                'Tell me about oud',
                'What lasts the longest?',
            ]
        );
    }

    /** "Nuit d'Or or Cèdre Blanc?" */
    private function comparison(string $text): ?array
    {
        if (!$this->hits($text, ['vs', 'versus', 'compare', 'comparison', ' or ', 'difference between', 'better'])) {
            return null;
        }

        $products = $this->namedProducts($text);

        if (count($products) < 2) {
            return null;
        }

        [$a, $b] = $products;

        $reply = sprintf(
            '%s is a %s %s fragrance at %s, opening on %s and settling into %s. %s is a %s %s at %s, opening on %s and settling into %s. %s',
            $a['name'],
            mb_strtolower($a['category']['name']),
            $a['gender'],
            $this->priceLabel($a),
            $this->listPhrase($a['notes']['top']),
            $this->listPhrase($a['notes']['base']),
            $b['name'],
            mb_strtolower($b['category']['name']),
            $b['gender'],
            $this->priceLabel($b),
            $this->listPhrase($b['notes']['top']),
            $this->listPhrase($b['notes']['base']),
            $this->resolve($a, $b)
        );

        return $this->answer($reply, 'comparison', [$this->card($a), $this->card($b)], [
            "Read the full guide for {$a['name']}",
            "Read the full guide for {$b['name']}",
            'What do you recommend?',
        ]);
    }

    /** A single named bottle — "tell me about Nuit d'Or". */
    private function productDetail(string $text): ?array
    {
        $products = $this->namedProducts($text);

        if (count($products) !== 1) {
            return null;
        }

        $product = $products[0];

        $reply = sprintf(
            '%s is a %s %s extrait de parfum by %s. %s It opens with %s, moves through %s, and rests on %s — %s. %s',
            $product['name'],
            mb_strtolower($product['category']['name']),
            $product['gender'],
            $product['house'],
            $product['description'],
            $this->listPhrase($product['notes']['top']),
            $this->listPhrase($product['notes']['heart']),
            $this->listPhrase($product['notes']['base']),
            $this->priceLabel($product),
            $product['stock'] > 0
                ? 'It is in stock now; the full guide explains how to wear it.'
                : 'It is currently sold out, but the full guide is still worth a read.'
        );

        return $this->answer($reply, 'product_detail', [$this->card($product)], [
            "How long does {$product['name']} last?",
            "What can I layer with {$product['name']}?",
            'Show me something similar',
        ]);
    }

    /** "What does oud smell like?" */
    private function noteDetail(string $text): ?array
    {
        $matched = [];

        foreach ($this->noteIndex as $flat => $note) {
            if ($this->flatHits($text, $flat)) {
                // Prefer the most specific (longest) note name in the sentence.
                $matched[$note] = mb_strlen($note);
            }
        }

        if ($matched === []) {
            return null;
        }

        arsort($matched);
        $note = (string) array_key_first($matched);
        $detail = NoteLibrary::describe($note);

        $products = $this->productsWithNote($note);

        $reply = sprintf(
            '%s is a %s note — %s. In this collection you will find it in %s.',
            $note,
            mb_strtolower($detail['family_label']),
            rtrim($detail['description'], '.'),
            $this->nameList($products) ?: 'nothing just now'
        );

        return $this->answer($reply, 'note_detail', $this->cards($products), [
            "What blends well with {$note}?",
            'What do you recommend?',
            'Something for the evening',
        ]);
    }

    /** "Something under $120." */
    private function budget(string $text): ?array
    {
        $limit = [];
        $dollar = [];
        $hasLimit = preg_match('/\b(?:under|below|less than|up to|max|no more than|spend|budget of)\s*\$?\s*(\d{2,4})\b/', $text, $limit) === 1;
        $hasDollar = preg_match('/\$\s?(\d{2,4})/', $text, $dollar) === 1;
        $hasCue = $this->hits($text, ['budget', 'cheaper', 'cheapest', 'affordable', 'inexpensive', 'bargain', 'how much']);

        if (!$hasLimit && !$hasDollar && !$hasCue) {
            return null;
        }

        $max = $hasLimit ? (int) $limit[1] : ($hasDollar ? (int) $dollar[1] : null);

        if ($max !== null) {
            $matches = array_values(array_filter(
                $this->catalogue,
                static fn (array $product): bool => $product['price'] <= $max && $product['stock'] > 0
            ));

            if ($matches === []) {
                $cheapest = $this->cheapest(2);

                return $this->answer(
                    sprintf(
                        'Nothing in the collection sits under $%d just now — our entry point is %s at %s.',
                        $max,
                        $cheapest[0]['name'],
                        $this->priceLabel($cheapest[0])
                    ),
                    'budget',
                    $this->cards($cheapest),
                    ['Show me the most affordable options', 'What do you recommend?']
                );
            }

            usort($matches, static fn (array $a, array $b): int => $b['rating'] <=> $a['rating']);
            $top = array_slice($matches, 0, self::MAX_PRODUCTS);

            return $this->answer(
                sprintf(
                    'Under $%d you have %s. %s',
                    $max,
                    $this->nameList($top),
                    $this->highlight($top[0])
                ),
                'budget',
                $this->cards($top),
                ['Which is best for the evening?', 'What do you recommend?']
            );
        }

        $cheapest = $this->cheapest(self::MAX_PRODUCTS);

        return $this->answer(
            sprintf('Our most accessible fragrances are %s — all extrait strength, so a little goes a long way.', $this->nameList($cheapest)),
            'budget',
            $this->cards($cheapest),
            ['Something under $120', 'What do you recommend?']
        );
    }

    private function gift(string $text): ?array
    {
        if (!$this->hits($text, ['gift', 'present', 'birthday', 'anniversary', 'christmas', 'surprise'])) {
            return null;
        }

        $picks = $this->byGender($this->detectGender($text));

        if ($picks === []) {
            $picks = $this->catalogue;
        }

        $picks = $this->topRated($picks, self::MAX_PRODUCTS);

        return $this->answer(
            sprintf(
                'For a gift I would start with %s — all three arrive wrapped with a hand-written note. If you tell me whether it is for someone who likes fresh, floral or warm scents, I can narrow it down.',
                $this->nameList($picks)
            ),
            'gift',
            $this->cards($picks),
            ['For someone who likes floral', 'For someone who likes warm scents', 'What is most popular?']
        );
    }

    private function bestsellers(string $text): ?array
    {
        if (!$this->hits($text, ['bestseller', 'best seller', 'best-selling', 'popular', 'most popular', 'favourite', 'favorite', 'signature', 'classic', 'top seller'])) {
            return null;
        }

        $products = $this->catalogue;

        usort($products, static function (array $a, array $b): int {
            return [$b['review_count'], $b['rating']] <=> [$a['review_count'], $a['rating']];
        });

        $top = array_slice($products, 0, self::MAX_PRODUCTS);

        return $this->answer(
            sprintf(
                'Most loved at the moment: %s. %s leads on reviews, and all three are the scents we send out most often.',
                $this->nameList($top),
                $top[0]['name']
            ),
            'bestsellers',
            $this->cards($top),
            ['What do you recommend?', 'Something for the evening', 'What lasts the longest?']
        );
    }

    /** Season or occasion — "what should I wear to a summer wedding?" */
    private function wearingAdvice(string $text): ?array
    {
        $season = $this->detectSeason($text);
        $occasions = $this->detectOccasions($text);

        if ($season === null && $occasions === []) {
            return null;
        }

        $matches = $this->catalogue;

        if ($season !== null) {
            $matches = array_values(array_filter(
                $matches,
                fn (array $product): bool => $this->matchesSeason($product, $season)
            ));
        }

        if ($occasions !== []) {
            $byOccasion = array_values(array_filter(
                $matches,
                fn (array $product): bool => $this->matchesOccasion($product, $occasions)
            ));

            if ($byOccasion !== []) {
                $matches = $byOccasion;
            }
        }

        $matches = $matches === [] ? $this->catalogue : $matches;
        $top = $this->topRated($matches, self::MAX_PRODUCTS);

        if ($season !== null && $occasions !== []) {
            $phrase = 'a ' . $season . ' ' . $occasions[0];
        } elseif ($season !== null) {
            $phrase = $season . ' days';
        } else {
            $phrase = 'a ' . $occasions[0];
        }

        return $this->answer(
            sprintf(
                'For %s, I would reach for %s. %s',
                $phrase,
                $this->nameList($top),
                $this->highlight($top[0])
            ),
            'wearing_advice',
            $this->cards($top),
            ['What lasts the longest?', 'Can I layer these?', 'What do you recommend?']
        );
    }

    /** "Which lasts the longest?" / "How is the sillage?" */
    private function longevityAdvice(string $text): ?array
    {
        $isLongevity = $this->hits($text, ['last', 'lasts', 'lasting', 'long lasting', 'how long', 'all day', 'longevity']);
        $isSillage = $this->hits($text, ['sillage', 'projection', 'trail', 'strong', 'strongest', 'subtle', 'light', 'weak', 'loud', 'beast']);

        if (!$isLongevity && !$isSillage) {
            return null;
        }

        // If a specific bottle is named, answer for it.
        $named = $this->namedProducts($text);

        if (count($named) === 1) {
            $product = $named[0];

            return $this->answer(
                sprintf(
                    '%s is listed at %s with %s sillage. Because every bottle here is an extrait (20–30%% concentration), it settles as it warms and stays closer to the skin than its opening suggests.',
                    $product['name'],
                    $product['longevity'] !== '' ? mb_strtolower($product['longevity']) : '8–10 hours',
                    $product['sillage'] !== '' ? mb_strtolower($product['sillage']) : 'moderate'
                ),
                'longevity',
                [$this->card($product)],
                ["Read the guide for {$product['name']}", 'What do you recommend?']
            );
        }

        usort($this->catalogue, static fn (array $a, array $b): int => $b['longevity_hours'] <=> $a['longevity_hours']);
        $top = array_slice($this->catalogue, 0, self::MAX_PRODUCTS);

        return $this->answer(
            sprintf(
                'The longest-wearing bottles in the collection are %s. The oriental and gourmand families hold for 8–12 hours; citrus and fresh compositions are brighter but need a top-up after lunch.',
                $this->nameList($top)
            ),
            'longevity',
            $this->cards($top),
            ['What is subtle enough for the office?', 'What do you recommend?']
        );
    }

    private function layeringAdvice(string $text): ?array
    {
        if (!$this->hits($text, ['layer', 'layering', 'combine', 'mix', 'wear together', 'pair', 'stack'])) {
            return null;
        }

        $named = $this->namedProducts($text);
        $product = $named[0] ?? $this->catalogue[0];
        $guide = FragranceGuide::build(self::rawRow($product));

        $partners = array_map(
            static fn (array $item): string => $item['product']['name'],
            $guide['layering']
        );

        $reply = $partners !== []
            ? sprintf(
                'Yes — we would try %s with %s. Spray the lighter of the two first, then the richer one over the top so the base has something to sit on. The guide page for each explains the pairing.',
                $product['name'],
                implode(' or ', $partners)
            )
            : sprintf(
                'Yes. A citrus or a soft musk worn underneath %s works without fighting it — apply the lighter scent first.',
                $product['name']
            );

        $products = $named !== [] ? [$product] : array_slice($this->catalogue, 0, 2);

        return $this->answer($reply, 'layering', $this->cards($products), [
            'What do you recommend?',
            'Something for the evening',
        ]);
    }

    private function formatAdvice(string $text): ?array
    {
        if (!$this->hits($text, ['extrait', 'edp', 'eau de parfum', 'eau de toilette', 'concentration', 'how big', 'bottle size', 'how many ml', '50 ml', 'size'])) {
            return null;
        }

        $sizes = [];

        foreach ($this->catalogue as $product) {
            $sizes[$product['size_ml']] = true;
        }

        ksort($sizes);

        $sizeList = array_map('strval', array_keys($sizes));
        $lastSize = array_pop($sizeList);
        $sizeText = $sizeList === [] ? $lastSize : implode(', ', $sizeList) . ' or ' . $lastSize;

        return $this->answer(
            sprintf(
                'Every fragrance in the house is an extrait de parfum — 20–30%% perfume oil, the most concentrated form, so one or two sprays last all day. Bottles come in %s ml, and prices run from %s to %s.',
                $sizeText,
                $this->priceLabel($this->cheapest(1)[0]),
                $this->priceLabel($this->mostExpensive(1)[0])
            ),
            'format',
            [],
            ['What lasts the longest?', 'What do you recommend?']
        );
    }

    private function shippingInfo(string $text): ?array
    {
        if (!$this->hits($text, ['shipping', 'delivery', 'deliver', 'how long does it take', 'ship', 'post', 'courier', 'dispatch'])) {
            return null;
        }

        return $this->answer(
            'We ship worldwide from the atelier. Standard delivery is $12, and complimentary on orders over $150. Orders placed before midday are wrapped the same day and typically arrive in 2–5 working days, with tracking emailed as soon as they leave us.',
            'shipping',
            [],
            ['Where is my order?', 'What is your returns policy?']
        );
    }

    private function returnsInfo(string $text): ?array
    {
        if (!$this->hits($text, ['return', 'refund', 'exchange', 'send it back', 'money back', 'unopened'])) {
            return null;
        }

        return $this->answer(
            'If a fragrance is not for you, return it unopened within 30 days for a full refund. Tell us the order reference and we will email a prepaid label. Opened bottles cannot be resold, but do write to us — we would rather find you the right scent than leave you with the wrong one.',
            'returns',
            [],
            ['What is your shipping policy?', 'Contact the atelier']
        );
    }

    private function paymentInfo(string $text): ?array
    {
        if (!$this->hits($text, ['payment', 'pay', 'paypal', 'visa', 'amex', 'mastercard', 'apple pay', 'google pay', 'credit card', 'debit card', 'checkout', 'how do i pay'])) {
            return null;
        }

        return $this->answer(
            'We take Visa, Mastercard, American Express, PayPal, Apple Pay and Google Pay at checkout. Payment is captured when the order is placed; if anything is out of stock we refund the difference within two working days.',
            'payment',
            [],
            ['What is your shipping policy?', 'Where is my order?']
        );
    }

    private function contactInfo(string $text): ?array
    {
        if (!$this->hits($text, ['contact', 'email', 'phone', 'speak to', 'talk to', 'a human', 'someone real', 'customer service', 'support'])) {
            return null;
        }

        return $this->answer(
            'The atelier answers every message in person. Use the contact form on the Contact page, or write to atelier@maisonlumiere.com — we reply within one working day. If it is about an order, include the LM-XXXXXX reference and I can check the basics for you now.',
            'contact',
            [],
            ['Where is my order?', 'What is your returns policy?']
        );
    }

    private function genderAdvice(string $text): ?array
    {
        $gender = $this->detectGender($text);

        if ($gender === null) {
            return null;
        }

        $picks = $this->topRated($this->byGender($gender), self::MAX_PRODUCTS);

        if ($picks === []) {
            return null;
        }

        $phrase = match ($gender) {
            'women' => 'composed with women in mind',
            'men'   => 'composed with men in mind',
            default => 'unisex, worn by everyone',
        };

        return $this->answer(
            sprintf('These are %s: %s. %s', $phrase, $this->nameList($picks), $this->highlight($picks[0])),
            'gender',
            $this->cards($picks),
            ['What do you recommend?', 'Something for the evening', 'Show me unisex options']
        );
    }

    /** Family, or a general "recommend me something". */
    private function discovery(string $text): ?array
    {
        $family = $this->detectFamily($text);
        $wantsPick = $this->hits($text, ['recommend', 'suggest', 'looking for', 'i want', 'i would like', 'which one', 'help me choose', 'something for', 'what should i', 'show me', 'new', 'discover', 'surprise me']);

        if ($family === null && !$wantsPick) {
            return null;
        }

        if ($family !== null) {
            $matches = array_values(array_filter(
                $this->catalogue,
                static fn (array $product): bool => $product['category']['slug'] === $family
            ));

            if ($matches !== []) {
                $top = $this->topRated($matches, self::MAX_PRODUCTS);

                return $this->answer(
                    sprintf(
                        '%s scents in the collection: %s. %s',
                        ucfirst($family),
                        $this->nameList($top),
                        $this->highlight($top[0])
                    ),
                    'family',
                    $this->cards($top),
                    ['What lasts the longest?', 'Something under $150', 'What do you recommend?']
                );
            }
        }

        $top = $this->topRated(array_filter($this->catalogue, static fn (array $p): bool => $p['stock'] > 0), self::MAX_PRODUCTS);

        return $this->answer(
            sprintf(
                'Happily. Three we would put in your hands first: %s. Tell me whether you lean fresh, floral or warm, and a budget, and I will sharpen the list.',
                $this->nameList($top)
            ),
            'recommend',
            $this->cards($top),
            ['Something fresh', 'Something warm', 'Something under $150']
        );
    }

    private function fallback(string $text): array
    {
        $products = $this->topRated($this->catalogue, 2);

        return $this->answer(
            sprintf(
                "I did not quite catch that — I am a small house bot, not a mind-reader. I can describe a fragrance or a note, compare two bottles, suggest something for an occasion or a budget, explain longevity and layering, or look up an order by its LM-XXXXXX reference. In the meantime, most people start with %s.",
                $this->nameList($products)
            ),
            'fallback',
            $this->cards($products),
            [
                'What do you recommend?',
                'Tell me about oud',
                'Something for a summer wedding',
                'What lasts the longest?',
            ]
        );
    }

    // ------------------------------------------------------------- utilities

    /** @return array{reply: string, intent: string, products: array, suggestions: array} */
    private function answer(string $reply, string $intent, array $products = [], array $suggestions = []): array
    {
        return [
            'reply'       => trim($reply),
            'intent'      => $intent,
            'products'    => array_slice($products, 0, self::MAX_PRODUCTS),
            'suggestions' => $suggestions,
        ];
    }

    /** Guarantee follow-up chips so the widget is never a dead end. */
    private function finish(array $answer): array
    {
        if ($answer['suggestions'] === []) {
            $answer['suggestions'] = $this->defaultSuggestions();
        }

        return $answer;
    }

    /** @return array<int, string> */
    private function defaultSuggestions(): array
    {
        return [
            'What do you recommend?',
            'Something for the evening',
            'What lasts the longest?',
            'Where is my order?',
        ];
    }

    /** Trim a product down to what a chat card needs. */
    private function card(array $product): array
    {
        return [
            'id'               => $product['id'],
            'name'             => $product['name'],
            'price'            => $product['price'],
            'compare_at_price' => $product['compare_at_price'],
            'size_ml'          => $product['size_ml'],
            'stock'            => $product['stock'],
            'rating'           => $product['rating'],
            'gender'           => $product['gender'],
            'tagline'          => $product['tagline'],
            'colors'           => $product['colors'],
            'category'         => $product['category'],
            'notes'            => $product['notes'],
        ];
    }

    /** @param array<int, array<string, mixed>> $products */
    private function cards(array $products): array
    {
        return array_map(fn (array $product): array => $this->card($product), array_slice($products, 0, self::MAX_PRODUCTS));
    }

    /**
     * Products whose name appears in the message, best match first.
     *
     * @return array<int, array<string, mixed>>
     */
    private function namedProducts(string $text): array
    {
        $flat = self::flat($text);
        $scored = [];

        foreach ($this->catalogue as $product) {
            $name = self::flat($product['name']);

            if ($name === '') {
                continue;
            }

            if (mb_strpos($flat, $name) !== false) {
                $scored[$product['id']] = 100;
                continue;
            }

            $tokens = array_values(array_filter(
                explode(' ', $name),
                static fn (string $token): bool => mb_strlen($token) >= 4
            ));

            foreach ($tokens as $token) {
                if (preg_match('/\b' . preg_quote($token, '/') . '\b/u', $flat) === 1) {
                    $scored[$product['id']] = max($scored[$product['id']] ?? 0, 60);
                }
            }
        }

        arsort($scored);

        // If a full name matched, trust only those products — token matches
        // like "blanc" can otherwise pull in unrelated bottles.
        if ($scored !== [] && max($scored) >= 100) {
            $scored = array_filter($scored, static fn (int $score): bool => $score >= 100);
        }

        $products = [];

        foreach (array_keys($scored) as $id) {
            foreach ($this->catalogue as $product) {
                if ($product['id'] === $id) {
                    $products[] = $product;
                    break;
                }
            }
        }

        return $products;
    }

    /** @return array<int, array<string, mixed>> */
    private function productsWithNote(string $note): array
    {
        $flat = self::flat($note);

        $matches = array_values(array_filter(
            $this->catalogue,
            static function (array $product) use ($flat): bool {
                foreach (ProductPresenter::allNotes($product) as $candidate) {
                    if (self::flat($candidate) === $flat) {
                        return true;
                    }
                }

                return false;
            }
        ));

        return $this->topRated($matches, self::MAX_PRODUCTS);
    }

    /** @return array<int, array<string, mixed>> */
    private function byGender(?string $gender): array
    {
        if ($gender === null || $gender === 'unisex') {
            $pool = $gender === 'unisex'
                ? array_values(array_filter($this->catalogue, static fn (array $p): bool => $p['gender'] === 'unisex'))
                : $this->catalogue;

            return $this->topRated($pool, self::MAX_PRODUCTS * 2);
        }

        $matches = array_values(array_filter(
            $this->catalogue,
            static fn (array $product): bool => in_array($product['gender'], [$gender, 'unisex'], true)
        ));

        return $matches;
    }

    /** @param array<int, array<string, mixed>> $products */
    private function topRated(array $products, int $limit): array
    {
        $products = array_values($products);

        usort($products, static function (array $a, array $b): int {
            return [$b['rating'], $b['review_count'], -$b['price']] <=> [$a['rating'], $a['review_count'], -$a['price']];
        });

        return array_slice($products, 0, $limit);
    }

    /** @return array<int, array<string, mixed>> */
    private function cheapest(int $limit): array
    {
        $products = $this->catalogue;

        usort($products, static fn (array $a, array $b): int => $a['price'] <=> $b['price']);

        return array_slice($products, 0, $limit);
    }

    /** @return array<int, array<string, mixed>> */
    private function mostExpensive(int $limit): array
    {
        $products = $this->catalogue;

        usort($products, static fn (array $a, array $b): int => $b['price'] <=> $a['price']);

        return array_slice($products, 0, $limit);
    }

    /** Which of two products suits a customer who is torn. */
    private function resolve(array $a, array $b): string
    {
        $cheaper = $a['price'] <= $b['price'] ? $a : $b;
        $longer = ($a['longevity_hours'] ?? 0) >= ($b['longevity_hours'] ?? 0) ? $a : $b;

        if ($cheaper['id'] === $longer['id']) {
            return sprintf('%s is both the more affordable and the longer-wearing of the two, so start there.', $cheaper['name']);
        }

        return sprintf(
            'Choose %s if you want the more affordable bottle, or %s if you want the one that lingers longest on skin.',
            $cheaper['name'],
            $longer['name']
        );
    }

    private function highlight(array $product): string
    {
        $parts = [sprintf('%s is %s', $product['name'], $this->priceLabel($product))];

        if ($product['tagline'] !== '') {
            $parts[] = rtrim($product['tagline'], '.');
        }

        return implode(' — ', $parts) . '.';
    }

    /** "Nuit d'Or, Oud Impérial and Cèdre Blanc" */
    private function nameList(array $products): string
    {
        $names = array_map(static fn (array $product): string => $product['name'], $products);

        return self::listPhrase($names);
    }

    /** Oxford-comma list: "A", "A and B", "A, B and C". */
    private static function listPhrase(array $items): string
    {
        $items = array_values(array_filter($items, static fn ($item): bool => (string) $item !== ''));

        if ($items === []) {
            return 'the notes';
        }

        if (count($items) === 1) {
            return (string) $items[0];
        }

        $last = array_pop($items);

        return implode(', ', $items) . ' and ' . $last;
    }

    private function priceLabel(array $product): string
    {
        $label = '$' . number_format((float) $product['price'], 2) . ' / ' . (int) $product['size_ml'] . ' ml';

        if (!empty($product['compare_at_price'])) {
            $label .= sprintf(' (was $%s)', number_format((float) $product['compare_at_price'], 2));
        }

        return $label;
    }

    private function detectFamily(string $text): ?string
    {
        foreach (self::FAMILY_WORDS as $slug => $words) {
            if ($this->hits($text, $words)) {
                return $slug;
            }
        }

        return null;
    }

    private function detectGender(string $text): ?string
    {
        if ($this->hits($text, ['unisex', 'for anyone', 'for everyone', 'both men and women'])) {
            return 'unisex';
        }

        if ($this->hits($text, ['for women', 'for her', 'feminine', 'female', 'my wife', 'my girlfriend', 'my mum', 'my mother', 'my sister', 'my daughter'])) {
            return 'women';
        }

        if ($this->hits($text, ['for men', 'for him', 'masculine', 'male', 'my husband', 'my boyfriend', 'my dad', 'my father', 'my brother', 'my son'])) {
            return 'men';
        }

        return null;
    }

    private function detectSeason(string $text): ?string
    {
        foreach (self::SEASON_WORDS as $season => $words) {
            if ($this->hits($text, $words)) {
                return $season;
            }
        }

        return null;
    }

    /** @return array<int, string> */
    private function detectOccasions(string $text): array
    {
        $found = [];

        foreach (self::OCCASION_WORDS as $word) {
            if ($this->hits($text, [$word])) {
                $found[] = $word;
            }
        }

        return array_slice(array_values(array_unique($found)), 0, 2);
    }

    private function matchesSeason(array $product, string $season): bool
    {
        $haystack = mb_strtolower($product['best_season'] . ' ' . $product['occasion_note']);

        return $haystack !== '' && mb_strpos($haystack, mb_strtolower($season)) !== false;
    }

    /** @param array<int, string> $occasions */
    private function matchesOccasion(array $product, array $occasions): bool
    {
        $haystack = mb_strtolower($product['occasion_note'] . ' ' . $product['best_season'] . ' ' . $product['description']);

        foreach ($occasions as $occasion) {
            $stem = rtrim(mb_strtolower($occasion), 's');

            if (mb_strpos($haystack, $stem) !== false) {
                return true;
            }
        }

        return false;
    }

    // -------------------------------------------------------- text machinery

    private function hits(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            // Phrases are matched anywhere in the sentence.
            if (mb_strpos($keyword, ' ') !== false) {
                if (mb_strpos($text, $keyword) !== false) {
                    return true;
                }

                continue;
            }

            // Short words must match whole ("hi" must not match "this"),
            // while longer words act as stems ("ship" should catch "shipping").
            $pattern = mb_strlen($keyword) <= 3
                ? '/\b' . preg_quote($keyword, '/') . '\b/u'
                : '/\b' . preg_quote($keyword, '/') . '/u';

            if (preg_match($pattern, $text) === 1) {
                return true;
            }
        }

        return false;
    }

    private function flatHits(string $text, string $flatPhrase): bool
    {
        if ($flatPhrase === '') {
            return false;
        }

        return preg_match('/\b' . preg_quote($flatPhrase, '/') . '\b/u', self::flat($text)) === 1;
    }

    private function wordCount(string $text): int
    {
        return count(array_filter(explode(' ', $text), static fn (string $word): bool => $word !== ''));
    }

    private static function normalise(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $text = str_replace(['’', '‘', '`'], "'", $text);
        $text = preg_replace('/\s+/u', ' ', $text) ?? $text;

        return trim($text);
    }

    /** Lowercase, accent-free, punctuation-free version for token matching. */
    private static function flat(string $text): string
    {
        $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        $ascii = $ascii === false ? $text : $ascii;
        $ascii = mb_strtolower($ascii);
        $ascii = preg_replace('/[^a-z0-9]+/u', ' ', $ascii) ?? $ascii;

        return trim(preg_replace('/\s+/', ' ', $ascii) ?? $ascii);
    }

    private static function cleanText(?string $value): string
    {
        return trim((string) $value);
    }

    /** Pull the upper number out of strings like "8–12 hours". */
    private static function parseHours(?string $value): int
    {
        if ($value === null || preg_match_all('/\d+/', $value, $matches) === 0) {
            return 0;
        }

        return max(array_map('intval', $matches[0]));
    }

    /** @return array<string, string> */
    private static function buildNoteIndex(): array
    {
        $index = [];

        foreach (NoteLibrary::allNoteNames() as $note) {
            $index[self::flat($note)] = $note;
        }

        return $index;
    }

    /**
     * FragranceGuide wants a raw product row; rebuild the essentials from the
     * presented product so layering ideas can be generated on demand.
     */
    private static function rawRow(array $product): array
    {
        return [
            'id'            => $product['id'],
            'sku'           => $product['sku'],
            'name'          => $product['name'],
            'house'         => $product['house'],
            'description'   => $product['description'],
            'category_id'   => 0,
            'category_slug' => $product['category']['slug'],
            'category_name' => $product['category']['name'],
            'gender'        => $product['gender'],
            'size_ml'       => $product['size_ml'],
            'price'         => $product['price'],
            'compare_at_price' => $product['compare_at_price'],
            'stock'         => $product['stock'],
            'top_notes'     => implode(', ', $product['notes']['top']),
            'heart_notes'   => implode(', ', $product['notes']['heart']),
            'base_notes'    => implode(', ', $product['notes']['base']),
            'color_a'       => $product['colors']['a'],
            'color_b'       => $product['colors']['b'],
            'shape'         => $product['colors']['shape'],
            'featured'      => $product['featured'] ? 1 : 0,
            'rating'        => $product['rating'],
            'review_count'  => $product['review_count'],
            'created_at'    => $product['created_at'],
            'tagline'       => $product['tagline'] ?? null,
            'story'         => null,
            'craft_notes'   => null,
            'longevity'     => $product['longevity'] ?? null,
            'sillage'       => $product['sillage'] ?? null,
            'best_season'   => $product['best_season'] ?? null,
            'occasion'      => $product['occasion_note'] ?? null,
        ];
    }
}
