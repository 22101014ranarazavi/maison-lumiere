<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Database;
use App\Http;
use App\Response;
use App\Validator;

final class ContactController
{
    /** POST /api/contact — store a message from the contact form. */
    public function store(): void
    {
        $v = new Validator(Http::body());
        $v->text('name', 'Name', 2, 100)
            ->email('email')
            ->text('subject', 'Subject', 3, 150)
            ->text('message', 'Message', 10, 2000);
        $v->check();

        $stmt = Database::connection()->prepare(
            'INSERT INTO contacts (name, email, subject, message)
             VALUES (:name, :email, :subject, :message)'
        );
        $stmt->execute([
            'name'    => $v->get('name'),
            'email'   => $v->get('email'),
            'subject' => $v->get('subject'),
            'message' => $v->get('message'),
        ]);

        Response::success([
            'message' => 'Thank you for writing to us. Our concierge will reply within one business day.',
        ], 201);
    }
}
