<?php

$files = array_merge(
    glob(__DIR__ . '/../tests/Feature/*Test.php'),
    glob(__DIR__ . '/../tests/Unit/*Test.php')
);

$total = 0;
$counts = [];

foreach ($files as $file) {
    $content = file_get_contents($file);
    // match public function test_ or /** @test */
    preg_match_all('/public\s+function\s+test_/', $content, $m1);
    preg_match_all('/\*\s*@test\s*\*/', $content, $m2);
    $c = count($m1[0]) + count($m2[0]);
    $counts[basename($file)] = $c;
    $total += $c;
}

ksort($counts);
foreach ($counts as $name => $c) {
    echo sprintf("%-50s: %d\n", $name, $c);
}

echo "--------------------------------------------------\n";
echo "TOTAL TESTS FOUND IN CODEBASE: {$total}\n";
