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
        $result = "<form id=\"trek-form\" onsubmit=\"Trek.submit(this)\"><table class=\"table\" id=\"trek-table\"><thead></thead><tbody></tbody></table></form>\n";
        $this->assertEquals($result, $this->db->getTable());
    }

    public function testDbNav()
    {
        $result = 
            "<div class=\"tabs\" id=\"trek-db-nav\">\n"
            ." <ul>\n"
            ."  <li class=\"is-active\" data-table=\"schematable\"><a onclick=\"Trek.selectTable(this)\">Schema</a></li>\n"
            ."  <li data-table=\"foreigntable\"><a onclick=\"Trek.selectTable(this)\">Foreign Table</a></li>\n"
            ."  <li data-table=\"testtable\"><a onclick=\"Trek.selectTable(this)\">Test Table</a></li>\n"
            ."  <li data-table=\"numerictable\"><a onclick=\"Trek.selectTable(this)\">Numeric Table</a></li>\n"
            ." </ul>\n"
            ."</div>\n";
        $this->assertEquals($result, $this->db->getDbNav());
    }

} 
