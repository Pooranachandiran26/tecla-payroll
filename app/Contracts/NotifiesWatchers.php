<?php

namespace App\Contracts;

interface NotifiesWatchers
{
    /**
     * The category this notification belongs to (e.g. 'client', 'employee').
     */
    public function watcherCategory(): string;

    /**
     * The subject line of the email.
     */
    public function watcherSubject(): string;

    /**
     * Plain-text or HTML body describing what happened.
     */
    public function watcherSummary(): string;

    /**
     * A deep link back into the admin UI, if applicable.
     */
    public function watcherContextUrl(): ?string;
}
