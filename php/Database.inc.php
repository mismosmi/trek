<?php

require_once(PHP_ROOT.'php/Page.inc.php');

/**
 * Abstract class to hold column types
 */
abstract class Column
{
    const MetaCol = 0;
    const DataCol = 1;
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
    protected $dbName;
    /**
     * Array holding database information
     *
     * @var array
     */
    protected $dbInfo;

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
        $dbName,
        $title = '',
        $favicon = '',
        $configFile = ''
    ) 
    {
        $this->dbName = $dbName;
        parent::__construct($title, $favicon, $configFile);
        $this->dbInfo = json_decode(file_get_contents(PHP_ROOT.$this->config['pages'][$dbName]['path']), true);

        $this->addJs('js/jquery-3.2.1.min.js');
        $this->addJs('js/trekdb.js');
        
    }

    /**
     * generate html table with necessary id
     *
     * @return string <table> tag
     */
    public function getTable()
    {
        return "<form id=\"trek-form\" onsubmit=\"Trek.submit(this)\"><table class=\"table is-fullwidth\" id=\"trek-table\"><thead></thead><tbody></tbody></table></form>\n";
    }

    /**
     * generate navigation for table-tabs
     */
    public function getDbNav()
    {
        $tabs = "";
        $active = " class=\"is-active\"";
        foreach ($this->dbInfo['order'] as $name) {
            $data = $this->dbInfo['tables'][$name];
            $tabs .= "  <li$active data-table=\"$name\"><a onclick=\"Trek.selectTable(this)\">{$data['title']}</a></li>\n";
            $active = "";
        }
        return 
             "<div class=\"tabs\" id=\"trek-db-nav\">\n"
            ." <ul>\n"
            .$tabs
            ." </ul>\n"
            ."</div>\n";
    }

    /**
     * generate script
     */
    public function getScript()
    {
        $tableColumns = '';
        foreach ($this->dbInfo['order'] as $tableName) {
            $table = $this->dbInfo['tables'][$tableName];
            $tableColumns .= 
                 "      '$tableName': [\n";
            foreach ($table['columns'] as $column) {
                $name = ($column['class'] === 3) 
                    ? "{$column['table']}_id"
                    : $column['name'];

                $js = "";
                if ($column['class'] === 2) {
                    $js .= "           run: function(tv) {\n";
                    if (strpos($column['js'], ";") === false) {
                        $js .= 
                            "             return {$column['js']};\n"
                            ."           },\n";
                    } else {
                        $js .= 
                            "{$column['js']}\n"
                            ."},\n";
                    }
                }
                if ($column['class'] === 3 || ($column['class'] === 2 && array_key_exists('table', $column))) {
                    foreach ($this->dbInfo['tables'][$column['table']]['columns'] as $fcol) {
                        switch ($fcol['class']) {
                        case 1: // Data Column
                            $tableColumns .= 
                                "        {\n"
                                ."           name: \"{$column['table']}_{$fcol['name']}\",\n"
                                ."           class: 4,\n"
                                ."        },\n";
                        }
                    }
                }

                $tableColumns .=
                    "        {\n"
                    ."           name: \"{$name}\",\n"
                    ."           class: {$column['class']},\n"
                    ."           title: \"{$column['title']}\",\n"
                    .$js
                    ."        },\n";
            }
            $tableColumns .= "      ],\n";
        }

        $ajaxUrl = HTML_ROOT."php/api.php?db=".$this->dbName;

        return
             "<script>\n"
            ."document.addEventListener('DOMContentLoaded', () => {\n"
            ."  Trek = new TrekDatabase({\n"
            ."    ajaxUrl: '$ajaxUrl',\n"
            ."    tableName: '{$this->dbInfo['order'][0]}',\n"
            ."    tableColumns: {\n"
            .$tableColumns
            ."    }\n"
            ."  });\n"
            ."});\n"
            ."</script>\n";
    }
                    


}



