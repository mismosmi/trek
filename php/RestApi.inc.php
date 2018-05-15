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
    public function __construct($dbName, $configFile = NULL)
    {
        $this->config = empty($configFile)
            ? json_decode(file_get_contents(PHP_ROOT.'config.json'), true)
            : json_decode(file_get_contents(PHP_ROOT.$configFile), true);


        parent::__construct($this->config['database']);

        $this->dbInfo = json_decode(file_get_contents(PHP_ROOT.$this->config['pages'][$dbName]['path']), true);
    }

    /**
     * check if this tables gets its columns from another table via column_reference
     *
     * @param string tableName  Name of requested Table
     * @return array columns
     */
    private function getColumns($tableName)
    {
        if (array_key_exists("column_reference", $this->dbInfo['tables'][$tableName])) 
            return $this->dbInfo['tables'][$this->dbInfo['tables'][$tableName]['column_reference']]['columns'];
        return $this->dbInfo['tables'][$tableName]['columns'];
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
        foreach ($this->getColumns($tableName) as $col) {
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

    private function getJoinTables($hierarchy, $baseTable, $referenceType, $referenceTable)
    {
        $thisTable = end($hierarchy);
        $joinTables = [[
            'name' => $thisTable, 
            'columns' => [], 
            'referenceType' => $referenceType, 
            'referenceTable' => $referenceTable,
            'prefix' => implode("_", $hierarchy)
        ]];
        foreach ($this->getColumns($thisTable) as $fcol) {
            if ($fcol['class'] === 1) {
                $joinTables[0]['columns'][] = $fcol;
            } elseif (
                $fcol['class'] === 3 &&
                !in_array($fcol['table'], $hierarchy) &&
                $fcol['table'] !== $baseTable
            ) {
                $hierarchy[] = $fcol['table'];
                $joinTables = array_merge($joinTables, $this->getJoinTables($hierarchy, $baseTable, 'left', $thisTable));
                array_pop($hierarchy);
            } //elseif (
            //    $fcol['class'] === 2 && 
            //    array_key_exists('table', $fcol) &&
            //    !in_array($fcol['table'], $hierarchy) &&
            //    $fcol['table'] !== $baseTable
            //) {
            //    $hierarchy[] = $fcol['table'];
            //    $joinTables = array_merge($joinTables, $this->getJoinTables($hierarchy, $baseTable, 'right', $thisTable));
            //    array_pop($hierarchy);
            //}
        }
        return $joinTables;
    }
                

    

    /**
     * process a database request
     * pass incoming request on to database access methods
     *
     * @param array $postData      POST data from Ajax as array ($_POST)
     * @return string answer from database
     */
    public function processRequest(array $postData)
    {
        $ret = [];
        switch ($postData['operation']) {
        case 'INSERT':
            foreach ($postData['data'] as $row) {
                $ret = $this->dbInsert($postData['tableName'], $this->validateTableKeys($postData['tableName'], $row));
                if (!$ret['success']) break;
            }
            break;
        case 'DELETE':
            foreach ($postData['rows'] as $id) {
                $ret = $this->dbAlter($postData['tableName'], $id, ['deleted' => true]);
                if (!$ret['success']) break;
            }
            break;
        case 'ALTER':
            foreach ($postData['data'] as $id => $row) {
                $ret = $this->dbAlter($postData['tableName'], $id, $this->validateTableKeys($postData['tableName'], $row));
                if (!$ret['success']) break;
            }
            break;
        }
        $time = date('Y-m-d G:i:s');
        if ($postData['operation'] === "SELECT" || $ret['success']) {
            $thisTable = ['name' => $postData['tableName'], 'columns' => []];
            $joinTables = [];
            foreach ($this->getColumns($postData['tableName']) as $col) {
                switch ($col['class']) {
                case 1: // Data Column
                    $thisTable['columns'][] = $col;
                    break;
                case 2: // Auto Column
                    if (array_key_exists('tables', $col)) {
                        foreach ($col['tables'] as $joinTableName) {
                            $joinTables = array_merge($joinTables, $this->getJoinTables([$joinTableName], $postData['tableName'], "right", $thisTable['name']));
                        }
                    }
                    break;
                case 3: // Foreign Key
                    $joinTables = array_merge($joinTables, $this->getJoinTables([$col['table']], $postData['tableName'], "left", $thisTable['name']));
                    break;
                }
            }
            $where = empty($postData['lastUpdate']) 
                ? ["{$thisTable['name']}.deleted = 0"]
                : ["{$thisTable['name']}.modifieddate >= {$postData['lastUpdate']}"];

            $ret = $this->dbSelectJoin($thisTable, $joinTables, $where);
            $ret['where'] = $where;
            if (!$ret['success']) {
                if (empty($postData['lastUpdate'])) {
                    $createmsg = "";
                    foreach ($joinTables as $table) {
                        $create = $this->dbCreateTable($table['name'], $this->getColumns($table['name']));
                        $createmsg .= ($create['success'] ? $create['info'] : $create['errormsg'])."\n";
                    }
                    $create = $this->dbCreateTable($thisTable['name'], $this->getColumns($thisTable['name']));
                    $createmsg .= ($create['success'] ? $create['info'] : $create['errormsg']);
                    $ret = $this->dbSelectJoin($thisTable, $joinTables);
                    if ($ret['success']) $ret['info'] = $createmsg;
                    else $ret['errormsg'] .= "\n".$createmsg;
                } else $ret['errormsg'] = 
                    "Something went wrong: trying to refresh table \"{$thisTable['name']}\"";
            }
        }
        $ret['time'] = $time;
        return json_encode($ret);
    }

}
        

