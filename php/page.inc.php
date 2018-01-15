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
     * Open database connection
     *
     * @var PDO
     */
    protected $_db = NULL;

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
     * Desctructor
     * closes database connection
     */
    public function __destruct()
    {
        $this->_db = NULL;
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
    
    /**
     * open a PDO mysql connection to db specified in config.php
     *
     * @return array success-status and error message
     */
    public function dbConnect()
    {
        if ($this->_db != NULL) return ['success' => True];

        $dbdata = $this->_config['database'];
        try {
            if ($dbdata['backend'] == 'sqlite') {
                $conn = new PDO("sqlite:{$dbdata['path']}");
            } elseif ($dbdata['backend'] == 'mysql') {
                $conn = new PDO("mysql:host={$dbdata['host']};dbname={$dbdata['dbname']}",
                    $dbdata['username'], $dbdata['password']);
            }
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->_db = $conn;
            return ['success' => True];
        } catch(PDOException $e) {
            return ['success' => False, 'errormsg' =>
            "Connection failed: ".$e->getMessage()];
        }

    }

    /**
     * query sql to create a table
     *
     * @param string $name    
     * @param array $columns    columns to be created, minimum format column:
     *                          ['name' => column name,
     *                          'type' => sql field type,
     *                          'required' => True if field should be NOT NULL]
     *                          per default only id and timestamp will be
     *                          created.
     * @return array success-status and error message
     */
    public function dbCreateTable($name, $columns = [])
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $be = $this->_config['database']['backend'];
            $query = "CREATE TABLE $name (";
            if ($be == 'sqlite') {
                $query .= "{$name}_id INTEGER PRIMARY KEY, "
                    ."entrydate DATETIME DEFAULT CURRENT_TIMESTAMP";
            } elseif ($be == 'mysql') {
                $query .= "{$name}_id INT NOT NULL AUTO_INCREMENT, "
                    ."entrydate TIMESTAMP";
            }
            foreach ($columns as $col) {
                $query .= ", {$col['name']} {$col['type']} ";
                if ($col['required']) $query .= "NOT NULL ";
            }
            if ($be == 'mysql') $query .= ", PRIMARY KEY ({$name}_id)";
            $query .= ")";
            $this->_db->exec($query);
            return ['success' => True];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' => 
                "failed creating table $name: ".$e->getMessage()];
        }
    }

    /**
     * query sql to drop a table
     *
     * @param string $name
     * @return array success-status and error message
     */
    public function dbDropTable(string $name)
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $query = "DROP TABLE $name";
            $this->_db->exec($query);
            return ['success' => True];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "failed dropping table $this->name: ".$e->getMessage()];
        }
    }

    /**
     * check if table exists
     *
     * @param string $name
     * @return bool
     */
    public function dbTableExists(string $name)
    {
        if (!$this->dbConnect()['success']) return False;
        $be = $this->_config['database']['backend'];

        if ($be == 'mysql') {
            try {
                $stmt = $this->_db->prepare("SHOW TABLES WHERE "
                    ."Tables_in_{$this->_config['database']['dbname']} LIKE :name");
                $stmt->bindParam(":name", $name);
                $stmt->execute();
                return ($stmt->rowCount() == 1);
            } catch (PDOException $e) {
                return False;
            }
        } elseif ($be = 'sqlite') {
            try {
                $this->_db->exec("SELECT 1 FROM $name LIMIT 1");
                return True;
            } catch (PDOException $e) {
                return False;
            }
        }
    }

    /**
     * process requests for inserting new row to table
     *
     * @param string $table
     * @param array $data 
     * @return array success-status and error message
     */
    public function dbInsert(string $table, array $data)
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $collist = [];
            $paramlist = [];
            foreach ($data as $name => $val) {
                $collist[] = $name;
                $paramlist[] = ":".$name;
            }
            $stmt = $this->_db->prepare("INSERT INTO $table "
                ."(".join(",",$collist).") "
                ."VALUES (".join(",",$paramlist).")");
            foreach ($data as $name => $val) {
                $stmt->bindParam(":".$name, $val);
            }
            $stmt->execute();
            return ['success' => True];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
            "Error inserting row: ".$e->getMessage()];
        }

    }

    /**
     * process requests for modifying row in table
     *
     * @param string $table
     * @param int $row
     * @param array $data
     * @return array success-status and error message
     */
    public function dbAlter(string $table, int $row, array $data)
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;
        try {
            $collist = [];
            $paramlist = [];
            $set = [];
            foreach ($data as $name => $val) {
                $set[] = "$name = :$name";
            }
            $stmt = $this->_db->prepare("UPDATE $table "
                ."SET ".join(",",$set)." WHERE {$table}_id=$row");
            foreach ($data as $name => $val) {
                $stmt->bindParam(":".$name, $val);
            }
            $stmt->execute();
            return ['success' => True];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
            "Error altering row $row: ".$e->getMessage()];
        }
    }

    /**
     * process request for row deletion
     *
     * @param string $table
     * @param int $row
     * @return array success-status and error message
     */
    public function dbDelete(string $table, int $row)
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $this->_db->exec("DELETE FROM $table WHERE {$table}_id=$row");
            return ['success' => True];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
            "Error inserting row: ".$e->getMessage()];
        }
    }

    /**
     * process arbitrary SELECT request
     *
     * @param string $table
     * @param array (string) $columns    which columns to select
     * @param array $where               ['condition',...]
     * @param int $limit
     * @param string $order
     * @return array success-status and data or error message
     */
    public function dbSelect(
        string $table, 
        array $columns = ['*'], 
        array $where = [],
        int $limit = 0,
        string $order = "BY %ID% DESC"
    )
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $order = str_replace('%ID%', $table.'_id', $order);
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $key => $val) {
                    $ws .= "$key = :$key";
                }
            }
            //$ws = empty($where) ? "" : " WHERE ".join(',',$where);
            $ls = empty($limit) ? "" : " LIMIT $limit";
            $stmt = $this->_db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM $table$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $key => $val) {
                    $stmt->bindParam(":$key", $val);
                }
            }
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            return ['success' => True, 'data' => $stmt->fetchAll()];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "dbSelect: Error fetching data from table $table: ".$e->getMessage()];
        }
    }

}

?>

