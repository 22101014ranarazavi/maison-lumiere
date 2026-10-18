<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Http;
use App\Response;
use App\Support\Chatbot;
use App\Validator;

/**
 * POST /api/chat — a single turn with the fragrance concierge.
 *
 * The bot is stateless: the widget keeps the visible transcript, the server
 * answers each message independently from the live catalogue.
 */
final class ChatController
{
    public function store(): void
    {
        $validator = new Validator(Http::body());
        $validator->text('message', 'Message', 1, 500);
        $validator->check();

        $message = (string) $validator->get('message');

        Response::success([
            'data' => Chatbot::boot()->respond($message),
        ]);
    }
}
