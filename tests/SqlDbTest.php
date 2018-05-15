<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

define('SUCCESS', ['success' => True]);

require_once(PHP_ROOT."php/SqlDb.inc.php");

use PHPUnit\Framework\TestCase;

class SqlDbTest extends TestCase
{
    protected $db;
    protected function setUp()
    {
        $config = json_decode(file_get_contents(PHP_ROOT.'tests/testconfig.json'), true);
        $this->db = new SqlDb($config['database']);
    }

    public function testConnect()
    {
        $this->assertEquals(SUCCESS, $this->db->dbConnect());
    }

    public function testTableNotExists()
    {
        $this->assertFalse($this->db->dbTableExists('testtable'));
    }

    public function testCreateTableAndExists()
    {
        $this->assertEquals([
            'success' => true, 
            'info' => "Successfully created table \"testtable\"."
        ], $this->db->dbCreateTable('testtable'));
        $this->assertTrue($this->db->dbTableExists('testtable'));
    }

    public function testSelectEmpty()
    {
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True, 'class' => 1]];
        $this->assertTrue($this->db->dbCreateTable('testtable', $columns)['success']);
        $result = ['success' => True, 'data' => []];
        $this->assertEquals($result, $this->db->dbSelect('testtable'));
    }

    public function testInsertAndSelect()
    {
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True, 'class' => 1],
        ['name' => "tc2", 'type' => "VARCHAR", 'class' => 1]];
        $this->db->dbCreateTable('testtable', $columns);

        $data = ['testcol' => 'testvalue', 'tc2' => "tv2"];
        $this->assertEquals(SUCCESS, $this->db->dbInsert('testtable', $data));
        $result = ['success' => True, 'data' => [['id' => "1", 'testcol' => 'testvalue']]];
        $this->assertEquals($result, $this->db->dbSelect('testtable', ['id', 'testcol']));
        $result2 = [['tc2' => "tv2"]];
        $this->assertEquals($result2, $this->db->dbSelect('testtable', ['tc2'])['data']);
    }

    public function testSelectExtended()
    {
        $columns = [['name' => "col", 'type' => "VARCHAR", 'required' => True, 'class' => 1]];
        $this->db->dbCreateTable('test', $columns);
        $this->db->dbInsert('test', ['col'=>'v1']);
        $this->db->dbInsert('test', ['col'=>'v2']);
        $this->db->dbInsert('test', ['col'=>'v3']);

        $c = ['id','col'];
        $this->assertEquals([['id'=>1,'col'=>'v1']], $this->db->dbSelect('test',$c,[],1)['data']);
        //$this->assertEquals(['success'=>true, 'data'=>[['id'=>2,'col'=>'v2']]], $this->db->dbSelect('test',$c,['id =' => 2]));
        $this->assertEquals(['success'=>true, 'data'=>[['id'=>2,'col'=>'v2']]], $this->db->dbSelect('test',$c,['id = 2']));
        $this->assertEquals(['success'=>true, 'data'=>[['id'=>1,'col'=>'v1'],['id'=>2,'col'=>'v2'],['id'=>3,'col'=>'v3']]], $this->db->dbSelect('test',$c,[],0,"BY id ASC"));
    }

    public function testAlterAndDelete()
    {
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True, 'class' => 1]];
        $this->db->dbCreateTable('testtable', $columns);
        $this->db->dbInsert('testtable', ['testcol' => 'testvalue']);

        $data = ['testcol' => 'altered value'];
        $this->assertEquals(SUCCESS, $this->db->dbAlter('testtable', 1, $data));
        $result = ['success' => True, 'data' => [['testcol' => 'altered value']]];
        $this->assertEquals($result, $this->db->dbSelect('testtable', ['testcol']));
        $this->assertEquals(SUCCESS, $this->db->dbDelete('testtable', 1));
        $result = ['success' => True, 'data' => []];
        $this->assertEquals($result, $this->db->dbSelect('testtable'));
    }

    public function testQuery()
    {
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'class' => 1]];
        $this->db->dbCreateTable('testtable', $columns);
        $this->db->dbInsert('testtable', ['testcol' => "testvalue"]);
        $this->assertEquals(['success' => True, 'data' => [['testcol' => "testvalue"]]], 
            $this->db->dbQuery("SELECT testcol FROM testtable;"));
    }


    public function testSelectJoin()
    {
        $columns1 = [['name' => "testcol", 'type' => "VARCHAR", 'class' => 1]];
        $this->db->dbCreateTable('referencedTable', $columns1);
        $this->db->dbInsert('referencedTable', ['testcol' => "testvalue"]);
        $columns2 = [['name' => "testcol", 'type' => "VARCHAR", 'class' => 1],
            ['table' => "referencedTable", 'type' => "FOREIGN KEY", 'class' => 3]];
        $this->db->dbCreateTable('testtable', $columns2);
        $this->db->dbInsert('testtable', ['referencedTable_id' => "1", 'testcol' => "v2"]);
        $result = ['success' => True, 'data' => [1 => ['testcol' => "v2", 'referencedTable_testcol' => "testvalue"]]];
        $this->assertArraySubset($result, $this->db->dbSelectJoin(
            ['name' => "testtable", 'columns' => [["name" => "testcol", 'class' => 1, 'type' => "VARCHAR"]]], 
            [[
                'name' => "referencedTable", 
                'columns' => [['name' => "testcol", 'class'=>1, 'type'=>"VARCHAR"]], 
                'referenceType' => "left", 
                'referenceTable' => "testtable", 
                'prefix' => "referencedTable"
            ]]
        ));
        $result = ['success' => true, 'data' => [1 => ['testcol' => "testvalue", 'testtable_testcol' => ["v2"]]]];
        $this->assertArraySubset($result, $this->db->dbSelectJoin(
            ['name' => "referencedTable", 'columns' => [['name' => "testcol", 'class' => 1, 'type' => "VARCHAR"]]],
            [[
                'name' => "testtable", 
                'referenceType' => "right", 
                'columns' => [['name' => "testcol", 'class' => 1, 'type' => "VARCHAR"]],
                'referenceTable' => "referencedTable",
                'prefix' => "testtable"
            ]]
        ));
    }

    public function testDouble()
    {
        $columns = [['name' => "doublecol", 'type' => "DOUBLE", 'class' => 1]];
        $this->assertArraySubset(SUCCESS, $this->db->dbCreateTable('testtable', $columns));
    }

    public function testDeepReference()
    {
        $columns1 = [
            ['name' => "testcol", 'type' => "VARCHAR", 'class' => 1]
        ];
        $this->db->dbCreateTable('deepReferencedTable', $columns1);
        $this->db->dbInsert('deepReferencedTable', ['testcol' => "testvalue"]);
        $columns2 = [
            ['table' => "deepReferencedTable", 'type' => "FOREIGN KEY", 'class' => 3]
        ];
        $this->db->dbCreateTable('referencedTable', $columns2);
        $this->db->dbInsert('referencedTable', ['deepReferencedTable_id' => "1"]);
        $columns3 = [
            ['table' => "referencedTable", 'type' => "FOREIGN KEY", 'class' => 3]
        ];
        $this->db->dbCreateTable('testtable', $columns3);
        $this->db->dbInsert('testtable', ['referencedTable_id' => "1"]);
        $result = ['success' => true, 'data' => [1 => [
            'referencedTable_deepReferencedTable_testcol' => "testvalue",
            'referencedTable_deepReferencedTable_id' => 1
        ]]];
        $this->assertArraySubset($result, $this->db->dbSelectJoin(
            ['name' => "testtable", 'columns' => []],
            [[
                'name' => "referencedTable",
                'referenceType' => "left",
                'columns' => [['name' => "deepReferencedTable_id", 'class' => 3]],
                'referenceTable' => "testtable",
                'prefix' => "referencedTable"
            ],[
                'name' => "deepReferencedTable",
                'referenceType' => "left",
                'columns' => [['name' => "testcol", 'type' => "VARCHAR", 'class' => 1]],
                'referenceTable' => "referencedTable",
                'prefix' => "referencedTable_deepReferencedTable"
            ]]
        ));
    }


}



