<?php

namespace Tests\Feature;

use Tests\TestCase;

class DataTableRegressionTest extends TestCase
{
    /**
     * Test that DataTable.jsx supports both label/key/render and header/accessor/cell conventions.
     */
    public function test_datatable_supports_both_conventions()
    {
        $filePath = base_path('resources/js/Components/ui/DataTable/DataTable.jsx');
        $this->assertFileExists($filePath);

        $content = file_get_contents($filePath);

        // Assert header / label support
        $this->assertTrue(
            str_contains($content, 'col.label') && str_contains($content, 'col.header'),
            'DataTable.jsx must support both col.label and col.header for column titles.'
        );

        // Assert key / accessor support
        $this->assertTrue(
            str_contains($content, 'col.key') && str_contains($content, 'col.accessor'),
            'DataTable.jsx must support both col.key and col.accessor for keys.'
        );

        // Assert render / cell support
        $this->assertTrue(
            str_contains($content, 'col.render') && str_contains($content, 'col.cell'),
            'DataTable.jsx must support both col.render and col.cell for custom rendering.'
        );

        // Compile component using esbuild
        $compileCmd = 'powershell -ExecutionPolicy Bypass -Command "npx esbuild resources/js/Components/ui/DataTable/DataTable.jsx --bundle --platform=node --format=cjs --external:react --outfile=tests/js/DataTable.compiled.cjs"';
        exec($compileCmd, $compileOutput, $compileExitCode);
        $this->assertEquals(0, $compileExitCode, 'esbuild compilation of DataTable.jsx failed: ' . implode("\n", $compileOutput));

        // Run the JS test runner containing React virtual DOM assertions
        $runCmd = 'powershell -ExecutionPolicy Bypass -Command "node tests/js/DataTableTest.cjs"';
        exec($runCmd, $runOutput, $runExitCode);
        $this->assertEquals(0, $runExitCode, 'JS rendering assertions failed: ' . implode("\n", $runOutput));
    }
}

