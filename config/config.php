<?php

require_once('../php/configuration.inc.php');

$config = new configuration();

$config->default_js = [
    'jquery.min.js',
    'bootstrap.min.js',
    'main.css',
    ];

$config->default_css = [
    'bootstrap.min.css',
    'main.css'
    ];

$config->favicon = 'logo.ico';

$config->author = 'Michel Smola';

$config->description = 'Trek - simple inventory management';

?>

