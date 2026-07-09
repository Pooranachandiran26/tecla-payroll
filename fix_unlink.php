<?php
$c = file_get_contents('app/Http/Controllers/BulkUploadController.php');
$c = str_replace('unlink($fullPath);', '@unlink($fullPath);', $c);
file_put_contents('app/Http/Controllers/BulkUploadController.php', $c);
