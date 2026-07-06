<?php

namespace App\Services;

class DataMasker
{
    /**
     * Mask a bank account number, showing only the last 4 digits.
     */
    public static function maskBankAccount(?string $accountNumber): ?string
    {
        if (empty($accountNumber)) {
            return $accountNumber;
        }

        if (strlen($accountNumber) <= 4) {
            return '****' . $accountNumber;
        }

        $lastFour = substr($accountNumber, -4);
        return str_repeat('*', strlen($accountNumber) - 4) . $lastFour;
    }

    /**
     * Mask PAN or Aadhaar, masking the middle characters.
     */
    public static function maskIdentityNumber(?string $idNumber): ?string
    {
        if (empty($idNumber)) {
            return $idNumber;
        }

        $length = strlen($idNumber);
        
        // For very short strings, just mask everything except first and last
        if ($length <= 4) {
            return str_pad(substr($idNumber, 0, 1), $length - 1, '*') . substr($idNumber, -1);
        }

        $firstTwo = substr($idNumber, 0, 2);
        $lastTwo = substr($idNumber, -2);
        
        return $firstTwo . str_repeat('*', $length - 4) . $lastTwo;
    }

    /**
     * Mask GSTIN, keeping first 2 and last 4 characters unmasked.
     */
    public static function maskGstin(?string $gstin): ?string
    {
        if (empty($gstin)) {
            return $gstin;
        }

        $length = strlen($gstin);

        if ($length <= 6) {
            return self::maskIdentityNumber($gstin);
        }

        $firstTwo = substr($gstin, 0, 2);
        $lastFour = substr($gstin, -4);
        
        return $firstTwo . str_repeat('*', $length - 6) . $lastFour;
    }
}
