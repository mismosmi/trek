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
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    * @param string $activeTable specify active table
    */
    public function __construct(
        $dbName,
        $favicon = '',
        $configFile = '',
        $activeTable = ''
    ) 
    {
        $this->dbName = $dbName;
        parent::__construct(NULL, $favicon, $configFile);
        $this->dbInfo = json_decode(file_get_contents(PHP_ROOT.$this->config['pages'][$dbName]['path']), true);
        $this->title = $this->dbInfo['title'].' | '.$this->dbInfo['sheets'][$activeTable]['title'];

        $this->activeTable = $activeTable ?: $this->dbInfo['order'][0];

        $this->addCss('css/fontawesome.min.css');
        $this->addCss('css/fa-solid.min.css');
        $this->addCss('css/trekdb.css');
        $this->addJs("js/JsBarcode/dist/JsBarcode.all.min.js");
        $this->addJs('js/jquery-3.2.1.min.js');
        $this->addJs('js/trekdb.js');
        if (array_key_exists('user', $this->dbInfo)) {
            switch ($this->dbInfo['user']) {
            case 'simple':
                $this->addJs('js/treksimpleuserlock.js');
                $this->addCss('css/trekuserlock.css');
                break;
            }
        }
        
    }

    /**
     * return Database Title
     */
    public function getTitle() 
    {
        return $this->dbInfo['title'];
    }

    /**
     * check if this tables gets its columns from another table via column_reference
     *
     * @param string tableName  Name of requested Table
     * @return array columns
     */
    private function getColumns($tableName)
    {
        if (array_key_exists("column_reference", $this->dbInfo['sheets'][$tableName])) 
            return $this->dbInfo['sheets'][$this->dbInfo['sheets'][$tableName]['column_reference']]['columns'];
        return $this->dbInfo['sheets'][$tableName]['columns'];
    }

    /**
     * generate html table with necessary id
     *
     * @return string <table> tag
     */
    // DEPRECATED, table now generated from js
    //public function getTable()
    //{
    //    return "<table class=\"table\" id=\"trek-table\"><thead></thead><tbody></tbody></table>\n";
    //}

    /**
     * generate navigation for table-tabs
     */
    public function getDbNav()
    {
        $tabs = "";
        foreach ($this->dbInfo['order'] as $name) {
            $data = $this->dbInfo['sheets'][$name];
            $active = $name == $this->activeTable ? " class=\"is-active\"" : "";
            $tabs .= "  <li$active data-sheet=\"$name\"><a onclick=\"Trek.selectTab(this)\">{$data['title']}</a></li>\n";
        }
        return 
             "<div class=\"tabs\" id=\"trek-db-nav\">\n"
            ." <ul>\n"
            .$tabs
            ." </ul>\n"
            ."</div>\n";
    }

    public function getDbControls() 
    {
        $dbControls = "<div class=\"is-pulled-right\">";
        if (array_key_exists('user', $this->dbInfo)) {
            $dbControls .= "<span class=\"tag is-success is-medium is-pulled-left\"><span id=\"username\"></span><button id=\"trek-switch-user\" class=\"delete is-small\"></button></span>";
        }
        $dbControls .= "<div class=\"buttons has-addons\"><span id=\"trek-print-button\" class=\"button is-link\" disabled>Print</span><span id=\"trek-edit-button\" class=\"button is-primary\" disabled>Edit</span></div>";
        $dbControls .= "</div>";
        return $dbControls;
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
     * recursively get all Data fields from this table and any referenced tables
     *
     * @param array $hierarchy  the hierarchy recursed tables
     * @return string the resulting javascript code
     */ 
    // DEPRECATED in favour of doing it all in js
    //private function getDataColumns($hierarchy, $baseTable)
    //{
    //    $tableColumns = '';
    //    foreach ($this->getColumns(end($hierarchy)) as $fcol) {
    //        if ($fcol['class'] === 1) {
    //            $symbol = $this->getSymbol($fcol['type']);
    //            $prefix = implode("_", $hierarchy);
    //            $tableColumns .= 
    //                "        {\n"
    //                ."           name: \"{$prefix}_{$fcol['name']}\",\n"
    //                ."           class: 4,\n" // Foreign Data Column
    //                ."           type: \"{$fcol['type']}\",\n"
    //                ."           symbol: \"$symbol\",\n"
    //                ."        },\n";
    //        } elseif (
    //            (
    //                $fcol['class'] === 3 //|| 
    //                //($fcol['class'] === 2 && array_key_exists('table', $fcol)) 
    //            ) &&
    //            !in_array($fcol['table'], $hierarchy) &&
    //            $fcol['table'] !== $baseTable
    //        ) {
    //            $hierarchy[] = $fcol['table'];
    //            $tableColumns .= $this->getDataColumns($hierarchy, $baseTable);
    //            array_pop($hierarchy);
    //        }
    //    }
    //    return $tableColumns;
    //}



    /**
     * generate script
     */
    public function getScript()
    {
        $sheets = '';
        foreach ($this->dbInfo['sheets'] as $tableName => $sheet) {
            $title = $this->dbInfo['sheets'][$tableName]['title'];
            $sheets .= 
                 "      '$tableName': { title: \"$title\", columns: [\n";
            foreach ($this->getColumns($tableName) as $column) {
                $js = "";
                $barcode = "";

                if ($column['class'] === 0) {
                    switch ($column['name']) {
                    case 'id':
                        $column['type'] = 'int';
                        if (array_key_exists('barcode', $column)) 
                            $barcode = "           barcode: \"{$column['barcode']}\",\n";
                        break;
                    case 'createdate':
                    case 'modifieddate':
                        $column['type'] = 'timestamp';
                        break;
                    case 'createuser':
                    case 'modifieduser':
                        $column['type'] = 'username';
                        break;
                    }
                }

                $default = ($column['class'] === 1 && array_key_exists('default', $column))
                    ? "           default: \"{$column['default']}\"\n,"
                    : "";

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

                if ($column['class'] === 1 || $column['class'] === 3) {
                    $required = $column['required'] 
                        ? "           required: true,\n"
                        : "           required: false,\n";
                } else $required = "";

                if ($column['class'] === 3) {
                    $column['name'] = "{$column['table']}_id";
                    $table = "           table: \"{$column['table']}\",\n";
                } else {
                    $table = "";
                }

                $symbol = $this->getSymbol($column['type']);
                $sheets .=
                    "        {\n"
                    ."           name: \"{$column['name']}\",\n"
                    ."           class: {$column['class']},\n"
                    ."           title: \"{$column['title']}\",\n"
                    ."           type: \"{$column['type']}\",\n"
                    ."           symbol: \"$symbol\",\n"
                    .$table
                    .$barcode
                    .$required
                    .$default
                    .$js
                    ."        },\n";
            }
            $sheets .= "      ] },\n";
        }

        $ajaxUrl = HTML_ROOT."php/api.php?db=".$this->dbName;
        $printStylesheet = HTML_ROOT."css/trekdb_print.css";
        $user = array_key_exists('user', $this->dbInfo) ? "    user: \"{$this->dbInfo['user']}\",\n" : "";

        return
             "<script>\n"
            ."document.addEventListener('DOMContentLoaded', () => {\n"
            ."  Trek = new TrekDatabase({\n"
            ."    ajaxUrl: \"$ajaxUrl\",\n"
            ."    title: \"{$this->dbInfo['title']}\",\n"
            .$user
            ."    sheets: {\n"
            .$sheets
            ."    },\n"
            ."    printInfo: {\n"
            ."      stylesheet: \"$printStylesheet\"\n"
            ."    }\n"
            ."  });\n"
            ."});\n"
            ."</script>\n";
    }
                    


}



