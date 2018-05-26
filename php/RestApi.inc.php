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
        if ($tableName === "trek_user") return [
            [
                'name' => "id",
                'class' => 0
            ],
            [
                'name' => "createdate",
                'class' => 0
            ],
            [
                'name' => "modifieddate",
                'class' => 0
            ],
            [
                'name' => "username",
                'class' => 1,
                'type' => "username"
            ]
        ];

        if (array_key_exists("column_reference", $this->dbInfo['sheets'][$tableName])) 
            return $this->dbInfo['sheets'][$this->dbInfo['sheets'][$tableName]['column_reference']]['columns'];
        return $this->dbInfo['sheets'][$tableName]['columns'];
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
        if (array_key_exists('barcode', $data)) $dataChecked['barcode'] = $data['barcode'];
        foreach ($this->getColumns($tableName) as $col) {
            switch ($col['class']) {
            case 0: // Meta Column
                switch ($col['name']) {
                case "createuser":
                case "modifieduser":
                    if (array_key_exists($col['name'], $data)) {
                        $dataChecked[$col['name']] = $data[$col['name']];
                    }
                }
                break;
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

    // DEPRECATED in favour of doing it all in js
    //private function getJoinTables($hierarchy, $baseTable, $referenceType, $referenceTable)
    //{
    //    $thisTable = end($hierarchy);
    //    $joinTables = [[
    //        'name' => $thisTable, 
    //        'columns' => [], 
    //        'referenceType' => $referenceType, 
    //        'referenceTable' => $referenceTable,
    //        'prefix' => implode("_", $hierarchy)
    //    ]];
    //    foreach ($this->getColumns($thisTable) as $fcol) {
    //        if ($fcol['class'] === 1) {
    //            $joinTables[0]['columns'][] = $fcol;
    //        } elseif (
    //            $fcol['class'] === 3 &&
    //            !in_array($fcol['table'], $hierarchy) &&
    //            $fcol['table'] !== $baseTable
    //        ) {
    //            $hierarchy[] = $fcol['table'];
    //            $joinTables = array_merge($joinTables, $this->getJoinTables($hierarchy, $baseTable, 'left', $thisTable));
    //            array_pop($hierarchy);
    //        }        }
    //    return $joinTables;
    //}
                

    

    /**
     * process a database request
     * pass incoming request on to database access methods
     *
     * @param array $postData      POST data from Ajax as array ($_POST)
     * @return string answer from database
     */
    public function processRequest(array $postData)
    {
        $opRet = [];
        switch ($postData['operation']) {
        case 'INSERT':
            $opRet = $this->dbInsert(
                $postData['tableName'],
                $this->validateTableKeys($postData['tableName'], $postData['data'])
            );
            break;
        case 'DELETE':
            $opRet = $this->dbAlter(
                $postData['tableName'], 
                $postData['row'], 
                ['deleted' => true]
            );
            break;
        case 'ALTER':
            $opRet = $this->dbAlter(
                $postData['tableName'], 
                $postData['row'], 
                $this->validateTableKeys($postData['tableName'], $postData['data'])
            );
            break;
        }
        $time = date('Y-m-d G:i:s');
        if ($postData['operation'] === "SELECT" || $opRet['success']) {
            $thisTable = ['name' => $postData['tableName'], 'columns' => []];
            $columns = $this->dbInfo['user'] ? ['createuser', 'modifieduser'] : [];
            foreach ($this->getColumns($postData['tableName']) as $col) {
                switch ($col['class']) {
                case 0: // Meta Column
                    if (array_key_exists('barcode', $col) && $col['barcode'] === 'ean') $columns[] = "barcode";
                case 1: // Data Column
                    $columns[] = $col['name'];
                    break;
                case 3: // Foreign key
                    $columns[] = "{$col['table']}_id";
                    break;
                }
            }
            $where = empty($postData['lastUpdate']) 
                ? ["deleted = 0"]
                : ["modifieddate >= {$postData['lastUpdate']}"];

            $ret = $this->dbSelect($postData['tableName'], $columns, $where);
        }
        $ret['time'] = $time;
        $ret['opData'] = $opRet;
        return json_encode($ret);
    }

}
        

