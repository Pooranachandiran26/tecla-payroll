<?php

namespace App\Services\Reports;

use App\Models\User;
use App\Services\DataMasker;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Abstract Base Class for all Report Services.
 * Enforces unified PII masking, date-range handling, scoping, pagination, and CSV streaming.
 */
abstract class BaseReportService
{
    protected array $defaultPiiFields = [
        'bank_account_number',
        'bank_ifsc',
        'pan_number',
        'aadhaar_number',
        'uan_number',
        'esic_number',
    ];

    /**
     * Fetch raw report data as a Collection of associative arrays.
     */
    abstract public function getData(array $filters, User $user): Collection;

    /**
     * Column headers mapping key => Header Title.
     */
    abstract public function getColumns(): array;

    /**
     * Unique machine key for report.
     */
    abstract public function getReportKey(): string;

    /**
     * Parse date range from filters array.
     */
    protected function parseDateRange(array $filters): array
    {
        $from = isset($filters['from']) && !empty($filters['from'])
            ? Carbon::parse($filters['from'])->startOfDay()
            : Carbon::now()->startOfYear();

        $to = isset($filters['to']) && !empty($filters['to'])
            ? Carbon::parse($filters['to'])->endOfDay()
            : Carbon::now()->endOfDay();

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
        }

        return compact('from', 'to');
    }

    /**
     * Parse single month filter.
     */
    protected function parseMonth(array $filters, string $key = 'month'): ?string
    {
        if (empty($filters[$key])) {
            return null;
        }
        return Carbon::parse($filters[$key])->startOfMonth()->toDateString();
    }

    /**
     * Parse integer filter.
     */
    protected function parseId(array $filters, string $key): ?int
    {
        $val = $filters[$key] ?? null;
        return ($val !== null && $val !== '') ? (int) $val : null;
    }

    /**
     * Sanitize a single row for PII protection.
     * Admin gets raw values.
     * Manager gets masked values via DataMasker.
     */
    public function sanitizeRow(array $row, User $user, array $piiFields = []): array
    {
        if ($user->role === 'admin') {
            return $row;
        }

        $fields = !empty($piiFields) ? $piiFields : $this->defaultPiiFields;

        foreach ($fields as $field) {
            if (!array_key_exists($field, $row) || is_null($row[$field])) {
                continue;
            }

            $row[$field] = match ($field) {
                'bank_account_number'  => DataMasker::maskBankAccount((string)$row[$field]),
                'pan_number'           => DataMasker::maskIdentityNumber((string)$row[$field]),
                'aadhaar_number'       => DataMasker::maskIdentityNumber((string)$row[$field]),
                'uan_number', 'esic_number', 'esi_number' => DataMasker::maskBankAccount((string)$row[$field]),
                default                => DataMasker::maskBankAccount((string)$row[$field]),
            };
        }

        return $row;
    }

    /**
     * Apply PII masking over a Collection.
     */
    public function sanitizeCollection(Collection $rows, User $user, array $piiFields = []): Collection
    {
        return $rows->map(fn(array $row) => $this->sanitizeRow($row, $user, $piiFields));
    }

    /**
     * Paginate collection.
     */
    protected function paginate(Collection $items, int $perPage, int $page): array
    {
        $total  = $items->count();
        $offset = ($page - 1) * $perPage;
        $sliced = $items->slice($offset, $perPage)->values();

        return [
            'data' => $sliced,
            'meta' => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / max($perPage, 1)),
                'from'         => $total > 0 ? $offset + 1 : 0,
                'to'           => min($offset + $perPage, $total),
            ],
        ];
    }

    /**
     * Convert Collection to CSV string.
     */
    public function toCsv(Collection $rows): string
    {
        $columns = $this->getColumns();
        $headers = array_values($columns);
        $keys    = array_keys($columns);

        $output = fopen('php://temp', 'r+');
        fwrite($output, "\xEF\xBB\xBF"); // UTF-8 BOM
        fputcsv($output, $headers);

        foreach ($rows as $row) {
            $csvRow = array_map(fn($key) => $row[$key] ?? '', $keys);
            fputcsv($output, $csvRow);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }

    /**
     * Stream CSV download response.
     */
    public function csvDownloadResponse(Collection $rows, string $filename): StreamedResponse
    {
        $csv = $this->toCsv($rows);

        return response()->streamDownload(
            fn() => print($csv),
            $filename . '.csv',
            [
                'Content-Type'        => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
            ]
        );
    }

    /**
     * Execute full JSON pipeline: getData -> sanitize -> paginate.
     */
    public function run(array $filters, User $user): array
    {
        $rows    = $this->getData($filters, $user);
        $rows    = $this->sanitizeCollection($rows, $user);
        $perPage = isset($filters['per_page']) && is_numeric($filters['per_page']) ? (int) $filters['per_page'] : 10;
        $page    = isset($filters['page']) && is_numeric($filters['page']) ? (int) $filters['page'] : 1;

        return $this->paginate($rows, $perPage, $page);
    }

    /**
     * Execute full export pipeline: getData -> sanitize.
     */
    public function runForExport(array $filters, User $user): Collection
    {
        $rows = $this->getData($filters, $user);
        return $this->sanitizeCollection($rows, $user);
    }
}
