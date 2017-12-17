<?php

require_once('config/config.php');

class site_builder {
    private $include_js;
    private $include_css;
    public $favicon;
    private $cssdir;
    private $jsdir;

    function __construct($basepath = '', $favicon = ''){
        global $config;
        $this->include_js = $config->default_js;
        $this->include_css = $config->default_css;
        $this->cssdir = $basepath.'css/';
        $this->jsdir = $basepath.'js/';
        $this->favicon = ($favicon == '') ? $favicon : $this->favicon;
    }

    function add_js($path) {
        $this->include_js[] = $path;
    }

    function add_css($path) {
        $this->include_css[] = $path;
    }

    function head($description) {
        global $config;
        $css_includes = '';
        foreach ($this->include_css as $path){
            $css_includes .= "<link rel=\"stylesheet\" type=\"text/css\" href=\"$cssdir$path\">\n";
        }
            
        echo "<head>
<title>$config->title</title>
<meta charset=\"utf-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, shrink-to-fit=no\">
<meta name=\"description\" content=\"$confg->description $description\">
<meta name=\"author\" content=\"$config->author\">
<link rel=\"icon\" href=\"$this->favicon\">
$css_includes
</head>
";
    }

    function navigation_main() {
        global $config;
        $nav = "<ul class=\"navbar-nav\">\n";
        foreach ($config->pages as $page) {
            $nav .= "<li class=\"nav-item";
            if ($page->active) $nav .= " active";
            $nav .= "\"><a class=\"nav-link\" href=\"$pagedir{$page['name']}\">{$page['title']}</a></li>\n" ;
        }
        $nav .= "</ul>";
        return $nav;
    }

    function navbar() {
        global $config;
        $nav = $this->navigation_main();
        echo "<nav class=\"navbar navbar-expand-md fixed-top\">
<a href=\"#\" class=\"navbar-brand\">$config->title</a>
$nav
</nav>
";
    }
    function scripts() {
        $scripts = '';
        foreach ($this->include_js as $path){
            $scripts .= "<script type=\"text/javascript\" src=\"{$this->jsdir}{$path}\">\n</script>";
        }
        echo $scripts;

    }
    

}

?>

