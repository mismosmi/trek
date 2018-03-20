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

        $this->addJs('js/trekdb.js');
        
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
    public function getDbNav()
    {
        $tabs = "";
        foreach ($this->dbInfo['order'] as $name) {
            $data = $this->dbInfo['tables'][$name];
            $tabs .= "  <li data-table=\"$name\" onclick=\"Trek.selectTable(this)\">{$data['title']}</li>\n";
        }
        return 
             "<div class=\"tabs\" id=\"trek-table-nav\">\n"
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
                 "      '$tableName': {\n"
                ."        name: \"{$table['name']}\",\n"
                ."        class: {$table['class']},\n"
                ."        title: \"{$table['title']}\"";
            if ($table['class'] === 2) {
                $tableColumns .= ",\n        run: function(tv) {\n";
                if (strpos($table['js'], ";") === false) {
                    $tableColumns .= "return {$table['js']};\n}\n";
                } else {
                    $tableColumns .= $table['js']."\n}\n";
                }
            }
            $tableColumns .= "      },";
        }

        return
             "<script>\n"
            ."document.addEventListener('DOMContentLoaded', () = > {\n"
            ."  Trek = new TrekDatabase({\n"
            ."    tableName: '{$this->dbInfo['order'][0]}',\n"
            ."    tableColumns: {\n"
            .$tableColumns
            ."    }\n"
            ."  }\n"
            ."});\n"
            ."</script>\n";
    }
                    


}



