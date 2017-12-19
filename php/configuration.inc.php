<?php

class configuration {
    public $default_js;
    public $default_css;
    public $favicon;
    public $author;
    public $description;
    public $pages;
    public $db_servername;
    public $db_username;
    public $db_password;

    function __construct() {
        $this->db_servername = 'localhost';
    }
}

?>
