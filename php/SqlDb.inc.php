<?php
/**
 * A Class handling a Sql Database Connection
 */
class SqlDb {

    /**
     * Array with necessary info for db connection
     *
     * @var array(string)
     */
    private $_info = [];
    /**
     * Open database connection
     *
     * @var PDO
     */
    protected $_db = NULL;

    /**
     * Constructor
     *
     * @param array(string)         database configuration from config.php
     */
    function __construct(array $dbinfo)
    {
        $this->_info = $dbinfo;
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
     * open a PDO mysql connection to db specified in config.php
     *
     * @return array success-status and error message
     */
    public function dbConnect()
    {
        if ($this->_db != NULL) return ['success' => True];

        try {
            if ($this->_info['backend'] == 'sqlite') {
                $conn = new PDO("sqlite:{$this->_info['path']}");
            } elseif ($this->_info['backend'] == 'mysql') {
                $conn = new PDO("mysql:host={$this->_info['host']};dbname={$this->_info['dbname']}",
                    $this->_info['username'], $this->_info['password']);
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
     *                          'type' => sql field type or "FOREIGN KEY",
     *                          'required' => True if field should be NOT NULL,
     *                          per default only id and timestamp will be
     *                          created.
     * @return array success-status and error message
     */
    public function dbCreateTable($name, $columns = [])
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $be = $this->_info['backend'];
            $query = "CREATE TABLE $name (";
            $fk = "";
            if ($be == 'sqlite') {
                $query .= "{$name}_id INTEGER PRIMARY KEY, "
                    ."timestamp DATETIME DEFAULT CURRENT_TIMESTAMP";
            } elseif ($be == 'mysql') {
                $query .= "{$name}_id INT NOT NULL AUTO_INCREMENT, "
                    ."timestamp TIMESTAMP";
            }
            foreach ($columns as $col) {
                $colType = "";
                $colName = "";
                if ($col['type'] == "FOREIGN KEY") {
                    $colType = $be == 'sqlite' ? "INTEGER" : "INT";
                    $colName = $col['name'];
                    $foreignTable = explode("_", $col['name'], 2)[0];
                    $fk .= ", FOREIGN KEY ($colName) REFERENCES $foreignTable($colName)";
                } else {
                    $colType = $col['type'];
                    $colName = $col['name'];
                }
                $query .= ", $colName $colType ";
                if (!empty($col['required']) && $col['required']) $query .= "NOT NULL ";
            }
            if ($be == 'mysql') $query .= ", PRIMARY KEY ({$name}_id)";
            $query .= $fk;

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
    public function dbDropTable($name)
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
    public function dbTableExists($name)
    {
        if (!$this->dbConnect()['success']) return False;
        $be = $this->_info['backend'];

        if ($be == 'mysql') {
            try {
                $stmt = $this->_db->prepare("SHOW TABLES WHERE "
                    ."Tables_in_{$this->_info['dbname']} LIKE :name");
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
    public function dbInsert($table, array $data)
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
                $stmt->bindValue(":".$name, $val);
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
    public function dbAlter($table, $row, array $data)
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
                $stmt->bindValue(":".$name, $val);
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
    public function dbDelete($table, $row)
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
     * @param array (string) $columns       which columns to select
     * @param array $where                  ['condition_key'=>'condition_value',...]
     * @param int $limit
     * @param string $order
     * @return array success-status and data or error message
     */
    public function dbSelect(
        $table, 
        array $columns = ['*'], 
        array $where = [],
        $limit = 0,
        $order = NULL
    )
    {
        $order = $order ?: "BY {$table}_id ASC";
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $key => $val) {
                    $ws .= "$key = :$key";
                }
            }
            $ls = empty($limit) ? "" : " LIMIT $limit";
            $stmt = $this->_db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM $table$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $key => $val) {
                    $stmt->bindValue(":$key", $val);
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

    /*
     * SELECT including columns from tables referenced by foreign keys
     *
     * @param string $table
     * @param array (string) $columns       column as "table.column"
     *                                      or "column" becoming "$table.column"
     * @param array $where                  ['condition_key'=>"condition_value",...]
     * @param int $limit
     * @param string $order
     * @return array success-status and data or error message
     */
    public function dbSelectJoin(
        $table,
        array $columns,
        array $where = [],
        $limit = 0,
        $order = NULL
    )
    {
        $order = $order ?: "BY $table.{$table}_id ASC";
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $key => $val) {
                    $ws .= "$key = :$key";
                }
            }
            $ls = empty($limit) ? "" : " LIMIT $limit";
            $columnNames = [];
            $joinTables = [];
            foreach ($columns as $column) {
                if (strpos($column, '.') === False) {
                    $columnNames[] = "$table.$column";
                } else {
                    [$tableName, $columnName] = explode('.', $column, 2);
                    if ($tableName === $table) {
                        $columnNames[] = $column;
                    } else {
                        if (!in_array($tableName, $joinTables)) {
                            $joinTables[] = $tableName;
                        }
                        $columnNames[] = "$column AS {$tableName}_{$columnName}";
                    }
                }
            }
            $js = "";
            foreach ($joinTables as $tableName) {
                $js .= " JOIN $tableName ON $table.{$tableName}_id = $tableName.{$tableName}_id";
            }
            $stmt_text = "SELECT ".join(",",$columnNames)." "
                ."FROM $table$js$ws ORDER $order$ls";
            echo $stmt_text;
            $stmt = $this->_db->prepare(
                "SELECT ".join(",",$columnNames)." "
                ."FROM $table$js$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $key => $val) {
                    $stmt->bindValue(":$key", $val);
                }
            }
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            return ['success' => True, 'data' => $stmt->fetchAll()];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "dbSelectJoin: Error fetching data from table(s) based on $table: ".$e->getMessage()];
        }
    }

    /*
     * Execute arbitrary sql queries
     *
     * @param string $query     SQL-query
     * @return array sucess state and data or error-message
     */
    public function dbQuery($query)
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $stmt = $this->_db->query($query);
            $stmt->SetFetchMode(PDO::FETCH_ASSOC);
            return ['success' => True, 'data' => $stmt->fetchAll()];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "dbQuery: Error executing SQL-query $query: ".$e->getMessage()];
        }
    }


}


