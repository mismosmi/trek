<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

define('SUCCESS', ['success' => True]);

require_once(PHP_ROOT."php/SqlDb.inc.php");
require_once(PHP_ROOT."php/RestApi.inc.php");

use PHPUnit\Framework\TestCase;


class MySqlTest extends TestCase {

    protected $db;
    public function setUp()
    {
        $config = json_decode(file_get_contents(PHP_ROOT.'tests/mysqlconfig.json'), true);
        $this->db = new SqlDb($config['database']);
    }


    public function testSqlDb()
    {
        $this->assertEquals([
            'success' => true, 
            'info' => "Successfully created table \"mysqltest\"."
        ], $this->db->dbCreateTable('mysqltest'));
        $this->assertTrue($this->db->dbTableExists('mysqltest'));
        $this->assertEquals(['success' => true, 'data' => []],
            $this->db->dbSelectJoin(['name' => "mysqltest", 'columns' => []],[]));
        $this->assertEquals(SUCCESS, $this->db->dbInsert('mysqltest', []));
        $this->assertArraySubset(
            ['success' => true, 'data' => [1 =>[]]], 
            $this->db->dbSelectJoin(['name' => "mysqltest", 'columns' => []], [])
        );
        $this->assertEquals(SUCCESS, $this->db->dbDropTable('mysqltest'));
    }

    public function testRestApi()
    {
        $api = new RestApi('schemadb', 'tests/mysqlconfig.json');
        $this->assertArraySubset(SUCCESS, json_decode($api->processRequest(['operation'=>"SELECT", 'tableName'=>"schematable"]),true));
        $this->db->dbDropTable('testtable');
        $this->assertArraySubset(SUCCESS, json_decode($api->processRequest(['operation'=>"SELECT", 'tableName'=>"testtable"]),true));
        $result =  json_decode($api->processRequest(['operation'=>"INSERT", 'tableName' => "testtable", 'data' => [['testcolumn' => "test"]], 'lastUpdate' => "2018-03-22 13:00:00"]),true);
        var_dump($result);
        $this->assertArraySubset(
            ['success' => true, 'data' => [1 => ['testcolumn' => "test"]]],
            $result
        );
        var_dump($api->processRequest(['operation'=> "SELECT", 'tableName'=>"schematable"]));
        

    }

}
