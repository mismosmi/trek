<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

require_once(PHP_ROOT."php/Database.inc.php");

use PHPUnit\Framework\TestCase;

class DatabaseTest extends TestCase
{
    protected $db;
    protected function setUp()
    {
        $this->db = new Database('schemadb', null, null, 'tests/testconfig.json');
    }

    public function testTable()
    {
        $result = '<table class="table" id="trek-table"><thead></thead><tbody></tbody></table>';
        $this->assertEquals($result, $this->db->getTable());
    }

    public function testDbNav()
    {
        $result = 
            "<div class=\"tabs\" id=\"trek-table-nav\">\n"
            ." <ul>\n"
            ."  <li data-table=\"schema\" onclick=\"Trek.selectTable(this)\">Schema</li>\n"
            ."  <li data-table=\"foreigntable\" onclick=\"Trek.selectTable(this)\">Foreign Table</li>\n"
            ."  <li data-table=\"testtable\" onclick=\"Trek.selectTable(this)\">Test Table</li>\n"
            ." </ul>\n"
            ."</div>\n";
        $this->assertEquals($result, $this->db->getDbNav());
    }

} 
