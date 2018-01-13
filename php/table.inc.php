<?php

require_once(PHP_ROOT.'php/page.inc.php');

/**
 * Abstract class to hold column types
 */
abstract class Column
{
    const DataCol = 0;
    const AutoCol = 1;
}

/**
* A generator class for a page with a table with an sql connection
* generates a <form> to append to the table, a <table> to display it and
* processes POST requests for sql database connection
*/
class Table extends Page 
{

    /**
     * Unique table name
     *
     * @var string
     */
    protected $name;
    /**
     * display name for table-ID
     *
     * @var string
     */
    protected $idname;
    /**
     * Open database connection
     *
     * @var PDO
     */
    protected $db = NULL;
    /**
     * table columns
     *
     * @var array
     */
    protected $col = [];
    /**
     * variables referenced from other tables
     *
     * @var array 
     */
    protected $refVars = [];

    /**
    * Constructor
    * passes parameters to parent constructor and adds table.css and table.js
    *
    * @param string $name       unique table name for sql table
    * @param string $idname     display name for table-id
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    */
    public function __construct(
        string $name,
        string $idname = '',
        string $title = '',
        string $favicon = '',
        string $configFile = ''
    ) 
    {
        $this->name = $name;
        $this->idname = $idname;
        parent::__construct($title, $favicon, $configFile);
        $this->addCss('table.css');
        $this->addJs('table.js');
    }

    /**
     * Desctructor
     * closes database connection
     */
    public function __destruct()
    {
        $this->db = NULL;
    }

    /**
     * Add a column to the table
     *
     * @param string $name          column name in sql model and var name in js
     * @param string $type          column data type (usually VARCHAR, INT or
     *                              DECIMAL)
     * @param string $title         to be displayed in column header and form
     * @param string $placeholder   placeholder in form 
     * @param bool $required        required or optional column, default optional
     */
    public function addDataCol(
        string $name, 
        string $type,
        string $title, 
        string $placeholder = '',
        bool $required = False
    ) 
    {
        $this->col[] = [
            'class' => Column::DataCol,
            'name' => $name,
            'type' => $type,
            'title' => $title,
            'placeholder' => $placeholder,
            'required' => $required
        ];
    }

    /**
     * Analyze field-js code for variable names from external tables to fetch
     * in sql query
     *
     * @param string $js
     */
    public function addRefVars(string $js)
    {
        if(preg_match_all('/\btv\.(\w+)\.(\w+)\b/',$js,$matches)) {
            for ($i = 1; $i < count($matches[1]); $i++) {
                $tn = $matches[1][$i];
                $vn = $matches[2][$i];
                if (!in_array($tn,$this->refVars)) {
                    $this->refVars[$tn] = [$vn];
                } elseif (!in_array($vn,$this->refVars[$tn])) {
                    $this->refVars[$tn][] = $vn;
                }
            }
        }
    }

    /**
     * Add a js-calculated auto-column
     *
     * @param string $name          name of corresponding js variable
     * @param string $title         to be displayed in column header and form
     * @param string $js            script to calculate value
     */
    public function addAutoCol(
        string $name,
        string $title,
        string $js
    )
    {
        $this->col[] = [
            'class' => Column::AutoCol,
            'name' => $name,
            'title' => $title,
            'js' => $js
        ];
        $this->addRefVars($js);
    }

    /**
     * set a custom name for id-column
     *
     * @param string $name
     */
    public function setIdCol(string $name)
    {
        $this->idname = $name;
    }

    /**
     * generate html <div><table> skeleton with <th> tags for the columns
     * and insert getForm() as first table row
     *
     * @return string <table> tag
     */
    public function getTable()
    {
        $formElements = $this->getFormElements();
        $headerRow = "<tr>\n<th data-col=\"$this->name-id\">$this->idname</th>\n";
        $formRow = "<tr class=\"trek-form\">\n<td></td>\n";
        foreach ($this->col as $col) {
            $headerRow .= "<th data-col=\"{$col['name']}\">{$col['title']}</th>\n";
            $formRow .= "<td>{$formElements[$col['name']]}</td>\n";
        }
        $headerRow .= "<th data-col=\"timestamp\">Edited</th>\n"
            ."<th data-col=\"controls\"></th>\n</tr>\n";
        $formRow .= "<td></td>\n"
            ."<td>{$formElements['controls']}</td>\n</tr>\n"; 

        return 
             "<div class=\"trek-table\" id=\"table-$this->name\">\n"
            ."<table class=\"table-striped table-hover table-condensed col\">\n"
            ."<thead>\n"
            .$headerRow
            ."</thead>\n"
            ."<tbody>\n"
            .$formRow
            ."</tbody>\n"
            ."</table>\n"
            ."</div>\n";
    }

    /**
     * generate form to append new entries to the table or modify existing ones
     *
     * @return array elements of the form
     */
    //protected function getForm()
    public function getFormElements()
    {
        $elements = [];
        foreach ($this->col as $col) {
            if ($col['class'] === Column::DataCol) {
                $placeholder = empty($col['placeholder']) ? ""
                    : " placeholder=\"{$col['placeholder']}\"";
                $required = $col['required'] ? " required" : "";
                $elements[$col['name']] =
                    "<input type=\"text\" class=\"form-control\" "
                    ."id=\"{$col['name']}\""
                    ."$placeholder$required>";
            } elseif ($col['class'] === Column::AutoCol) {
                $elements[$col['name']] =
                    "<input type=\"text\" "
                    ."class=\"form-control readonly\" "
                    ."id=\"{$col['name']}\">";
            }
        }
        $elements['controls'] = "<button type=\"submit\" "
            ."class=\"btn btn-default\">Save</button>";

        return $elements;
    }

    /**
     * open a PDO mysql connection to db specified in config.php
     *
     * @return bool success
     */
    //protected function connectToDb()
    public function connectToDb()
    {
        if ($this->db != NULL) return True;

        $dbdata = $this->_config['database'];
        try {
            if ($dbdata['backend'] == 'sqlite') {
                $conn = new PDO("sqlite:{$dbdata['path']}");
            } elseif ($dbdata['backend'] == 'mysql') {
                $conn = new PDO("mysql:host={$dbdata['host']},dbname={$dbdata['dbname']}",
                    $dbdata['username'], $dbdata['password']);
            }
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $e) {
            die("Connection failed: ".$e->getMessage());
            return False;
        }
        $this->db = $conn;
        return True;
    }

    /**
     * query sql to create this table
     *
     * @return bool success
     */
    //protected function createTable()
    public function createTable()
    {
        if(!$this->connectToDb()) return False;

        try {
            $be = $this->_config['database']['backend'];
            $query = "CREATE TABLE $this->name (";
            if ($be == 'sqlite') {
                $query .= "id INTEGER PRIMARY KEY, "
                    ."entrydate DATETIME DEFAULT CURRENT_TIMESTAMP";
            } elseif ($be == 'mysql') {
                $query .= "id INT NOT NULL AUTO_INCREMENT, "
                    ."entrydate TIMESTAMP";
            }
            foreach ($this->col as $col) {
                if ($col['class'] !== Column::DataCol) continue;
                $required = $col['required'] ? "NOT NULL " : "";
                $query .= ", {$col['name']} {$col['type']} "
                    ."{$required}";
            }
            if ($be == 'mysql') $query .= ", PRIMARY KEY (id)";
            $query .= ")";
            $this->db->exec($query);
        } catch (PDOException $e) {
            die("failed creating table $this->name: ".$e->getMessage());
        }
        return True;
    }

    /**
     * query sql to drop this table
     *
     * @return bool success
     */
    //protected function dropTable()
    public function dropTable()
    {
        if(!$this->connectToDb()) return False;

        try {
            $query = "DROP TABLE $this->name";
            $this->db->exec($query);
        } catch (PDOException $e) {
            die("failed dropping table $this->name: ".$e->getMessage());
        }
        return True;
    }

    /**
     * process requests for table data
     * create table if does not exist
     *
     * @param int $pageNumber   use pagenumber to load large tables in several
     *                          pages, default -1: load all, page length 
     *                          defined in config.php
     * @return array the requested table data as array
     */
    //protected function processSelect(int $pageNumber = -1)
    public function processSelectPage(int $pageNumber = -1)
    {
        if(!$this->connectToDb()) return False;
        try {
            $collist = ['id','entrydate'];
            foreach ($this->col as $col) {
                if ($col['class'] === Column::DataCol) $collist[] = $col['name'];
            }
            $stmt = $this->db->prepare(
                "SELECT ".join(",",$collist)." "
                ."FROM $this->name"
            );
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $mainValues = $stmt->fetchAll();

            $sideValues = [];
            foreach ($this->refVars as $tablename => $tablecols) {
                $sideValues[$tablename] = [];
                $stmt = $conn->prepare(
                    "SELECT ".join(",",$tablecols)." "
                    ."FROM $tablename"
                );
                $stmt->execute();
                $stmt->setFetchMode(PDO::FETCH_ASSOC);
                $sideValues[$tablename] = $stmt->fetchAll();
            }
        } catch (PDOException $e) {
            die("Error fetching data: ".$e->getMessage());
        }
        return ['mainValues' => $mainValues, 'sideValues' => $sideValues];
    }

    /**
     * process requests for inserting new row to table
     *
     * @param array $data       POST data from Ajax as array
     * @return bool success
     */
    //protected function processInsert(array $data)
    public function processInsert(array $data)
    {
        if(!$this->connectToDb()) return False;
        try {
            $collist = [];
            $paramlist = [];
            foreach ($data as $name => $val) {
                $collist[] = $name;
                $paramlist[] = ":".$name;
            }
            $stmt = $this->db->prepare("INSERT INTO $this->name "
                ."(".join(",",$collist).") "
                ."VALUES (".join(",",$paramlist).")");
            foreach ($data as $name => $val) {
                $stmt->bindParam(":".$name, $val);
            }
            $stmt->execute();
        } catch (PDOException $e) {
            die("Error inserting row: ".$e->getMessage());
        }
        return True;

    }

    /**
     * process requests for modifying row in table
     *
     * @param int $row          which row to edit
     * @param array $data       POST data from Ajax as array
     * @return bool success
     */
    //protected function processAlter(int $row, array $data)
    public function processAlter(int $row, array $data)
    {
        if(!$this->connectToDb()) return False;
        try {
            $collist = [];
            $paramlist = [];
            $set = [];
            foreach ($data as $name => $val) {
                $set[] = "$name = :$name";
            }
            $stmt = $this->db->prepare("UPDATE $this->name "
                ."SET ".join(",",$set)." WHERE id=$row");
            foreach ($data as $name => $var) {
                $stmt->bindParam(":".$name, $val);
            }
            $stmt->execute();

        } catch (PDOException $e) {
            die("Error altering row $row: ".$e->getMessage());
        }
        return True;
    }

    /**
     * process request for row deletion
     *
     * @param int $row
     * @return bool success
     */
    //protected function processDelete(int $row)
    public function processDelete(int $row)
    {
        if(!$this->connectToDb()) return False;
        try {
            $this->db->exec("DELETE FROM $this->name WHERE id=$row");
        } catch (PDOException $e) {
            die("Error inserting row: ".$e->getMessage());
        }
        return True;
    }

    /**
     * process arbitrary SELECT request
     *
     * @param array (string) columns    which columns to select
     * @param string table              table to select from
     * @param array where               ['condition',...]
     */
    public function processSelect(
        array $columns = ['*'], 
        string $table = '', 
        array $where = []
    )
    {
        if(!$this->connectToDb()) return False;
        try {
            $tn = empty($table) ? $this->name : $table;
            $ws = empty($where) ? "" : " WHERE ".join(',',$where);
            $stmt = $this->db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM $tn$ws"
            );
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            die("Error fetching data: ".$e->getMessage());
        }
    }

    /**
     * process a database request
     * parse incoming request from JSON to array and pass it on to 
     * processSelect(), processInsert() or processAlter()
     *
     * @param string data_raw   POST data from Ajax as JSON ($_POST)
     * @return string answer from database
     */
    public function processRequest(string $data_raw)
    {
        $dec = json_decode($data_raw, True);
        $ret_raw = '';
        switch ($dec['operation']) {
        case 'SELECT PAGE':
            $ret = ['operation' => 'SELECT PAGE', 'status' => 'success',
            'data' => $this->processSelectPage()];
            $ret_raw = json_encode($ret);
            break;
        case 'INSERT':
            if ($this->processInsert($dec['data'])) 
                $ret_raw = '{"operation": "INSERT", "status": "success"}';
            break;
        case 'DELETE':
            if ($this->processDelete($dec['row'])) 
                $ret_raw = '{"operation": "DELETE", "status": "success"}';
            break;
        case 'ALTER':
            if ($this->processAlter($dec['row'], $dec['data']))
                $ret_raw = '{"operation": "ALTER", "status": "success"}';
            break;
        }
        die($ret_raw);
    }

}
