<?php

require_once('../php/page.inc.php');

$indexpage = new page();
$indexpage->name = 'index';
$indexpage->title = 'Home';

$pages = [
    $indexpage,
    ];

?>
