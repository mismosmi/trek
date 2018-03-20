<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));

require_once(PHP_ROOT."php/Page.inc.php");

use PHPUnit\Framework\TestCase;

class PageTest extends TestCase
{
    protected $p;
    protected function setUp()
    {
        $this->p = new Page(null,null,"tests/testconfig.json");
    }

    public function testMainNavigation()
    {
        $result = 
             "<div class=\"navbar-menu\">\n"
            ." <div class=\"navbar-start\"></div>\n"
            ." <div class=\"navbar-end\">\n"
            ."  <a class=\"navbar-item\" href=\"../index.php\">Home</a>\n"
            ."  <a class=\"navbar-item\" href=\"../php/db.php?db=schemadb\">Schema Database</a>\n"
            ." </div>\n"
            ."</div>\n";
        $this->assertEquals($result, $this->p->getMainNavigation());
    }

    public function testNavbar()
    {
        $result =
             "<nav class=\"navbar\" role=\"navigation\" aria-label=\"main navigation\">\n"
            ." <div class=\"navbar-brand\">\n"
            ."  <a href=\"index.php\" class=\"navbar-item is-italic\">TEST</a>\n"
            ."  <div class=\"navbar-burger\"><span></span><span></span><span></span></div>\n"
            ." </div>\n"
            .$this->p->getMainNavigation()
            ."</nav>\n";
        $this->assertEquals($result, $this->p->getNavbar());
    }

    public function testHead()
    {
        $result = 
             "<head>\n"
            ." <title>TEST</title>\n"
            ." <meta charset=\"utf-8\">\n"
            ." <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\">\n"
            ." <meta name=\"description\" content=\"Test - a unit test. Some more description.\">\n"
            ." <meta name=\"author\" content=\"Michel Smola\">\n"
            ." <link rel=\"icon\" href=\"favicon.ico\">\n"
            ." <link rel=\"stylesheet\" type=\"text/css\" href=\"css/test.css\">\n"
            ." <script defer src=\"js/test.js\"></script>\n"
            ."</head>\n";
        $this->p->addCss("css/test.css");
        $this->p->addJs("js/test.js");
        $this->assertEquals($result, $this->p->getHead("Some more description."));
    }
}


