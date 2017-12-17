<?php

echo '0';
require_once('../config/config.php');
echo '1';
require_once('../config/pages.php');
echo '2';

class site_builder {
    private $include_js = $config->default_js;
    private $include_css = $config->default_css;
    public $favicon = $config->favicon;
    private $cssdir;
    private $jsdir;

    function __construct($basepath = ''){
        $this->cssdir = $basepath.'css/';
        $this->jsdir = $basepath.'js/';
    }

    function add_js($path) {
        $this->include_js[] = $path;
    }

    function add_css($path) {
        $this->include_css[] = $path;
    }

    function head($description) {
        $css_includes = '';
        foreach ($include_css as $path){
            $css_includes .= "<link rel=\"stylesheet\" type=\"text/css\" href=\"$cssdir$path\">\n";
        }
            
        echo "<head>
<title>$config->title</title>
<meta charset=\"utf-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\">
<meta name=\"description\" content=\"$confg->description $description\">
<meta name=\"author\" content=\"$config->author\">
<link rel=\"icon\" href=\"$this->favicon\">
join('\n',$css_includes)
</head>
";
    }

    function navigation_main() {
        $nav = "<ul class=\"navbar-nav\">\n";
        foreach ($pages as $page) {
            $nav .= "<li class=\"nav-item\"";
            if ($page->active) $nav .= " active";
            $nav .= "\"><a class=\"nav-link\" href=\"$pagedir$page->name\">$page->title</a></li>\n" ;
        }
        $nav .= "</ul>";
        return $nav;
    }

    function navbar() {
        $nav = $this->navigation_main();
        echo "<nav class=\"navbar navbar-expand-md fixed-top\">
<a href=\"#\" class=\"navbar-brand\">$config->title</a>
$nav
</nav>
";
    }

    function scripts() {
        $js_includes = '';
        foreach ($include_js as $path){
            $js_includes .= "<script type=\"text/javascript\" src="$jsdir$path\">\n";
        echo $js_includes;
        }

    }



}
