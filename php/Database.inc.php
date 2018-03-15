<?php

require_once(PHP_ROOT.'php/Page.inc.php');

/**
 * Abstract class to hold column types
 */
abstract class Column
{
    const MetaCol = 0;
    const DataCol = 1
    const AutoCol = 2;
}

/**
 * A generator class for a page with a table. Reads table information from json file and outputs
 * a <table> element.
 * */
class Database extends Page
{
    /**
     * Unique database name
     *
     * @var string
     */
    protected $name;
    /**
     * Array holding all the tables as arrays
     *
     * @var array
     */
    protected $tables;

    /**
    * Constructor
    * passes parameters to parent constructor and adds table.css and table.js
    *
    * @param string $name       unique database name for (future) sql table-prefix
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    */
    public function __construct(
        $name,
        $title = '',
        $favicon = '',
        $configFile = ''
    ) 
    {
        $this->name = $name;
        parent::__construct($title, $favicon, $configFile);
        $this->addJs('database.js');
        
        // read tables from folder named same as database name
        if (is_dir(PHP_ROOT.$name) {
            $dh = opendir(PHP_ROOT.$name);
            while (($file = readdir($dh)) !== false) {
                array_push($this->tables, json_decode($file));
            }
        }
    }

    /**
     * generate html table with necessary id
     *
     * @return string <table> tag
     */
    public function getTable()
    {
        return '<table class="table" id="trek-table"><thead></thead><tbody></tbody></table>';
    }

    /**
     * generate navigation for table-tabs
     */
    public function getTableNav()
    {
    }

}



