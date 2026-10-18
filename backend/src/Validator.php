<?php

declare(strict_types=1);

namespace App;

/**
 * Small fluent validator for JSON API payloads.
 *
 *   $v = new Validator(Http::body());
 *   $v->text('name', 'Name', 2, 100)->email('email');
 *   $v->check();                 // responds 422 and exits when invalid
 *   $name = $v->get('name');     // trimmed, cleaned value
 */
final class Validator
{
    private array $errors = [];
    private array $clean = [];

    public function __construct(private array $input)
    {
    }

    public function text(string $field, string $label, int $min = 1, int $max = 255): self
    {
        $value = $this->input[$field] ?? '';
        $value = is_string($value) ? trim($value) : '';

        if (mb_strlen($value) < $min) {
            $this->errors[$field] = $min === 1
                ? "{$label} is required."
                : "{$label} must be at least {$min} characters.";
            return $this;
        }

        if (mb_strlen($value) > $max) {
            $this->errors[$field] = "{$label} must be at most {$max} characters.";
            return $this;
        }

        $this->clean[$field] = $value;

        return $this;
    }

    public function optionalText(string $field, string $label, int $max = 255): self
    {
        $value = $this->input[$field] ?? '';

        if ($value === null || (is_string($value) && trim($value) === '')) {
            $this->clean[$field] = null;
            return $this;
        }

        if (!is_string($value) || mb_strlen(trim($value)) > $max) {
            $this->errors[$field] = "{$label} must be at most {$max} characters.";
            return $this;
        }

        $this->clean[$field] = trim($value);

        return $this;
    }

    public function email(string $field, string $label = 'Email'): self
    {
        $this->text($field, $label, 5, 190);

        if (!isset($this->errors[$field]) && !filter_var($this->clean[$field] ?? '', FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = 'Please enter a valid email address.';
        }

        return $this;
    }

    /** One of a fixed list of allowed values. */
    public function oneOf(string $field, string $label, array $allowed): self
    {
        $value = $this->input[$field] ?? '';

        if (!is_string($value) || !in_array($value, $allowed, true)) {
            $this->errors[$field] = "{$label} must be one of: " . implode(', ', $allowed) . '.';
            return $this;
        }

        $this->clean[$field] = $value;

        return $this;
    }

    /** Numeric value inside an inclusive range. */
    public function number(string $field, string $label, float $min, float $max): self
    {
        $value = $this->input[$field] ?? null;

        if ($value === null || $value === '' || !is_numeric($value)) {
            $this->errors[$field] = "{$label} must be a number.";
            return $this;
        }

        $number = (float) $value;

        if ($number < $min || $number > $max) {
            $this->errors[$field] = "{$label} must be between {$min} and {$max}.";
            return $this;
        }

        $this->clean[$field] = $number;

        return $this;
    }

    /** Numeric value that may be left empty (stored as null). */
    public function optionalNumber(string $field, string $label, float $min, float $max): self
    {
        $value = $this->input[$field] ?? null;

        if ($value === null || $value === '') {
            $this->clean[$field] = null;
            return $this;
        }

        return $this->number($field, $label, $min, $max);
    }

    public function integer(string $field, string $label, int $min, int $max): self
    {
        $this->number($field, $label, $min, $max);

        if (!isset($this->errors[$field])) {
            $this->clean[$field] = (int) round((float) $this->clean[$field]);
        }

        return $this;
    }

    public function boolean(string $field, string $label): self
    {
        $value = $this->input[$field] ?? null;

        if (is_bool($value)) {
            $this->clean[$field] = $value ? 1 : 0;
            return $this;
        }

        if (in_array($value, [0, 1, '0', '1', 'true', 'false', 'on', 'off'], true)) {
            $this->clean[$field] = in_array($value, [1, '1', 'true', 'on'], true) ? 1 : 0;
            return $this;
        }

        $this->errors[$field] = "{$label} must be true or false.";

        return $this;
    }

    /** Reject a value that failed an ad-hoc check (e.g. a hex colour). */
    public function reject(string $field, string $message): self
    {
        $this->errors[$field] = $message;

        return $this;
    }

    public function fails(string $field): bool
    {
        return isset($this->errors[$field]);
    }

    public function raw(string $field, mixed $default = null): mixed
    {
        return $this->input[$field] ?? $default;
    }

    /** Abort with 422 when any rule failed. */
    public function check(): void
    {
        if ($this->errors !== []) {
            Response::error('Please fix the highlighted fields.', 422, $this->errors);
        }
    }

    public function get(string $field, mixed $default = null): mixed
    {
        return $this->clean[$field] ?? $default;
    }
}
