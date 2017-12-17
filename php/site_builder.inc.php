<?php

require_once('config/config.php');

class site_builder {
    private $include_js;
    private $include_css;
    public $favicon;
    private $cssdir;
    private $jsdir;
    private $pagedir;

    function __construct($basepath = '', $favicon = ''){
        global $config;
        $this->include_js = $config->default_js;
        $this->include_css = $config->default_css;
        $this->cssdir = $basepath.'css/';
        $this->jsdir = $basepath.'js/';
        $this->pagedir = $basepath.'pages/';
        $this->favicon = ($favicon == '') ? $favicon : $this->favicon;
    }

    public function add_js($path) {
        $this->include_js[] = $path;
    }

    public function add_css($path) {
        $this->include_css[] = $path;
    }

    public function head($description = '') {
        global $config;
        $css_includes = '';
        foreach ($this->include_css as $path){
            $css_includes .= "<link rel=\"stylesheet\" type=\"text/css\" href=\"$this->cssdir$path\">\n";
        }
            
        return "<head>
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

    public function navigation_main($ul, $li, $a) {
        global $config;

        $nav = "<ul class=\"$ul\">\n";
        foreach ($config->pages as $page) {
            $nav .= "<li class=\"$li";
            if ($page->active) $nav .= " active";
            $file = ($page['file'] == 'index.php') ? $page['file'] : $this->pagedir.$page['file'];
            $nav .= "\"><a class=\"$a\" href=\"$file\">{$page['title']}</a></li>\n" ;
        }
        $nav .= "</ul>";
        return $nav;
    }

    public function navbar() {
        global $config;
        $nav = $this->navigation_main('navbar-nav', 'nav-item', 'nav-link');
        return "<nav class=\"navbar navbar-expand-md navbar-dark bg-dark fixed-top\">
<a href=\"index.php\" class=\"navbar-brand italic\">$config->title</a>
$nav
</nav>
";
    }
    public function scripts() {
        $scripts = '';
        foreach ($this->include_js as $path){
            $scripts .= "<script type=\"text/javascript\" src=\"$this->jsdir$path\"></script>\n";
        }
        return $scripts;

    }
    

}

?>

