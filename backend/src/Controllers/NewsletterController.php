<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http;
use App\Response;
use App\Validator;

final class NewsletterController
{
    /** POST /api/newsletter — subscribe an email address. */
    public function store(): void
    {
        $v = new Validator(Http::body());
        $v->email('email');
        $v->check();

        $email = $v->get('email');

        $existsStmt = Database::connection()->prepare(
            'SELECT id FROM newsletter_subscribers WHERE email = :email'
        );
        $existsStmt->execute(['email' => $email]);

        if ($existsStmt->fetch() !== false) {
            Response::success(['message' => 'You are already on the list — welcome back.']);
        }

        $stmt = Database::connection()->prepare(
            'INSERT INTO newsletter_subscribers (email) VALUES (:email)'
        );
        $stmt->execute(['email' => $email]);

        Response::success(['message' => 'Welcome to the circle. Your first letter arrives soon.'], 201);
    }
}
