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

    public function testAddAndGetScripts()
    {
        $table = new Table("testtable", "testpage", '', CONFIG_TEST);

        $table->addJs('test3.js');

        $correct = 
             "<script src=\"".HTML_ROOT."js/test1.js\"></script>\n"
            ."<script src=\"".HTML_ROOT."js/test2.js\"></script>\n"
            ."<script src=\"".HTML_ROOT."js/table.js\"></script>\n"
            ."<script src=\"".HTML_ROOT."js/test3.js\"></script>\n";

        $this->assertEquals($correct, $table->getScripts());
    }

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
            ."<tr class=\"trek-form\">\n"
            ."<td></td>\n"
            ."<td><input type=\"text\" class=\"form-control\" "
            ."id=\"testcol1\" required></td>\n"
            ."<td><input type=\"text\" class=\"form-control readonly\" "
            ."id=\"testcol2\"></td>\n"
            ."<td></td>\n"
            ."<td><button type=\"submit\" class=\"btn btn-default\">Save"
            ."</button></td>\n"
            ."</tr>\n"
            ."</tbody>\n"
            ."</table>\n"
            ."</div>\n";

        $this->assertEquals($correct, $table->getTable());
    }

    public function testAddColAndGetFormElements()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');
        $correct = [
            'testcol1' => '<input type="text" class="form-control" id="testcol1" required>',
            'testcol2' => '<input type="text" class="form-control readonly" id="testcol2">',
            'controls' => '<button type="submit" class="btn btn-default">Save</button>'
        ];

        $this->assertEquals($correct, $table->getFormElements());
    }

    public function testCreateAndDropTable()
    {
        $table = new Table('testtable', 'title', '', CONFIG_TEST);
        $table->addDataCol('testcol','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');

        $this->assertEquals(SUCCESS, $table->dbCreateThisTable());
        $this->assertEquals(SUCCESS, $table->dbDropThisTable());
    }

    public function testDbSelectTableEmpty()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','tv.testcol1');
        $correct = ['success' => True, 'data' =>
            ['mainValues' => [], 'sideValues' => []]];

        $this->assertEquals($correct, $table->dbSelectThisTable());
    }

    public function testDbInsertAndDelete()
    {
        $table = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $table->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $table->addAutoCol('testcol2','Testcol2','testcol1');
        $data = ['testcol1' => 'exampledata3'];

        $table->dbCreateThisTable();
        $initstate = $table->dbSelectThisTable();
        $this->assertEquals(SUCCESS, $table->dbInsertIntoThis($data));
        $this->assertNotEquals($initstate, $table->dbSelectThisTable());
        $this->assertEquals(SUCCESS, $table->dbDeleteFromThis(1));
        $this->assertEquals($initstate, $table->dbSelectThisTable());
    }

    public function testDbSelect()
    {
        $t = new Table('testtable', 'testpage', '', CONFIG_TEST);
        $t->addDataCol('testcol1','VARCHAR','Testcol1','',True);
        $t->dbCreateThisTable();
        $t->dbInsertIntoThis(['testcol1' => 'exampledata']);
        $t->dbInsertIntoThis(['testcol1' => 'exampledata2']);
        $t->dbInsertIntoThis(['testcol1' => 'e3']);

        $result = [['id'=>'1', 'testcol1'=>'exampledata'],
            ['id'=>'2', 'testcol1'=>'exampledata2'],
            ['id'=>'3', 'testcol1'=>'e3']];
        $this->assertEquals($result, $t->dbSelect('testtable', ['id','testcol1'])['data']);
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
        $this->assertEquals(['success' => True], $table->dbAlterInThis(2,$data));
        $correct = [['id' => 1, 'testcol1' => 'exampledata1'],
                    ['id' => 2, 'testcol1' => 'modified data']];
        $columns = ['id', 'testcol1'];
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
        $this->assertEquals('{"success":true}',
            $table->processRequest($data_raw_insert));

        $this->assertEquals([['testcol1' => 'exampledata']],
            $table->dbSelect('testtable', ['testcol1'])['data']);

        $this->assertEquals('{"success":true}',
            $table->processRequest($data_raw_alter));

        $this->assertEquals([['testcol1' => 'changed example data']],
            $table->dbSelect('testtable', ['testcol1'])['data']);

        $this->assertEquals('{"success":true}',
            $table->processRequest($data_raw_delete));

        $correct = '{"success":true,'
            .'"data":{"mainValues":[],"sideValues":[]}}';
        $this->assertEquals($correct, 
            $table->processRequest($data_raw_select_page));

    }

    
}


?>
