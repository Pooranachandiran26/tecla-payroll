<?php

require __DIR__ . '/../vendor/autoload.php';

$testFiles = glob(__DIR__ . '/../tests/Feature/*.php');
$testFiles = array_merge($testFiles, glob(__DIR__ . '/../tests/Feature/**/*.php'));
$testFiles = array_merge($testFiles, glob(__DIR__ . '/../tests/Unit/*.php'));

$totalTests = 0;
$fileCounts = [];

foreach ($testFiles as $file) {
    $content = file_get_contents($file);
    preg_match_all('/public function (test_\w+|it_\w+)/', $content, $matches);
    $count = count($matches[0]);
    $relPath = str_replace(realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR, '', realpath($file));
    $fileCounts[$relPath] = $count;
    $totalTests += $count;
}

ksort($fileCounts);

echo "=== COMPLETE TEST FILE & METHOD ACCOUNTING ===\n";
foreach ($fileCounts as $file => $count) {
    echo sprintf("%-60s : %d tests\n", $file, $count);
}
echo "------------------------------------------------------------\n";
echo "TOTAL TEST METHODS COUNTED ACROSS ALL FILES: {$totalTests}\n";
