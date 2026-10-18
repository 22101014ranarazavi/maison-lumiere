<?php

declare(strict_types=1);

namespace App;

/**
 * Stateless admin authentication.
 *
 * The admin key lives in backend/.env (ADMIN_KEY). Exchanging it for a signed
 * token means the key itself is only ever sent once, over the login call.
 */
final class Auth
{
    private const DEFAULT_TTL = 43200; // 12 hours

    public static function key(): string
    {
        $config = require dirname(__DIR__) . '/config.php';

        return (string) $config['admin_key'];
    }

    public static function checkKey(string $candidate): bool
    {
        return $candidate !== '' && hash_equals(self::key(), $candidate);
    }

    public static function issue(int $ttl = self::DEFAULT_TTL): array
    {
        $expiresAt = time() + $ttl;
        $payload = self::base64UrlEncode((string) json_encode(['exp' => $expiresAt]));

        return [
            'token'      => $payload . '.' . self::signature($payload),
            'expires_at' => $expiresAt,
        ];
    }

    /** Abort with 401 unless the request carries a valid admin token. */
    public static function verify(): void
    {
        $token = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '';

        if (!is_string($token) || !str_contains($token, '.')) {
            Response::error('Admin authentication required.', 401);
        }

        [$payload, $signature] = explode('.', $token, 2);

        if (!hash_equals(self::signature($payload), $signature)) {
            Response::error('Invalid admin session. Please sign in again.', 401);
        }

        $decoded = json_decode(self::base64UrlDecode($payload), true);

        if (!is_array($decoded) || (int) ($decoded['exp'] ?? 0) < time()) {
            Response::error('Your admin session expired. Please sign in again.', 401);
        }
    }

    private static function signature(string $payload): string
    {
        return self::base64UrlEncode(hash_hmac('sha256', $payload, self::key(), true));
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return (string) base64_decode(strtr($value, '-_', '+/') . str_repeat('=', (4 - strlen($value) % 4) % 4));
    }
}
