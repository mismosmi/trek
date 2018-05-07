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
    const ForeignKey = 3;
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
     * Active table
     *
     * @var string
     */
    protected $activeTable;

    /**
    * Constructor
    * passes parameters to parent constructor and adds table.css and table.js
    *
    * @param string $name       unique database name for (future) sql table-prefix
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    * @param string $activeTable specify active table
    */
    public function __construct(
        $dbName,
        $title = '',
        $favicon = '',
        $configFile = '',
        $activeTable = ''
    ) 
    {
        $this->dbName = $dbName;
        parent::__construct($title, $favicon, $configFile);
        $this->dbInfo = json_decode(file_get_contents(PHP_ROOT.$this->config['pages'][$dbName]['path']), true);

        $this->activeTable = $activeTable ?: $this->dbInfo['order'][0];

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
        return "<form id=\"trek-form\" onsubmit=\"Trek.submit(this)\"><table class=\"table\" id=\"trek-table\"><thead></thead><tbody></tbody></table></form>\n";
    }

    /**
     * generate navigation for table-tabs
     */
    public function getDbNav()
    {
        $tabs = "";
        foreach ($this->dbInfo['order'] as $name) {
            $data = $this->dbInfo['tables'][$name];
            $active = $name == $this->activeTable ? " class=\"is-active\"" : "";
            $tabs .= "  <li$active data-table=\"$name\"><a onclick=\"Trek.selectTable(this)\">{$data['title']}</a></li>\n";
        }
        return 
             "<div class=\"tabs\" id=\"trek-db-nav\">\n"
            ." <ul>\n"
            .$tabs
            ." </ul>\n"
            ."</div>\n";
    }

    /**
     * get matching html unit symbol for sqlType
     *
     * @param $sqlType string
     * @return string
     */
    public static function getSymbol($sqlType) 
    {
        if (
            strtoupper(substr($sqlType, 0, 4)) === "EURO"
        ) return "&euro;";

        return "";
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
                            $symbol = $this->getSymbol($fcol['type']);
                            $tableColumns .= 
                                "        {\n"
                                ."           name: \"{$column['table']}_{$fcol['name']}\",\n"
                                ."           class: 4,\n" // Foreign Data Column
                                ."           type: \"{$fcol['type']}\",\n"
                                ."           symbol: \"$symbol\",\n"
                                ."        },\n";
                        }
                    }
                }

                if ($column['class'] === 1 || $column['class'] === 3) {
                    $required = $column['required'] 
                        ? "           required: \"true\",\n"
                        : "           required: \"false\",\n";
                } else $required = "";

                if ($column['class'] === 3) {
                    $name = "{$column['table']}_id";
                    $table = "           table: \"{$column['table']}\",\n";
                } else {
                    $name = $column['name'];
                    $table = "";
                }

                $symbol = $this->getSymbol($column['type']);
                $tableColumns .=
                    "        {\n"
                    ."           name: \"{$name}\",\n"
                    ."           class: {$column['class']},\n"
                    ."           title: \"{$column['title']}\",\n"
                    ."           type: \"{$column['type']}\",\n"
                    ."           symbol: \"$symbol\",\n"
                    .$table
                    .$required
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
            ."    tableName: '{$this->activeTable}',\n"
            ."    tableColumns: {\n"
            .$tableColumns
            ."    }\n"
            ."  });\n"
            ."});\n"
            ."</script>\n";
    }
                    


}



