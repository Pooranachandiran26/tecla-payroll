<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SystemWatcherNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $category;
    public $subjectText;
    public $summary;
    public $contextUrl;

    /**
     * Create a new message instance.
     */
    public function __construct(string $category, string $subjectText, string $summary, ?string $contextUrl)
    {
        $this->category = $category;
        $this->subjectText = $subjectText;
        $this->summary = $summary;
        $this->contextUrl = $contextUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '[' . strtoupper($this->category) . '] ' . $this->subjectText,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.watcher-notification',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
