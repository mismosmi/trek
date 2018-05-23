<?php
define('PHP_ROOT', '../');

require_once(PHP_ROOT.'php/SqlDb.inc.php');

$target = $argv[1];
$configFile = empty($argv[2]) ? PHP_ROOT."config.json" : $argv[2];

$config = empty($argv[2])
    ? json_decode(file_get_contents(PHP_ROOT.'config.json'), true)
    : json_decode(file_get_contents(PHP_ROOT.$argv[2]), true);

if (
    !array_key_exists($argv[1], $config['pages']) || 
    $config['pages'][$argv[1]]['type'] !== "database"
) die('please specify a correct config file and database name');

$db = new SqlDb($config['database']);

$dbInfo = json_decode(file_get_contents(PHP_ROOT.$config['pages'][$argv[1]]['path']), true);

foreach ($dbInfo['tables'] as $name => $table) {
    $columns = array_key_exists("column_reference", $table) 
        ? $dbInfo['tables'][$table['column_reference']]['columns']
        : $table['columns'];
    echo $db->dbCreateTable($name, $columns)."\n";
}


