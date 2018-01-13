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
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    */
    public function __construct(
        string $name,
        string $title = '',
        string $favicon = '',
        string $configFile = ''
    ) 
    {
        $this->name = $name;
        $this->idname = $name."-id";
        parent::__construct($title, $favicon, $configFile);
        $this->addCss('table.css');
        $this->addJs('table.js');
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
     * check if keys exists in $this->col to prevent sql injection attack
     *
     * @param array $data
     * @return array only entries where column name exists in $this->col
     */
    public function validateTableKeys(array $data)
    {
        $dataChecked = [];
        foreach ($this->col as $col) {
            if (array_key_exists($col['name'], $data) && $col['class'] == Column::DataCol)
                $dataChecked[$col['name']] = $data[$col['name']];
        }
        return $dataChecked;
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
            if ($col['class'] === Column::DataCol) $columns[] = $col;
        }
        return $this->dbCreateTable($this->name, $columns);
    }

    /**
     * drop table
     *
     * @return array succes-status and error message
     */
    public function dbDropThisTable()
    {
        return $this->dbDropTable($this->name);
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
        $result = $this->dbSelect($this->name);
        if (!$result['success']) {
            $createResult = $this->dbCreateTable($this->name);
            if ($createResult['success']) 
                return ['success' => True, 'alert' => "Successfully created Table",
                'data' => ['mainValues' => [], 'sideValues' => []],
                'columns' => $this->col];
            return ['success' => False, 'errormsg' => 
                $result['errormsg'].'\n'.$createResult['errormsg']];
        }
        $mainValues = $result['data'];

        $sideValues = [];
        foreach ($this->refVars as $tablename => $tablecols) {
            $result = $this->dbSelect($tablename,$tablecols);
            if (!$result['success']) return $result;
            $sideValues[$tablename] = $result['data'];
        }

        return ['success' => True, 'data' =>
            ['mainValues' => $mainValues, 'sideValues' => $sideValues]];
    }

    /**
     * process requests for inserting new row to table
     *
     * @param array $data       POST data from Ajax as array
     * @return array success-status and error message
     */
    public function dbInsertIntoThis(array $data)
    {
        return $this->dbInsert($this->name, $this->validateTableKeys($data));
    }

    /**
     * process requests for modifying row in table
     *
     * @param int $row
     * @param array $data
     * @return array success-status and error message
     */
    public function dbAlterInThis(int $row, array $data)
    {
        return $this->dbAlter($this->name, $row, $this->validateTableKeys($data));
    }

    /**
     * process request for row deletion
     *
     * @param int $row
     * @return array success-status and error message
     */
    public function dbDeleteFromThis(int $row)
    {
        return $this->dbDelete($this->name, $row);
    }

    /**
     * process a database request
     * parse incoming request from JSON to array and pass it on to 
     * database access methods
     *
     * @param array $data      GET data from Ajax as array ($_GET)
     * @return string answer from database encoded in JSON
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
            $ret = $this->dbDeleteFromThis($data['row']);
            break;
        case 'ALTER':
            $ret = $this->dbAlterInThis($data['row'], $data['data']);
            break;
        }
        return json_encode($ret);
    }

}
