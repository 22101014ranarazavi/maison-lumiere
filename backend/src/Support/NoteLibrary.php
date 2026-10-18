<?php

declare(strict_types=1);

namespace App\Support;

/**
 * A small olfactory dictionary. Every note used by the catalogue is described
 * here so the guide pages and the chatbot can explain a fragrance in words.
 */
final class NoteLibrary
{
    public const FAMILY_LABELS = [
        'citrus'    => 'Citrus',
        'aromatic'  => 'Aromatic',
        'floral'    => 'Floral',
        'fruity'    => 'Fruity',
        'spicy'     => 'Spice',
        'woody'     => 'Wood',
        'resinous'  => 'Resin & Amber',
        'gourmand'  => 'Gourmand',
        'musk'      => 'Musk',
        'marine'    => 'Marine',
        'green'     => 'Green',
        'leather'   => 'Leather',
    ];

    /** note name => [family, mood, description] */
    public const NOTES = [
        // --- citrus ---------------------------------------------------------
        'Bergamot'        => ['citrus', 'Luminous', 'Cold-pressed peel from Calabria: bitter-sweet, faintly floral, endlessly bright.'],
        'Sicilian Lemon'  => ['citrus', 'Vivacious', 'Sharp, sun-warmed lemon oil with a clean, almost effervescent edge.'],
        'Grapefruit'      => ['citrus', 'Sparkling', 'Zesty and slightly bitter — it lifts heavy formulas without turning them sour.'],
        'Mandarin'        => ['citrus', 'Sunny', 'Softer and rounder than orange, with a faint sweetness and no bitterness.'],
        'Green Mandarin'  => ['citrus', 'Crisp', 'Picked unripe: greener, sharper and more acidic than the ripe fruit.'],
        'Lime'            => ['citrus', 'Tart', 'Bracing and slightly bitter, the coldest of the citrus family.'],
        'Neroli'          => ['citrus', 'Refined', 'Distilled orange blossom — honeyed, green and quietly expensive-smelling.'],
        'Petitgrain'      => ['citrus', 'Green', 'Steam-distilled from bitter-orange leaves: woody, herbal and dry.'],

        // --- aromatic / herbal ----------------------------------------------
        'Mint'            => ['aromatic', 'Cooling', 'Cold, clean and bracing — a splash of shade in a warm composition.'],
        'Basil'           => ['aromatic', 'Herbal', 'Sweet green herb, faintly aniseed; the scent of a crushed leaf.'],
        'Sage'            => ['aromatic', 'Dry', 'Camphoraceous and mineral, like scrubland after rain.'],
        'Geranium'        => ['aromatic', 'Rosy', 'A leaf that smells of rose and mint at once — brisk and old-fashioned.'],

        // --- floral ---------------------------------------------------------
        'Rose Absolute'   => ['floral', 'Opulent', 'Solvent-extracted rose: jammy, honeyed and far richer than the flower itself.'],
        'Turkish Rose'    => ['floral', 'Romantic', 'The reference rose — velvety petals with a peppery, slightly waxy depth.'],
        'Garden Rose'     => ['floral', 'Fresh', 'Greener and lighter than absolute: petals still attached to the stem.'],
        'Jasmine'         => ['floral', 'Narcotic', 'Sweet, indolic and animalic in the best way — the classic floral narcotic.'],
        'Peony'           => ['floral', 'Airy', 'Pink, watery and slightly rosy; a sheer floral without weight.'],
        'Lily'            => ['floral', 'Radiant', 'Cool, waxy and slightly green; it carries across a room without shouting.'],
        'Freesia'         => ['floral', 'Dewy', 'Small peppery blossoms with a clean, almost soapy transparency.'],
        'Magnolia'        => ['floral', 'Creamy', 'Big waxy petals with lemon and vanilla running through them.'],
        'Vanilla Orchid'  => ['floral', 'Creamy', 'Floral rather than edible: soft petals over a whisper of vanilla.'],
        'Orris'           => ['floral', 'Powdery', 'Iris root aged three years — suede-like, cool, the most elegant powder in perfumery.'],

        // --- fruity ---------------------------------------------------------
        'Pear'            => ['fruity', 'Juicy', 'Crisp and watery with a faint musky skin note.'],
        'Lychee'          => ['fruity', 'Exotic', 'Rose-like and syrupy, with a tart edge that keeps sweetness honest.'],
        'Green Apple'     => ['fruity', 'Tart', 'Sharp and acidic; it gives a composition a cool, just-cut freshness.'],
        'Fig Nectar'      => ['fruity', 'Milky', 'Jammy fig flesh with a coconut-cream softness.'],
        'Fig Leaf'        => ['green', 'Shady', 'Green, sappy and slightly bitter — the whole tree, not just the fruit.'],

        // --- spice ----------------------------------------------------------
        'Saffron'         => ['spicy', 'Luxurious', 'Leathery, metallic and honeyed; a single thread scents a whole room.'],
        'Pink Pepper'     => ['spicy', 'Bright', 'Rosy and effervescent rather than hot — a sparkle, not a burn.'],
        'Black Pepper'    => ['spicy', 'Assertive', 'Dry, pungent and clean; it sharpens sweet or resinous formulas.'],
        'Cardamom'        => ['spicy', 'Polished', 'Cool green spice with eucalyptus and citrus facets.'],
        'Cinnamon'        => ['spicy', 'Warm', 'Sweet bark heat; comforting in winter, risky in quantity.'],
        'Nutmeg'          => ['spicy', 'Cosy', 'Woody, faintly sweet spice that reads as warmth rather than food.'],

        // --- woods ----------------------------------------------------------
        'Cedar'           => ['woody', 'Crisp', 'Dry pencil-shaving wood, clean and slightly camphoraceous.'],
        'Cedarwood'       => ['woody', 'Structured', 'A firmer, warmer cedar; the backbone of countless classic formulas.'],
        'White Cedar'     => ['woody', 'Soft', 'Pale, creamy wood — cedar with the edges sanded off.'],
        'Sandalwood'      => ['woody', 'Creamy', 'Milky, sweet and meditative; the most soothing wood in the palette.'],
        'Vetiver'         => ['woody', 'Earthy', 'Smoky roots with grapefruit and damp soil facets — grounding and dry.'],
        'Guaiac Wood'     => ['woody', 'Smoky', 'Tar-like and dark, with a tea-like smokiness that reads as incense.'],
        'Blond Woods'     => ['woody', 'Neutral', 'A soft composite of pale woods — clean, quiet and endlessly wearable.'],
        'Driftwood'       => ['woody', 'Salty', 'Weathered wood bleached by sea air: dry, mineral and slightly grey.'],
        'Patchouli'       => ['woody', 'Earthy', 'Damp, dark and camphoraceous when raw; velvety and chocolatey when aged.'],
        'Birch'           => ['leather', 'Tarry', 'Birch tar — smoked, phenolic and unmistakably leather-adjacent.'],
        'Moss'            => ['green', 'Forest', 'Cool, damp undergrowth; it gives a composition the smell of shade.'],
        'Elemi'           => ['resinous', 'Peppery', 'A soft resin with lemon and pepper facets; incense before it turns smoky.'],

        // --- resin, amber, incense -----------------------------------------
        'Amber'           => ['resinous', 'Golden', 'A warm accord of labdanum and vanilla — sweet, glowing and enveloping.'],
        'Labdanum'        => ['resinous', 'Sticky', 'Dark, leathery resin with honeyed and ambergris-like depth.'],
        'Incense'         => ['resinous', 'Meditative', 'Cold church smoke: dry, austere and quietly spiritual.'],
        'Oud'             => ['woody', 'Majestic', 'Resinous agarwood — animalic, smoky and medicinal. Unmistakable.'],
        'Ambergris'       => ['marine', 'Animalic', 'Salty-sweet and skin-like, the great fixative of the sea.'],
        'Tobacco'         => ['leather', 'Dusky', 'Sweet cured leaf with hay, honey and smoke; never actually ashtray.'],
        'Leather'         => ['leather', 'Supple', 'Tanned hide with birch, smoke and a soft animal warmth.'],
        'Suede'           => ['leather', 'Soft', 'The plush side of leather: powdery, muted and expensive.'],

        // --- gourmand -------------------------------------------------------
        'Vanilla'         => ['gourmand', 'Comforting', 'Bourbon vanilla — creamy, boozy and slightly smoky from the pod.'],
        'Tonka'           => ['gourmand', 'Nutty', 'Tonka bean: almond, hay and vanilla rolled into one.'],
        'Praline'         => ['gourmand', 'Indulgent', 'Burnt sugar and toasted nuts; dessert in fragrance form.'],
        'Caramel'         => ['gourmand', 'Toasted', 'Cooked sugar with a bitter edge — richer and less childlike than candy.'],
        'Honey'           => ['gourmand', 'Lush', 'Thick floral sweetness with a faint beeswax and animal hum.'],

        // --- musk -----------------------------------------------------------
        'Musk'            => ['musk', 'Skin-like', 'Soft animal warmth that blurs the edges of a composition.'],
        'White Musk'      => ['musk', 'Clean', 'The freshly-laundered reading of musk: bright, powdery and polite.'],
        'Clean Musk'      => ['musk', 'Airy', 'Almost transparent musk — the smell of cotton and warm skin.'],

        // --- marine ---------------------------------------------------------
        'Sea Salt'        => ['marine', 'Bracing', 'Mineral and saline, like spray drying on warm stone.'],
        'Seaweed'         => ['marine', 'Iodised', 'Green, salty and faintly medicinal — the sea at low tide.'],

        // --- green / tea ----------------------------------------------------
        'White Tea'       => ['green', 'Tranquil', 'Dry leaves and steam: pale, tannic and calming.'],
        'Violet Leaf'     => ['green', 'Cool', 'Green and watery with a metallic cucumber edge.'],
    ];

    public static function describe(string $note): array
    {
        $clean = trim($note);

        if (isset(self::NOTES[$clean])) {
            [$family, $mood, $description] = self::NOTES[$clean];

            return [
                'name'        => $clean,
                'family'      => $family,
                'family_label' => self::FAMILY_LABELS[$family] ?? 'Note',
                'mood'        => $mood,
                'description' => $description,
            ];
        }

        // Try a case-insensitive / partial match before falling back.
        foreach (self::NOTES as $name => $entry) {
            if (mb_stripos($clean, $name) !== false || mb_stripos($name, $clean) !== false) {
                return [
                    'name'        => $clean,
                    'family'      => $entry[0],
                    'family_label' => self::FAMILY_LABELS[$entry[0]] ?? 'Note',
                    'mood'        => $entry[1],
                    'description' => $entry[2],
                ];
            }
        }

        return [
            'name'        => $clean,
            'family'      => 'other',
            'family_label' => 'Note',
            'mood'        => 'Distinctive',
            'description' => "A signature ingredient of this composition, used to give it its particular character.",
        ];
    }

    /**
     * Explain a product's three note layers.
     *
     * @param array{top: string[], heart: string[], base: string[]} $notes
     */
    public static function explainLayers(array $notes): array
    {
        $layers = [
            'top'   => ['title' => 'Top notes', 'hint' => 'The first fifteen minutes on skin'],
            'heart' => ['title' => 'Heart notes', 'hint' => 'The character you wear for most of the day'],
            'base'  => ['title' => 'Base notes', 'hint' => 'What lingers on skin and fabric by evening'],
        ];

        $explained = [];

        foreach ($layers as $key => $meta) {
            $explained[$key] = [
                'key'   => $key,
                'title' => $meta['title'],
                'hint'  => $meta['hint'],
                'notes' => array_map([self::class, 'describe'], $notes[$key] ?? []),
            ];
        }

        return $explained;
    }

    /** Families present on a product, most common first. */
    public static function familiesOf(array $notes): array
    {
        $counts = [];

        foreach ($notes as $note) {
            $family = self::describe((string) $note)['family'];
            $counts[$family] = ($counts[$family] ?? 0) + 1;
        }

        arsort($counts);

        return array_keys($counts);
    }

    public static function allNoteNames(): array
    {
        return array_keys(self::NOTES);
    }
}
