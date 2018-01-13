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
    protected $_config;
    /**
    * Array of paths of javascript files to include
    *
    * @var array
    */
    private $_includeJs;
    /**
    * Array of paths of css files to include
    *
    * @var array
    */
    private $_includeCss;
    /**
    * path to favicon file. In 99% of cases favicon.ico in root dir
    *
    * @var string
    */
    public $favicon;
    /**
    * path to directory containing css files
    *
    * @var string
    */
    private $_cssDir;
    /**
    * path to directory containing javascript files
    *
    * @var string
    */
    private $_jsDir;
    /**
    * path to directory containing individual pages for links in navigation
    *
    * @var string
    */
    private $_pageDir;

    /**
    * Constructor
    *
    * @param string $title      <title>config->title | $title</title>
    * @param string $favicon    set page-specific favicon, defaults to setting
    *                           in config.php
    * @param string $configFile use special config.php, mainly for testing
    */
    function __construct(
        string $title = '', 
        string $favicon = '',
        string $configFile = ''
    )
    {
        $this->_config = empty($configFile) 
            ? require(PHP_ROOT.'config.php') 
            : require($configFile);
        $this->title = $this->_config['title'];
        if (!empty($this->title) && !empty($title)) {
            $this->title .= ' | ';
        }
        $this->title .= $title;
        $this->_jsDir = HTML_ROOT.'js/';
        $this->_includeJs = [];
        foreach ($this->_config['defaultJs'] as $fileName) {
            $this->addJs($fileName);
        }
        $this->_cssDir = HTML_ROOT.'css/';
        $this->_includeCss = [];
        foreach ($this->_config['defaultCss'] as $fileName) {
            $this->addCss($fileName);
        }
        $this->_pageDir = HTML_ROOT.'p/';
        $this->favicon = empty($favicon) 
            ? $this->_config['favicon']
            : $favicon;
    }

    /**
    * Add an external javascript file to the page
    *
    * @param string $fileName
    */
    public function addJs(string $fileName) {
        $this->_includeJs[] = $this->_jsDir.$fileName;
    }

    /**
    * Add an external css file to the page    
    *
    * @param string $fileName
    */
    public function addCss(string $fileName) {
        $this->_includeCss[] = $this->_cssDir.$fileName;
    }

    /**
    * Add additional description text
    *
    * @param string $text
    */
    //public function addDescription(string $text) {


    /**
    * Generate <head> tag    
    *
    * @param string $description    optional description will be added after
    *                               general desc. defined in config.php
    * @return string complete <head> tag including metainfo, description, stylesheets
    */
    public function getHead(string $description = '') {
        $cssIncludeString = '';
        foreach ($this->_includeCss as $path){
            $cssIncludeString .= 
                "<link rel=\"stylesheet\" type=\"text/css\" href=\"$path\">\n";
        }
            
        return 
             "<head>\n"
            ."<title>$this->title</title>\n"
            ."<meta charset=\"utf-8\">\n"
            ."<meta name=\"viewport\" content=\"width=device-width, "
            ."initial-scale=1, shrink-to-fit=no\">\n"
            ."<meta name=\"description\" content="
            ."\"{$this->_config['description']} $description\">\n"
            ."<meta name=\"author\" content=\"{$this->_config['author']}\">\n"
            ."<link rel=\"icon\" href=\"$this->favicon\">\n"
            .$cssIncludeString
            ."</head>\n";
    }

    /**
    * Generate a <ul> and <li> based navigation
    * Parameter defaults are bootstrap default navigation classes
    *
    * @param string $ul     will be added to the <ul> tags classes
    * @param string $li     will be added to each <li> tags classes
    * @param string $a      will be added to each <a> tags classes
    * @return string an <ul> with one <li><a></a></li> per navigation element
    */
    public function getMainNavigation(
        string $ul = 'navbar-nav', 
        string $li = 'nav-item', 
        string $a = 'nav-link'
    ) 
    {
        $nav = "<ul class=\"$ul\">\n";
        foreach ($this->_config['pages'] as $file => $title) {
            $nav .= "<li class=\"$li";
            if ($file == HTML_FILE) {
                $nav .= " active";
                $file = '#';
            } elseif ($file == 'index.php') {
                $file = HTML_ROOT.$file;
            } else {
                $file = $this->_pageDir.$file;
            }
            $nav .= "\"><a class=\"$a\" href=\"$file\">$title</a></li>\n" ;
        }
        $nav .= "</ul>";
        return $nav;
    }

    /**
    * Generate a bootstrap style navigation bar including brand logo, title,
    * main navigation
    *
    * @return string complete <nav> tag using sensible bootstrap default classes
    */
    public function getNavbar() {
        $nav = $this->getMainNavigation();
        return 
             "<nav class=\"navbar navbar-expand-md navbar-dark bg-dark fixed-top\">\n"
            ."<a href=\"index.php\" class=\"navbar-brand italic\">{$this->_config['title']}</a>\n"
            ."$nav\n"
            ."</nav>\n";
    }

    /**
    * Generate script tags to insert at end of <body>
    * 
    * @return string consists of one <script> tag stored in _includeJs
    */
    public function getScripts() {
        $scripts = '';
        foreach ($this->_includeJs as $path){
            $scripts .= "<script src=\"$path\"></script>\n";
        }
        return $scripts;
    }
    

}

?>

