<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ClientInvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public Invoice $invoice;
    public string $pdfBytes;

    /**
     * Create a new message instance.
     */
    public function __construct(Invoice $invoice, string $pdfBytes)
    {
        $this->invoice = $invoice;
        $this->pdfBytes = $pdfBytes;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $companyName = $this->invoice->client->company_name ?? 'Client';
        $invoiceNumber = $this->invoice->invoice_number ?? 'Invoice';

        return new Envelope(
            subject: "Tax Invoice - {$invoiceNumber} | {$companyName}",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: "<p>Dear Customer,</p><p>Please find attached Tax Invoice <strong>{$this->invoice->invoice_number}</strong> for your review and payment processing.</p><p>Thank you for your business!</p>",
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $filename = "Invoice_{$this->invoice->invoice_number}.pdf";

        return [
            Attachment::fromData(fn() => $this->pdfBytes, $filename)
                ->withMime('application/pdf'),
        ];
    }
}
