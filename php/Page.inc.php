<?php
/**
* A Generator class for most standard html
*/
class Page {

    /**
    * Page title
    *
    * @var string
    */
    public $title;
    /**
    * Configuration stored as an array, typically from config.php
    *
    * @var array
    */
    public $config;
    /**
    * Array of paths of javascript files to include
    *
    * @var array
    */
    private $includeJs;
    /**
    * Array of paths of css files to include
    *
    * @var array
    */
    private $includeCss;
    /**
    * path to favicon file. In 99% of cases favicon.ico in root dir
    *
    * @var string
    */
    public $favicon;

    /**
    * Constructor
    *
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    */
    function __construct(
        $title = NULL, 
        $favicon = NULL,
        $configFile = NULL
    )
    {
        $this->config = empty($configFile) 
            ? json_decode(file_get_contents(PHP_ROOT.'config.json'), true)
            : json_decode(file_get_contents(PHP_ROOT.$configFile), true);
        $this->title = $this->config['title'];
        if (!empty($this->title) && !empty($title)) {
            $this->title .= ' | ';
        }
        $this->title .= $title;
        $this->includeJs = [];
        foreach ($this->config['defaultJs'] as $filePath) {
            $this->addJs($filePath);
        }
        $this->includeCss = [];
        foreach ($this->config['defaultCss'] as $filePath) {
            $this->addCss($filePath);
        }
        $this->favicon = empty($favicon) 
            ? $this->config['favicon']
            : $favicon;

        $this->addJs("js/trekpage.js");
    }

    /**
    * Add an external javascript file to the page
    *
    * @param string $filePath
    */
    public function addJs($filePath) {
        $this->includeJs[] = $filePath;
    }

    /**
    * Add an external css file to the page    
    *
    * @param string $filePath
    */
    public function addCss($filePath) {
        $this->includeCss[] = $filePath;
    }

    /**
    * Generate <head> tag    
    *
    * @param string $description    optional description will be added after
    *                               general desc. defined in config.php
    * @return string complete <head> tag including metainfo, description, 
    * stylesheets, scripts
    */
    public function getHead($description = NULL) {
        $cssIncludeString = '';
        foreach ($this->includeCss as $path){
            $cssIncludeString .= 
                " <link rel=\"stylesheet\" type=\"text/css\" href=\"$path\">\n";
        }
        $jsIncludeString = "";
        foreach ($this->includeJs as $path) {
            $jsIncludeString .=
                " <script defer src=\"$path\"></script>\n";
        }
            
        return 
             "<head>\n"
            ." <title>$this->title</title>\n"
            ." <meta charset=\"utf-8\">\n"
            ." <meta name=\"viewport\" content=\"width=device-width, "
            ."initial-scale=1, shrink-to-fit=no\">\n"
            ." <meta name=\"description\" content="
            ."\"{$this->config['description']} $description\">\n"
            ." <meta name=\"author\" content=\"{$this->config['author']}\">\n"
            ." <link rel=\"icon\" href=\"$this->favicon\">\n"
            .$cssIncludeString
            .$jsIncludeString
            ."</head>\n";
    }

    /**
    * Generate a bulma style navigation
    *
    * @return string
    */
    public function getMainNavigation() 
    {
        $nav = "<div class=\"navbar-menu\">\n"
              ." <div class=\"navbar-start\"></div>\n"
              ." <div class=\"navbar-end\">\n";
        foreach ($this->config['order'] as $name) {
            $data = $this->config['pages'][$name];
            $nav .= "  <a class=\"navbar-item";
            switch ($data['type']) {
            case "html":
                $nav .= " is-active";
                $file = HTML_ROOT.$data['path'];
                break;
            case "database":
                $file = HTML_ROOT."php/db.php?db=".$name;
                break;
            }
            $nav .= "\" href=\"$file\">{$data['title']}</a>\n";
        }
        $nav .= " </div>\n"
               ."</div>\n";
        return $nav;
    }

    /**
    * Generate a bulma style navigation bar including brand logo, title,
    * main navigation
    *
    * @return string complete <nav> tag using sensible bootstrap default classes
    */
    public function getNavbar() {
        $nav = $this->getMainNavigation();
        return 
             "<nav class=\"navbar is-primary\" role=\"navigation\" aria-label=\"main navigation\">\n"
            ." <div class=\"container\">\n"
            ."  <div class=\"navbar-brand\">\n"
            ."   <a href=\"index.php\" class=\"navbar-item is-italic\">{$this->config['title']}</a>\n"
            ."   <div class=\"navbar-burger\"><span></span><span></span><span></span></div>\n"
            ."  </div>\n"
            .$nav
            ." </div>\n"
            ."</nav>\n";
    }

}

?>

