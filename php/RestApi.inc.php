<?php

require_once(PHP_ROOT.'php/SqlDb.inc.php');

/**
 * Handles ajax requests
 */
class RestApi extends SqlDb
{
    /**
     * Unique database name
     *
     * @var string
     */
    protected $dbName;
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
    protected $name;
    /**
     * Holds table data
     *
     * @var array
     */
    protected $col;
    /**
     * Foreign columns referenced in AutoColumns
     *
     * @var array
     */
    protected $refs;

    public function __construct($dbName, $defaultTable = NULL, $configFile = NULL)
    {
        $this->dbName = $dbName;
        $this->config = empty($configFile)
            ? require(PHP_ROOT.'config.php')
            : require(PHP_ROOT.$configFile);
        $this->name = $defaultTable ?: 'index';

        parent::__construct($this->config['database']);

        $this->col = json_decode(file_get_contents(PHP_ROOT.$this->name.'/'.$this->currentTable), true)['columns'];
    }

        
    /**
     * check if keys exists in table[col] to prevent sql injection attack
     *
     * @param array $data
     * @return array only entries where column name exists in $this->col
     */
    public function validateTableKeys(array $data)
    {
        $dataChecked = [];
        foreach ($this->col as $col) {
            if (array_key_exists($col['name'], $data) && $col['class'] == 1) // Data Column
                $dataChecked[$col['name']] = $data[$col['name']];
        }
        return $dataChecked;
    }

    /**
     * Analyze field-js code for variable names from external tables to fetch
     * in sql query
     *
     * @return array names of all foreign columns
     */
    public function getReferences()
    {
        $refs = [];
        foreach ($this->col as $col) {
            switch ($col['class']) {
            case 2: // Auto Column
                if(preg_match_all('/\btv\.(\w+)\b/',$col['js'],$matches)) {
                    for ($i = 0; $i < count($matches[1]); $i++) {
                        $colName = $matches[1][$i];
                        if (!in_array($colName,$this->refVars)) {
                            $refs[] = $colName;
                        }    
                    }
                }
                break;
            case 4: // Foreign Column
                $refs[] = $col['name'];
                break;
            }
        }
        return $refs;
    }

    /**
     * create table in sql database
     *
     * @return array success-status and error message
     */
    public function dbCreateThisTable()
    {
        $columns = [];
        foreach ($this->col as $col) {
            switch($col['class']) {
            case 1: // Data Column
            case 3: // Foreign key
                $columns[] = $col;
            }
        }
        return $this->dbCreateTable($this->name, $columns);
    }
    
    /**
     * process requests for table data
     * create table if does not exist
     * $mainValues: values directly displayed in table
     * $sideValues: values only needed for further calculation in cell scripts
     *
     * @return array success-status and data or error message
     */
    public function dbSelectThisTable()
    {
        $result = $this->dbSelectJoin(
            $this->name, 
            array_merge(['*'], $this->getReferences())
        );
        if(!$result['success']) {
            $createResult = $this->dbCreateThisTable();
            if ($createResult['success']) return [
                'success' => true, 
                'columns' => $this->col, 
                'data' => [],
                'info' => "Successfully created Table"
            ];
            return [
                'success' => false, 
                'errormsg' => $result['errormsg'].'\n'.$createResult['errormsg']
            ];
        }
        return ['success' => true, 'columns' => $this->col, 'data' => $result['data']];
    }

    /**
     * process requests for inserting new row to table
     *
     * @param array $data       POST data from Ajax as array
     * @return array success-status and data or error message
     */
    public function dbInsertIntoThis(array $data)
    {
        $insertResult = $this->dbInsert($this->name, $this->validateTableKeys($data));
        if ($insertResult['success']) return $this->dbSelect($this->name, ['*'], [], 1);
        else return $insertResult;
    }

    /**
     * process requests for modifying row in table
     *
     * @param int $row
     * @param array $data
     * @return array success-status and data or error message
     */
    public function dbAlterInThis($row, array $data)
    {
        $alterResult = $this->dbAlter($this->name, $row, $this->validateTableKeys($data));
        if ($alterResult['success']) return $this->dbSelect(
            $this->name, ['*'], [$this->name.'_id' => $row]
        );
        else return $alterResult;
    }

    /**
     * process request for row deletion
     *
     * @param int $row
     * @return array success-status and error message
     */
    public function dbDeleteFromThis($row)
    {
        $result = $this->dbDelete($this->name, $row);
        $result['row'] = $row;
        return $result;
    }

    /**
     * process a database request
     * pass incoming request on to database access methods
     *
     * @param array $data      GET data from Ajax as array ($_GET)
     * @return string answer from database
     */
    public function processRequest(array $data)
    {
        $ret = [];
        switch ($data['operation']) {
        case 'SELECT TABLE':
            $ret = $this->dbSelectThisTable();
            break;
        case 'INSERT':
            $ret = $this->dbInsertIntoThis($data['data']); 
            break;
        case 'DELETE':
            $ret = $this->dbDeleteFromThis(intval($data['row']));
            break;
        case 'ALTER':
            $ret = $this->dbAlterInThis(intval($data['row']), $data['data']);
            //$ret = ['success' => False, 'errormsg' => json_encode($data)];
            break;
        }
        return json_encode($ret);
    }

}
        

