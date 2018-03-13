<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
define('CONFIG_TEST', PHP_ROOT.'tests/testconfig.php');

$config = require(CONFIG_TEST);
$dbinfo = $config['database'];

define('SUCCESS', ['success' => True]);

require_once(PHP_ROOT."php/SqlDb.inc.php");

use PHPUnit\Framework\TestCase;

class SqlDbTest extends TestCase
{

    public function testConnect()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $this->assertEquals(SUCCESS, $p->dbConnect());
    }

    public function testTableNotExists()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $this->assertFalse($p->dbTableExists('testtable'));
    }

    public function testCreateTableAndExists()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $this->assertEquals(SUCCESS, $p->dbCreateTable('testtable'));
        $this->assertTrue($p->dbTableExists('testtable'));
    }

    public function testSelectEmpty()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True]];
        $p->dbCreateTable('testtable', $columns);
        $result = ['success' => True, 'data' => []];
        $this->assertEquals($result, $p->dbSelect('testtable'));
    }

    public function testInsertAndSelect()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True],
        ['name' => "tc2", 'type' => "VARCHAR"]];
        $p->dbCreateTable('testtable', $columns);

        $data = ['testcol' => 'testvalue', 'tc2' => "tv2"];
        $this->assertEquals(SUCCESS, $p->dbInsert('testtable', $data));
        $result = ['success' => True, 'data' => [['testtable_id' => "1", 'testcol' => 'testvalue']]];
        $this->assertEquals($result, $p->dbSelect('testtable', ['testtable_id', 'testcol']));
        $result2 = [['tc2' => "tv2"]];
        $this->assertEquals($result2, $p->dbSelect('testtable', ['tc2'])['data']);
    }

    public function testSelectExtended()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns = [['name' => "col", 'type' => "VARCHAR", 'required' => True]];
        $p->dbCreateTable('test', $columns);
        $p->dbInsert('test', ['col'=>'v1']);
        $p->dbInsert('test', ['col'=>'v2']);
        $p->dbInsert('test', ['col'=>'v3']);

        $c = ['test_id','col'];
        $this->assertEquals([['test_id'=>1,'col'=>'v1']], $p->dbSelect('test',$c,[],1)['data']);
        $this->assertEquals([['test_id'=>2,'col'=>'v2']], $p->dbSelect('test',$c,
            ['test_id' => 2])['data']);
        $this->assertEquals([['test_id'=>1,'col'=>'v1'],['test_id'=>2,'col'=>'v2'],['test_id'=>3,'col'=>'v3']], $p->dbSelect('test',$c,[],0,"BY test_id ASC")['data']);
    }

    public function testAlterAndDelete()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True]];
        $p->dbCreateTable('testtable', $columns);
        $p->dbInsert('testtable', ['testcol' => 'testvalue']);

        $data = ['testcol' => 'altered value'];
        $this->assertEquals(SUCCESS, $p->dbAlter('testtable', 1, $data));
        $result = ['success' => True, 'data' => [['testcol' => 'altered value']]];
        $this->assertEquals($result, $p->dbSelect('testtable', ['testcol']));
        $this->assertEquals(SUCCESS, $p->dbDelete('testtable', 1));
        $result = ['success' => True, 'data' => []];
        $this->assertEquals($result, $p->dbSelect('testtable'));
    }

    public function testQuery()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns = [['name' => "testcol", 'type' => "VARCHAR"]];
        $p->dbCreateTable('testtable', $columns);
        $p->dbInsert('testtable', ['testcol' => "testvalue"]);
        $this->assertEquals(['success' => True, 'data' => [['testcol' => "testvalue"]]], 
            $p->dbQuery("SELECT testcol FROM testtable;"));
    }


    public function testSelectJoin()
    {
        $config = require(CONFIG_TEST);
        $dbinfo = $config['database'];
        $p = new SqlDb($dbinfo);
        $columns1 = [['name' => "testcol", 'type' => "VARCHAR"]];
        $p->dbCreateTable('referencedTable', $columns1);
        $p->dbInsert('referencedTable', ['testcol' => "testvalue"]);
        $columns2 = [['name' => "testcol", 'type' => "VARCHAR"],['name' => "referencedTable_id", 'type' => "FOREIGN KEY"]];
        $p->dbCreateTable('testtable', $columns2);
        $p->dbInsert('testtable', ['referencedTable_id' => "1", 'testcol' => "v2"]);
        $result = ['success' => True, 'data' => [['testtable_id' => "1", 'testcol' => "v2", 'referencedTable_testcol' => "testvalue"]]];
        $this->assertEquals($result, $p->dbSelectJoin('testtable', ['testtable_id', 'testtable.testcol', 'referencedTable.testcol']));
    }


        

    
}


?>
