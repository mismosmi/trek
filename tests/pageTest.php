<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
define('CONFIG_TEST', PHP_ROOT.'tests/testconfig.php');

define('SUCCESS', ['success' => True]);

require_once(PHP_ROOT."php/page.inc.php");

use PHPUnit\Framework\TestCase;

class PageTest extends TestCase
{

    public function testAddAndGetScripts()
    {
        $page = new Page("testpage", '', CONFIG_TEST);

        $page->addJs('test3.js');

        $correct = 
             "<script src=\"".HTML_ROOT."js/test1.js\"></script>\n"
            ."<script src=\"".HTML_ROOT."js/test2.js\"></script>\n"
            ."<script src=\"".HTML_ROOT."js/test3.js\"></script>\n";

        $this->assertEquals($correct, $page->getScripts());
    }

    public function testNavigationMainExample()
    {
        $page = new Page("testpage", '', CONFIG_TEST);
        
        $correct = 
             "<ul class=\"navbar-nav\">\n"
            ."<li class=\"nav-item\">"
            ."<a class=\"nav-link\" href=\"../index.php\">"
            ."Home</a></li>\n"
            ."<li class=\"nav-item\">"
            ."<a class=\"nav-link\" href=\"../p/test.php\">"
            ."Test Page</a></li>\n"
            ."</ul>";

        $this->assertEquals($correct, $page->getMainNavigation());
    }

    public function testAddCssAndGetHead()
    {
        $page = new Page('testpage', 'specialfavicon.ico', CONFIG_TEST);
        $page->addCss('test3.css');

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
            ."<link rel=\"stylesheet\" type=\"text/css\" href=\"../css/test3.css\">\n"
            ."</head>\n";

        $this->assertEquals($correct, $page->getHead('And a specific description.'));
    }

    public function testGetNavbar()
    {
        $page = new Page('testpage', '', CONFIG_TEST);
        $correct = 
             "<nav class=\"navbar navbar-expand-md navbar-dark bg-dark fixed-top\">\n"
            ."<a href=\"index.php\" class=\"navbar-brand italic\">TEST</a>\n"
            .$page->getMainNavigation()."\n"
            ."</nav>\n";

        $this->assertEquals($correct, $page->getNavbar());
    }

    public function testDbConnect()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
        $this->assertEquals(SUCCESS, $p->dbConnect());
    }

    public function testDbTableNotExists()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
        $this->assertFalse($p->dbTableExists('testtable'));
    }

    public function testDbCreateTableAndExists()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
        $this->assertEquals(SUCCESS, $p->dbCreateTable('testtable'));
        $this->assertTrue($p->dbTableExists('testtable'));
    }

    public function testDbSelectEmpty()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True]];
        $p->dbCreateTable('testtable', $columns);
        $result = ['success' => True, 'data' => []];
        $this->assertEquals($result, $p->dbSelect('testtable'));
    }

    public function testDbInsertAndSelect()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
        $columns = [['name' => "testcol", 'type' => "VARCHAR", 'required' => True]];
        $p->dbCreateTable('testtable', $columns);

        $data = ['testcol' => 'testvalue'];
        $this->assertEquals(SUCCESS, $p->dbInsert('testtable', $data));
        $result = ['success' => True, 'data' => [['id' => 1, 'testcol' => 'testvalue']]];
        $this->assertEquals($result, $p->dbSelect('testtable', ['id', 'testcol']));
    }

    public function testDbAlterAndDelete()
    {
        $p = new Page('testpage', '', CONFIG_TEST);
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

        

    
}


?>
