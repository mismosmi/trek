<?php

require_once(PHP_ROOT.'php/SqlDb.inc.php');

/**
 * Handles ajax requests
 */
class RestApi extends SqlDb
{
    /**
     * Contents of config.json
     *
     * @var array
     */
    protected $config;
    /**
     * Holds name of currently selected table
     *
     * @var string
     */
    protected $tableName;
    /**
     * Holds table data
     *
     * @var array
     */
    protected $dbInfo;

    /**
     * Constructor
     * load config file
     * load table info from database definition
     *
     * @param string dbName         Name of the requested Database
     * @param string tableName      Name of the requested Table
     * @param string configFile     Path to config file
     */
    public function __construct($dbName = NULL, $configFile = NULL)
    {
        $dbname = $dbName ?: $_GET['db'];
        $this->config = empty($configFile)
            ? json_decode(file_get_contents(PHP_ROOT.'config.php'), true)
            : json_decode(file_get_contents(PHP_ROOT.$configFile), true);

        parent::__construct($this->config['database']);

        $this->dbInfo = json_decode(file_get_contents(PHP_ROOT.$this->config['pages'][$dbName]['path']), true);
    }

        
    /**
     * check if keys exists in table[col] to prevent sql injection attack
     *
     * @param string $tableName
     * @param array $data
     * @return array only entries where column name exists in $this->col
     */
    private function validateTableKeys($tableName, array $data)
    {
        $dataChecked = [];
        foreach ($this->tableInfo[$this->tableName]['columns'] as $col) {
            if (array_key_exists($col['name'], $data) && $col['class'] == 1) // Data Column
                $dataChecked[$col['name']] = $data[$col['name']];
        }
        return $dataChecked;
    }
    

    /**
     * process a database request
     * pass incoming request on to database access methods
     *
     * @param array $postData      POST data from Ajax as array ($_POST)
     * @return string answer from database
     */
    public function processRequest(array $postData = NULL)
    {
        $postData ?: $_POST;
        $ret = [];
        switch ($postData['operation']) {
        case 'INSERT':
            $ret = $this->dbInsert($postData['tablename'], $this->validateTableKeys($postData['tableName'],$postData['data']));
            break;
        case 'DELETE':
            $ret = $this->dbDelete($postData['tablename'], $postData['row']);
            break;
        case 'ALTER':
            $ret = $this->dbAlter($postData['tablename'], $postData['row'], $this->validateTableKeys($postData['tableName'],$postData['data']));
            break;
        }
        if ($postData['operation'] === "SELECT" || $ret['success']) {
            $thisTable = ['name' => $postData['tableName'], 'columns' => []];
            $joinTables = [];
            foreach ($this->dbInfo['tables'][$postData['tableName']]['columns'] as $col) {
                switch ($col['class']) {
                case 0: // Meta Column
                case 1: // Data Column
                    $thisTable['columns'][] = $col['name'];
                    break;
                case 3: // Foreign Key
                    $joinTable = ['name' => $col['table'], 'columns' => []];
                    foreach ($this->dbInfo['tables'][$col['table']]['columns'] as $fcol) {
                        switch ($fcol['class']) {
                        case 0: // Meta Column
                        case 1: // Data Column
                            $joinTables['columns'][] = $fcol['name'];
                        }
                    }
                    $joinTables[] = $joinTable;
                }
            }
            $since = empty($postData['lastUpdate']) 
                ? []
                : ["{$thisTable['name']}.timestamp >" => $postData['lastUpdate']];

            var_dump($joinTables);
            $ret = $this->dbSelectJoin($thisTable, $joinTables, $since);
            if (!$ret['success']) {
                if (empty($postData['lastUpdate'])) {
                    $create = $this->dbCreateTable($postData['tablename'], $this->tableInfo['tables'][$postData['tablename']]['columns']);
                    if ($create['success']) {
                        $ret = $this->dbSelectJoin($thisTable, $joinTables);
                        $ret['info'] = $create['info'];
                    }
                    else $ret['errormsg'] .= "\n".$create['errormsg'];
                } else $ret['errormsg'] = 
                    "Something went wrong: trying to refresh table \"{$thisTable['name']}\"";
            }
        }
        return json_encode($ret);
    }

}
        

