<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

require_once(PHP_ROOT."php/RestApi.inc.php");

use PHPUnit\Framework\TestCase;

class PageTest extends TestCase
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
        $result = json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "schema"]));
        $this->assertTrue($result['success']);
        $this->assertEquals([], $result['data']);
        $this->assertEquals("Successfully created table \"schema\".", $result['info']);
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
            'tableName' => "schema",
            'data' => ['datacolumn' => "testvalue", 'foreigntable_id' => 1]
        ]));
        $this->assertArraySubset([
            'data' => [
                '1' => [
                    'testcolumn' => "testvalue", 
                    'foreigntable_id' => 1, 
                    'foreigntable_foreigncolumn' => "foreign value"
                ]
            ]
        ], $result);
    }

    public function testRefresh()
    {
        $result = json_decode($this->api->processRequest(['operation' => "SELECT", 'tableName' => "testtable"]));
        $this->assertTrue($result['success']);
        $this->assertEquals([], $result['data']);
        $time0 = $result['time'];
        $result = json_decode($this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => ['testcolumn' => "testvalue"]
        ]));
        $time1 = $result['time'];
        $result = json_decode($this->api->processRequest([
            'operation' => "SELECT", 
            'tableName' => "testtable",
            'lastUpdate' => $time0
        ]));
        $this->assertEquals("testvalue", $result['data']['1']['datacolumn']);
        $result = json_decode($this->api->processRequest([
            'operation' => "SELECT", 
            'tableName' => "testtable",
            'lastUpdate' => $time1
        ]));
        $this->assertEquals([], $result['data']);
    }

    public function testAlter()
    {
        $this->api->processRequest([
            'operation' => "INSERT", 
            'tableName' => "testtable",
            'data' => ['testcolumn' => "testvalue"]
        ]);
        $result = json_decode($this->api->processRequest([
            'operation' => "ALTER",
            'tableName' => "testtable",
            'row' => 1,
            'data' => ['testcolumn' => "other value"]
        ]));
        $this->assertEquals(['1' => ['testcolumn' => "other value"]]);
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
            'row' => 1
        ]));
        $this->assertEquals(['1' => ['deleted' => true], '2' => ['testcolumn' => "testvalue 2"]]);
    }
}

