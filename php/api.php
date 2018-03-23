<?php
define('PHP_ROOT', '../');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
require_once(PHP_ROOT.'php/RestApi.inc.php');
$api = new RestApi($_GET['db']);
echo $api->processRequest($_POST);
