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
    private $info = [];
    /**
     * Open database connection
     *
     * @var PDO
     */
    protected $db = NULL;

    /**
     * Constructor
     *
     * @param array(string)         database configuration from config.php
     */
    function __construct(array $dbinfo)
    {
        $this->info = $dbinfo;
    }

    /**
     * Desctructor
     * closes database connection
     */
    public function __destruct()
    {
        $this->db = NULL;
    }

    /**
     * open a PDO mysql connection to db specified in config.php
     *
     * @return array success-status and error message
     */
    public function dbConnect()
    {
        if ($this->db != NULL) return ['success' => True];

        try {
            if ($this->info['backend'] == 'sqlite') {
                $conn = new PDO("sqlite:{$this->info['path']}");
            } elseif ($this->info['backend'] == 'mysql') {
                $conn = new PDO("mysql:host={$this->info['host']};dbname={$this->info['dbname']}",
                    $this->info['username'], $this->info['password']);
            }
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->db = $conn;
            return ['success' => True];
        } catch(PDOException $e) {
            return ['success' => False, 'errormsg' =>
            "Connection failed: ".$e->getMessage()];
        }

    }

    /**
     * query sql to create a table
     *
     * @param string $name       table name
     * @param array $columns    table columns
     * @return array success-status and error message
     */
    public function dbCreateTable($name, array $columns = [])
    {
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $be = $this->info['backend'];
            $query = "CREATE TABLE $name (";
            $fk = "";
            if ($be == 'sqlite') {
                $query .= "id INTEGER PRIMARY KEY, "
                    ."timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,"
                    ."deleted INTEGER DEFAULT 0";
            } elseif ($be == 'mysql') {
                $query .= "id INT NOT NULL AUTO_INCREMENT, "
                    ."timestamp TIMESTAMP,"
                    ."deleted BOOLEAN DEFAULT 0";
            }
            foreach ($columns as $col) {
                $colType = "";
                $colName = "";
                if ($col['type'] == "FOREIGN KEY") {
                    $colType = "INTEGER";
                    $colName = "{$col['table']}_id";
                    $fk .= ", FOREIGN KEY ($colName) REFERENCES {$col['table']}($colName)";
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
            $this->db->exec($query);
            return ['success' => True, 'info' => "Successfully created table \"$name\"."];
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
            $this->db->exec($query);
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
        $be = $this->info['backend'];

        if ($be == 'mysql') {
            try {
                $stmt = $this->db->prepare("SHOW TABLES WHERE "
                    ."Tables_in_{$this->info['dbname']} LIKE :name");
                $stmt->bindParam(":name", $name);
                $stmt->execute();
                return ($stmt->rowCount() == 1);
            } catch (PDOException $e) {
                return False;
            }
        } elseif ($be = 'sqlite') {
            try {
                $this->db->exec("SELECT 1 FROM $name LIMIT 1");
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
            $stmt = $this->db->prepare("INSERT INTO $table "
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
            $stmt = $this->db->prepare("UPDATE $table "
                ."SET ".join(",",$set)." WHERE id=$row");
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
            $this->db->exec("DELETE FROM $table WHERE id=$row");
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
     * @param array $where
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
        $order = $order ?: "BY id ASC";
        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w);
                    $ws .= "$key $op :$key";
                }
            }
            $ls = empty($limit) ? "" : " LIMIT $limit";
            
            $stmt = $this->db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM $table$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w);
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
     * @param array $thisTable  ['name' => table name, 'columns' => [column names]]
     * @param array $joinTables [tables in same format as thisTable]
     * @param array $where
     * @param int $limit
     * @param string $order
     * @return array success-status and data or error message
     */
    public function dbSelectJoin(
        array $thisTable,
        array $joinTables,
        array $where = [],
        $limit = 0,
        $order = NULL
    )
    {
        $table = $thisTable['name'];
        $order = $order ?: "BY {$thisTable['name']}.id ASC";

        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        try {
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w);
                    $ws .= "$key :$key";
                }
            }
            $ls = empty($limit) ? "" : " LIMIT $limit";

            $columns = [];
            $js = "";
            foreach ($thisTable['columns'] as $column) {
                $columns[] = "{$thisTable['name']}.{$column}";
            }
            foreach ($joinTables as $table) {
                $js .= " JOIN {$table['name']} ON {$thisTable['name']}.{$table['name']}_id = {$table['name']}.id";
                    $columns[] = "{$table['name']}.{$column} AS {$table['name']}_{$column}";
            }

            $stmt = $this->db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM {$thisTable['name']}$js$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w);
                    $stmt->bindValue(":$key", $val);
                }
            }
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            return ['success' => True, 'data' => $stmt->fetchAll()];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "dbSelectJoin: Error fetching data from table(s) based on {$thisTable['name']}: ".$e->getMessage()];
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
            $stmt = $this->db->query($query);
            $stmt->SetFetchMode(PDO::FETCH_ASSOC);
            return ['success' => True, 'data' => $stmt->fetchAll()];
        } catch (PDOException $e) {
            return ['success' => False, 'errormsg' =>
                "dbQuery: Error executing SQL-query $query: ".$e->getMessage()];
        }
    }


}


