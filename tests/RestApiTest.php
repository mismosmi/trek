<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

require_once(PHP_ROOT."php/RestApi.inc.php");

use PHPUnit\Framework\TestCase;

class RestApiTest extends TestCase
{
    protected $api;
    protected function setUp()
    {
        $this->api = new RestApi('schemadb', 'tests/testconfig.json');
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "schematable"]);
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "foreigntable"]);
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "testtable"]);
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "numerictable"]);
    }

    public function testSelect()
    {
        echo "TESTSELECT\n";
        $this->assertArraySubset(
            ['success' => true, 'data' => []],
            json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "schematable"]), true)
        );
    }

    public function testInsert()
    {
        $this->api->processRequest([
            'operation' => "INSERT",
            'tableName' => "foreigntable",
            'data' => ['foreigncolumn' => "foreign value"]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "INSERT",
            'tableName' => "schematable",
            'data' => ['datacolumn' => "testvalue", 'foreigntable_id' => 1]
        ]), true);
        $this->assertArraySubset([
            'datacolumn' => "testvalue", 
            'foreigntable_id' => 1
        ], $result['data'][1]);
    }

    public function testRefresh()
    {
        echo "REFRESH\n";
        $result = json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "testtable"]),true);
        $this->assertTrue($result['success']);
        $this->assertEquals([], $result['data']);
        $time0 = $result['time'];
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => ['testcolumn' => "testvalue"]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "SELECT", 
            'tableName' => "testtable",
            'lastUpdate' => $time0
        ]),true);
        $this->assertArraySubset(['data' => [1 => ['testcolumn' => "testvalue"]]], $result);
    }

    public function testAlter()
    {
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => [['testcolumn' => "testvalue"]]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "ALTER",
            'tableName' => "testtable",
            'row' => 1,
            'data' => ['testcolumn' => "other value"]
        ]),true);
        $this->assertArraySubset(['data' => [1 => ['testcolumn' => "other value"]]], $result);
    }

    public function testDelete()
    {
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => ['testcolumn' => "testvalue 1"]
        ]);
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => ['testcolumn' => "testvalue 2"]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "DELETE",
            'tableName' => "testtable",
            'lastUpdate' => date('Y-m-d G:i:s'),
            'row' => 1
        ]),true);
        $this->assertArraySubset(['data' => [
            1 => ['deleted' => true],
            2 => ['testcolumn' => "testvalue 2"]
        ]], $result);
    }


}

