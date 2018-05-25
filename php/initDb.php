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

$user = '';
if (array_key_exists("user", $dbInfo)) {
    switch ($dbInfo['user']) {
    case "simple":
        echo $db->dbCreateTable('trek_user', [[
            'name' => "username",
            'class' => 1,
            'type' => "username",
            'required' => true
        ]]);
        break;
    }
    $user = $dbInfo['user'];
}



foreach ($dbInfo['sheets'] as $name => $table) {
    $columns = array_key_exists("column_reference", $table) 
        ? $dbInfo['sheets'][$table['column_reference']]['columns']
        : $table['columns'];
    
    echo $db->dbCreateTable($name, $columns, $user)."\n";
}


