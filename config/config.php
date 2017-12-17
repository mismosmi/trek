<?php

require_once('php/configuration.inc.php');
$config = new configuration();


$config->default_js = [
    'jquery-3.2.1.min.js',
    'popper.min.js',
    'bootstrap.min.js',
    'main.js',
    ];

$config->default_css = [
    'bootstrap.min.css',
    'main.css'
    ];

$config->favicon = 'logo.ico';

$config->author = 'Michel Smola';

$config->title = 'TREK';

$config->description = 'Trek - simple inventory management';

$config->pages = array(
    array(
        'file'=>'index.php',
        'title'=>'Home',
    ),
    array(
        'file'=>'dbtest.php',
        'title'=>'Database Test',
    ),
);


?>

