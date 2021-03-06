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

        $this->addCss("css/bulma.min.css");
        $this->addJs("js/trekpage.js");
    }

    /**
    * Add an external javascript file to the page
    *
    * @param string $filePath
    */
    public function addJs($filePath) {
        if (!in_array(HTML_ROOT.$filePath, $this->includeJs)) $this->includeJs[] = HTML_ROOT.$filePath;
    }

    /**
    * Add an external css file to the page    
    *
    * @param string $filePath
    */
    public function addCss($filePath) {
        if (!in_array(HTML_ROOT.$filePath, $this->includeCss)) $this->includeCss[] = HTML_ROOT.$filePath;
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
        $nav = "<div class=\"navbar-menu\" id=\"main-menu\">\n"
              ." <div class=\"navbar-start\"></div>\n"
              ." <div class=\"navbar-end\">\n";
        foreach ($this->config['order'] as $name) {
            $data = $this->config['pages'][$name];
            $nav .= "  <a class=\"navbar-item";
            if (strstr(basename($data['path']),'?',true) == HTML_FILE) $nav .= " is-active";
            switch ($data['type']) {
            case "html":
                if (basename($data['path']) == HTML_FILE) $nav .= " is-active";
                $file = HTML_ROOT.$data['path'];
                break;
            case "database":
                if ($_GET['db'] == $name) $nav .= " is-active";
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
        $homeLink = HTML_ROOT.'index.php';
        return 
             "<nav class=\"navbar is-primary\" role=\"navigation\" aria-label=\"main navigation\">\n"
            ." <div class=\"container\">\n"
            ."  <div class=\"navbar-brand\">\n"
            ."   <a href=\"$homeLink\" class=\"navbar-item is-italic\">{$this->config['title']}</a>\n"
            ."   <a role=\"button\" class=\"navbar-burger\" data-target=\"main-menu\" aria-label=\"menu\" aria-expanded=\"false\"><span aria-hidden=\"true\"></span><span aria-hidden=\"true\"></span><span aria-hidden=\"true\"></span></a>\n"
            ."  </div>\n"
            .$nav
            ." </div>\n"
            ."</nav>\n";
    }

}

?>

