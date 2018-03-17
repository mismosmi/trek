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
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "schema"]);
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "foreigntable"]);
        $this->api->processRequest(['operation' => "SELECT", 'tableName' => "testtable"]);
    }

    public function testSelect()
    {
        echo "TESTSELECT\n";
        $this->assertArraySubset(
            ['success' => true, 'data' => []],
            json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "schema"]), true)
        );
    }

    public function testInsert()
    {
        $this->api->processRequest([
            'operation' => "INSERT",
            'tableName' => "foreigntable",
            'data' => [['foreigncolumn' => "foreign value"]]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "INSERT",
            'tableName' => "schema",
            'data' => [['datacolumn' => "testvalue", 'foreigntable_id' => 1]]
        ]), true);
        $this->assertArraySubset([
            'id' => 1,
            'deleted' => 0,
            'datacolumn' => "testvalue", 
            'foreigntable_id' => 1, 
            'foreigntable_deleted' => 0,
            'foreigntable_foreigncolumn' => "foreign value"
        ], $result['data'][0]);
    }

    public function testRefresh()
    {
        echo "REFRESH\n";
        $result = json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "testtable"]),true);
        $this->assertTrue($result['success']);
        $this->assertEquals([], $result['data']);
        $time0 = $result['time'];
        $result = json_decode($this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => [['testcolumn' => "testvalue"]]
        ]),true);
        $result = json_decode($this->api->processRequest([
            'operation' => "SELECT", 
            'tableName' => "testtable",
            'lastUpdate' => $time0
        ]),true);
        $this->assertArraySubset(['data' => [['id' => 1, 'deleted' => 0, 'testcolumn' => "testvalue"]]], $result);
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
            'data' => [['id' => 1, 'testcolumn' => "other value"]]
        ]),true);
        $this->assertArraySubset(['data' => [['id' => '1', 'deleted' => false, 'testcolumn' => "other value"]]], $result);
    }

    public function testDelete()
    {
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => [['testcolumn' => "testvalue 1"]]
        ]);
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => [['testcolumn' => "testvalue 2"]]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "DELETE",
            'tableName' => "testtable",
            'data' => [['id' => 1]]
        ]),true);
        $this->assertArraySubset(['data' => [
            ['id' => 1, 'deleted' => true, 'testcolumn' => "testvalue 1"],
            ['id' => 2, 'deleted' => false, 'testcolumn' => "testvalue 2"]
        ]], $result);
    }
}

