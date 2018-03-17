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
        foreach ($this->dbInfo['tables'][$tableName]['columns'] as $col) {
            switch ($col['class']) {
            case 1: // Data Column
                if (array_key_exists($col['name'], $data))
                    $dataChecked[$col['name']] = $data[$col['name']];
                break;
            case 3: // Foreign Key
                $name = "{$col['table']}_id";
                if (array_key_exists($name, $data)) 
                    $dataChecked[$name] = $data[$name];
                break;
            }
        }
        return $dataChecked;
    }
    

    /*[Ma*
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
            foreach ($postData['data'] as $row) {
                $ret = $this->dbInsert($postData['tableName'], $this->validateTableKeys($postData['tableName'], $row));
                if (!$ret['success']) break;
            }
            break;
        case 'DELETE':
            foreach ($postData['rows'] as $rowId) {
                $ret = $this->dbAlter($postData['tableName'], $rowId, ['deleted' => true]);
                if (!$ret['success']) break;
            }
            break;
        case 'ALTER':
            foreach ($postData['data'] as $row) {
                $ret = $this->dbAlter($postData['tableName'], $row['id'], $this->validateTableKeys($postData['tableName'], $row));
                if (!$ret['success']) break;
            }
            break;
        }
        $time = date('Y-m-d G:i:s');
        if ($postData['operation'] === "SELECT" || $ret['success']) {
            $thisTable = ['name' => $postData['tableName'], 'columns' => []];
            $joinTables = [];
            foreach ($this->dbInfo['tables'][$postData['tableName']]['columns'] as $col) {
                switch ($col['class']) {
                case 1: // Data Column
                    $thisTable['columns'][] = $col['name'];
                    break;
                case 3: // Foreign Key
                    $joinTable = ['name' => $col['table'], 'columns' => []];
                    foreach ($this->dbInfo['tables'][$col['table']]['columns'] as $fcol) {
                        switch ($fcol['class']) {
                        case 1: // Data Column
                            $joinTable['columns'][] = $fcol['name'];
                        }
                    }
                    $joinTables[] = $joinTable;
                }
            }
            $where = empty($postData['lastUpdate']) 
                ? ["{$thisTable['name']}.deleted = 0"]
                : ["{$thisTable['name']}.timestamp > {$postData['lastUpdate']}"];

            $ret = $this->dbSelectJoin($thisTable, $joinTables, $where);
            if (!$ret['success']) {
                if (empty($postData['lastUpdate'])) {
                    $create = $this->dbCreateTable($postData['tableName'], $this->dbInfo['tables'][$postData['tableName']]['columns']);
                    if ($create['success']) {
                        $ret = $this->dbSelectJoin($thisTable, $joinTables);
                        $ret['info'] = $create['info'];
                    }
                    else $ret['errormsg'] .= "\n".$create['errormsg'];
                } else $ret['errormsg'] = 
                    "Something went wrong: trying to refresh table \"{$thisTable['name']}\"";
            }
        }
        $ret['time'] = $time;
        return json_encode($ret);
    }

}
        

