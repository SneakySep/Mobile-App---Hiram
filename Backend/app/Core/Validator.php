<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Collect-then-throw input validation. Returns the cleaned values so the
 * controllers always work with correctly typed data.
 */
final class Validator
{
    /** @var array<string,string> */
    private array $errors = [];

    /** @var array<string,mixed> */
    private array $clean = [];

    public function __construct(private readonly array $data)
    {
    }

    public function required(string $key, ?string $label = null): self
    {
        $label ??= $key;
        $value = $this->data[$key] ?? null;

        if ($value === null || (is_string($value) && trim($value) === '') || $value === []) {
            $this->errors[$key] = "{$label} is required.";

            return $this;
        }

        return $this;
    }

    public function string(string $key, int $min = 0, int $max = 255, bool $required = true): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] ??= "{$key} is required.";
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        if (!is_string($value) && !is_numeric($value)) {
            $this->errors[$key] = "{$key} must be text.";

            return $this;
        }

        $value = trim((string) $value);
        $length = mb_strlen($value);

        if ($length < $min) {
            $this->errors[$key] = "{$key} must be at least {$min} characters.";

            return $this;
        }

        if ($length > $max) {
            $this->errors[$key] = "{$key} must be at most {$max} characters.";

            return $this;
        }

        $this->clean[$key] = $value;

        return $this;
    }

    public function email(string $key, bool $required = true): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || trim((string) $value) === '') {
            if ($required) {
                $this->errors[$key] = 'Email is required.';
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        $value = strtolower(trim((string) $value));
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$key] = 'Enter a valid email address.';

            return $this;
        }

        $this->clean[$key] = $value;

        return $this;
    }

    /**
     * Money. Accepts "1250.50", 1250.5 or 1250 and normalises to a
     * two-decimal string ready for a DECIMAL(12,2) column.
     */
    public function amount(string $key, bool $allowZero = false, bool $required = true): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'Amount is required.';
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        if (is_string($value)) {
            $value = str_replace([',', ' '], '', trim($value));
        }

        if (!is_numeric($value)) {
            $this->errors[$key] = 'Amount must be a number.';

            return $this;
        }

        $number = (float) $value;

        if ($number < 0 || (!$allowZero && $number === 0.0)) {
            $this->errors[$key] = $allowZero
                ? 'Amount cannot be negative.'
                : 'Amount must be greater than zero.';

            return $this;
        }

        if ($number > 9999999999.99) {
            $this->errors[$key] = 'Amount is too large.';

            return $this;
        }

        $this->clean[$key] = number_format($number, 2, '.', '');

        return $this;
    }
    /**
     * Date that must be YYYY-MM-DD (MySQL-friendly).
     */
    public function date(string $key, bool $required = false): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'Date is required.';
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        $value = substr(trim((string) $value), 0, 10);

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            $this->errors[$key] = 'Date must be in YYYY-MM-DD format.';

            return $this;
        }

        [$y, $m, $d] = array_map('intval', explode('-', $value));
        if (!checkdate($m, $d, $y)) {
            $this->errors[$key] = 'That date does not exist.';

            return $this;
        }

        $this->clean[$key] = $value;

        return $this;
    }

    /**
     * Datetime as ISO-8601, normalised to UTC "Y-m-d H:i:s" for storage.
     */
    public function dateTime(string $key, bool $required = false): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = 'Date/time is required.';
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        try {
            $date = new \DateTimeImmutable((string) $value, new \DateTimeZone(date_default_timezone_get()));
        } catch (\Exception) {
            $this->errors[$key] = 'Provide a valid date.';

            return $this;
        }

        // Stored in the server's local time so it lines up with NOW()/CURDATE().
        $this->clean[$key] = $date->setTimezone(new \DateTimeZone(date_default_timezone_get()))
            ->format('Y-m-d H:i:s');

        return $this;
    }

    public function integer(string $key, bool $required = false): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = "{$key} is required.";
            } else {
                $this->clean[$key] = null;
            }

            return $this;
        }

        if (!is_numeric($value)) {
            $this->errors[$key] = "{$key} must be a whole number.";

            return $this;
        }

        $this->clean[$key] = (int) $value;

        return $this;
    }

    /**
     * @param list<string> $allowed
     */
    public function oneOf(string $key, array $allowed, bool $required = false, ?string $default = null): self
    {
        $value = $this->data[$key] ?? null;

        if ($value === null || $value === '') {
            if ($required) {
                $this->errors[$key] = "{$key} is required.";
            } else {
                $this->clean[$key] = $default;
            }

            return $this;
        }

        $value = strtolower(trim((string) $value));
        if (!in_array($value, $allowed, true)) {
            $this->errors[$key] = "{$key} must be one of: " . implode(', ', $allowed) . '.';

            return $this;
        }

        $this->clean[$key] = $value;

        return $this;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /**
     * @return array<string,mixed> Cleaned values, throwing if anything failed.
     */
    public function validate(): array
    {
        if ($this->fails()) {
            throw ApiException::validation($this->errors);
        }

        return $this->clean;
    }

    /**
     * @return array<string,string>
     */
    public function errors(): array
    {
        return $this->errors;
    }
}

