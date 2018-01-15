<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
define('CONFIG_TEST', PHP_ROOT.'tests/testconfig.php');
define('SUCCESS', ['success' => True]);

require_once(PHP_ROOT."php/table.inc.php");

use PHPUnit\Framework\TestCase;

class TableTest extends TestCase
{

    public function testNavigationMainExample()
    {
        $table = new Table("testtable", "testpage", '', CONFIG_TEST);
        
        $correct = 
             "<ul class=\"navbar-nav\">\n"
            ."<li class=\"nav-item\">"
            ."<a class=\"nav-link\" href=\"../index.php\">"
            ."Home</a></li>\n"
            ."<li class=\"nav-item\">"
            ."<a class=\"nav-link\" href=\"../p/test.php\">"
            ."Test Page</a></li>\n"
            ."</ul>";

        $this->assertEquals($correct, $table->getMainNavigation());
    }

    public function testAddCssAndGetHead()
    {
        $table = new Table('testtable', 'testpage', 'specialfavicon.ico', CONFIG_TEST);
        $table->addCss('test3.css');

        $correct =
             "<head>\n"
            ."<title>TEST | testpage</title>\n"
            ."<meta charset=\"utf-8\">\n"
            ."<meta name=\"viewport\" content=\"width=device-width, "
            ."initial-scale=1, shrink-to-fit=no\">\n"
            ."<meta name=\"description\" content="
            ."\"Test - a unit test. And a specific description.\">\n"
            ."<meta name=\"author\" content=\"Michel Smola\">\n"
            ."<link rel=\"icon\" href=\"specialfavicon.ico\">\n"
            ."<link rel=\"stylesheet\" type=\"text/css\" href=\"../css/test1.css\">\n"
            ."<link rel=\"stylesheet\" type=\"text/css\" href=\"../css/test2.css\">\n"
            ."<link rel=\"stylesheet\" type=\"text/css\" href=\"../css/table.css\">\n"
            ."<link rel=\"stylesheet\" type=\"text/css\" href=\"../css/test3.css\">\n"
            ."</head>\n";

        $this->assertEquals($correct, $table->getHead('And a specific description.'));
    }

    public function testGetNavbar()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $correct = 
             "<nav class=\"navbar navbar-expand-md navbar-dark bg-dark fixed-top\">\n"
            ."<a href=\"index.php\" class=\"navbar-brand italic\">TEST</a>\n"
            .$table->getMainNavigation()."\n"
            ."</nav>\n";

        $this->assertEquals($correct, $table->getNavbar());
    }

    public function testAddColAndGetTable()
    {
        $table = new Table('testtable', 'Testpage', '', CONFIG_TEST);
        $table->setIdCol('Test-ID');
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');
        $correct =
             "<div class=\"trek-table\" id=\"table-testtable\">\n"
            ."<table class=\"table-striped table-hover table-condensed col\">\n"
            ."<thead>\n"
            ."<tr>\n"
            ."<th data-col=\"testtable-id\">Test-ID</th>\n"
            ."<th data-col=\"testcol1\">Testcol1</th>\n"
            ."<th data-col=\"testcol2\">Testcol2</th>\n"
            ."<th data-col=\"timestamp\">Edited</th>\n"
            ."<th data-col=\"controls\"></th>\n"
            ."</tr>\n"
            ."</thead>\n"
            ."<tbody>\n"
            ."</tbody>\n"
            ."</table>\n"
            ."</div>\n";

        $this->assertEquals($correct, $table->getTable());
    }

    public function testCreateAndDropTable()
    {
        $table = new Table('testtable', 'title', '', CONFIG_TEST);
        $table->addDataCol('testcol','VARCHAR(30)','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');

        $this->assertEquals(SUCCESS, $table->dbCreateThisTable());
        $this->assertEquals(SUCCESS, $table->dbDropThisTable());
    }

    public function testDbSelectTableEmpty()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR(30)','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','tv.testcol1');
        $table->dbCreateThisTable();
        $correct = ['success' => True, 'data' =>
            ['mainValues' => [], 'sideValues' => []]];

        $this->assertEquals($correct, $table->dbSelectThisTable());
    }

    public function testDbInsertAndDelete()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR(30)','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');
        $data = ['testcol1' => 'exampledata3'];
        $result = ['success' => True, 'data' => ['testcol1' => 'exampledata3']];

        $table->dbCreateThisTable();
        $initstate = $table->dbSelectThisTable();
        $result = $table->dbInsertIntoThis($data);
        $this->assertTrue($result['success']);
        $this->assertEquals('exampledata3',$result['data'][0]['testcol1']);
        $this->assertEquals('1',$result['data'][0]['testtable_id']);
        $this->assertNotEquals($initstate, $table->dbSelectThisTable());
        $this->assertEquals(['success' => True, 'row' => 1], $table->dbDeleteFromThis(1));
        $this->assertEquals($initstate, $table->dbSelectThisTable());
    }

    public function testDbAlter()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');

        $table->dbCreateThisTable();
        $table->dbInsertIntoThis(['testcol1'=>'exampledata1']);
        $table->dbInsertIntoThis(['testcol1'=>'exampledata2']);
        
        $data = ['testcol1' => 'modified data'];
        $result = $table->dbAlterInThis('2',$data)['data'][0];
        $this->assertEquals(2, $result['testtable_id']);
        $this->assertEquals('modified data', $result['testcol1']);
        $correct = [['testtable_id' => 2, 'testcol1' => 'modified data'],
                    ['testtable_id' => 1, 'testcol1' => 'exampledata1']];
        $columns = ['testtable_id', 'testcol1'];
        $this->assertEquals($correct, $table->dbSelect('testtable', $columns)['data']);
    }

    public function testProcessRequest()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');
        $data_raw_insert = ["operation" => "INSERT", 
            "data" => ["testcol1" => "exampledata"]];
        $data_raw_select_page = ["operation" => "SELECT TABLE"];
        $data_raw_alter = ["operation" => "ALTER",
            "row" => 1, 
            "data" => ["testcol1" => "changed example data"]];
        $data_raw_delete = ["operation" => "DELETE", "row" => 1];

        $table->dbCreateThisTable();
        $table->processRequest($data_raw_insert);

        $this->assertEquals([['testcol1' => 'exampledata']],
            $table->dbSelect('testtable', ['testcol1'])['data']);

        $table->processRequest($data_raw_alter);

        $this->assertEquals([['testcol1' => 'changed example data']],
            $table->dbSelect('testtable', ['testcol1'])['data']);

        $table->processRequest($data_raw_delete);

        $correct = '{"success":true,'
            .'"data":{"mainValues":[],"sideValues":[]}}';
        $this->assertEquals($correct, 
            $table->processRequest($data_raw_select_page));

    }

    
}


?>
