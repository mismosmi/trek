<?php
/**
 * A Class handling a Sql Database Connection
 */
class SqlDb {

    /**
     * Array with Meta columns that get queried by default
     *
     * @const array(string)
     */
    const META_COLUMNS = ["id", "createdate", "modifieddate", "deleted"];
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
        $this->date = date("Y-m-d G:i:s");
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
                if ($this->info['path'] === ":memory:") $conn = new PDO("sqlite::memory:");
                else {
                    $path = PHP_ROOT.$this->info['path'];
                    $conn = new PDO("sqlite:$path");
                }
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
                    ."createdate DATETIME DEFAULT 0, "
                    ."modifieddate DATETIME DEFAULT 0, "
                    ."deleted INTEGER DEFAULT 0";
            } elseif ($be == 'mysql') {
                $query .= "id SERIAL, "
                    ."createdate TIMESTAMP DEFAULT 0, "
                    ."modifieddate TIMESTAMP DEFAULT 0, "
                    ."deleted BOOLEAN DEFAULT 0";
            }
            foreach ($columns as $col) {
                $colType = "";
                $colName = "";
                switch ($col['class']) {
                case 1: // Data Column
                    switch ($col['type']) {
                    case "EURO":
                        $col['type'] = "BIGINT";
                        break;
                    }
                    $query .= ", {$col['name']} {$col['type']}"; 
                    break;
                case 3: // Foreign Key
                    $colName = "{$col['table']}_id";
                    $query .= ", $colName BIGINT UNSIGNED";
                    $fk .= ", FOREIGN KEY ($colName) REFERENCES {$col['table']}(id) ON DELETE SET NULL ON UPDATE CASCADE";
                    break;
                }
                if (!empty($col['required']) && $col['required']) $query .= " NOT NULL";
            }
            if ($be == 'mysql') $query .= ", PRIMARY KEY (id)";
            $query .= $fk.");";

            //echo $query."\n";
            $this->db->exec($query);
            return ['success' => True, 'info' => "Successfully created table \"$name\"."];
        } catch (PDOException $e) {
            //echo $e->getMessage()."\n";
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
                "failed dropping table $name: ".$e->getMessage()];
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
            $collist = ["createdate", "modifieddate"];
            $paramlist = [":createdate", ":modifieddate"];
            foreach ($data as $name => $val) {
                $collist[] = $name;
                $paramlist[] = ":".$name;
            }
            $stmt = $this->db->prepare("INSERT INTO $table "
                ."(".join(",",$collist).") "
                ."VALUES (".join(",",$paramlist).")");
            $stmt->bindValue(":createdate", $this->date);
            $stmt->bindValue(":modifieddate", $this->date);
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
            //$collist = ["modifieddate"];
            //$paramlist = [":modifieddate"];
            $set = ["modifieddate = :modifieddate"];
            foreach ($data as $name => $val) {
                $set[] = "$name = :$name";
            }
            $stmt = $this->db->prepare("UPDATE $table "
                ."SET ".join(",",$set)." WHERE id=$row");
            $stmt->bindValue(":modifieddate", $this->date);
            foreach ($data as $name => $val) {
                $stmt->bindValue(":$name", $val);
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
        $order = $order ?: "BY {$thisTable['name']}.id";

        $connStatus = $this->dbConnect();
        if (!$connStatus['success']) return $connStatus;

        $stmtStr = '';

        try {
            $ws = "";
            if (!empty($where)) {
                $ws = " WHERE ";
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w, 3);
                    $ws .= "$key $op :".str_replace('.','_',$key);
                }
            }
            $ls = empty($limit) ? "" : " LIMIT $limit";

            $columns = [
                "{$thisTable['name']}.id", 
                "{$thisTable['name']}.createdate", 
                "{$thisTable['name']}.modifieddate",
                "{$thisTable['name']}.deleted"
            ];
            $arrayColumns = [];

            $js = "";
            foreach ($thisTable['columns'] as $column) {
                switch ($column['class']) {
                case 1:
                    $columns[] = "{$thisTable['name']}.{$column['name']}";
                    break;
                }
            }
            foreach ($joinTables as $table) {
                $columns[] = "{$table['name']}.id AS {$table['prefix']}_id";
                $columns[] = "{$table['name']}.createdate AS {$table['prefix']}_createdate";
                $columns[] = "{$table['name']}.modifieddate AS {$table['prefix']}_modifieddate";
                $columns[] = "{$table['name']}.deleted AS {$table['prefix']}_deleted";
                switch ($table['referenceType']) {
                case "left":
                    $js .= " LEFT JOIN {$table['name']} ON {$table['referenceTable']}.{$table['name']}_id = {$table['name']}.id";
                    break;
                case "right":
                    $js .= " LEFT JOIN {$table['name']} ON {$table['referenceTable']}.id = {$table['name']}.{$table['referenceTable']}_id";
                    $arrayColumns[] = "{$table['prefix']}_id";
                    $arrayColumns[] = "{$table['prefix']}_createdate";
                    $arrayColumns[] = "{$table['prefix']}_modifieddate";
                    $arrayColumns[] = "{$table['prefix']}_deleted";
                    foreach ($table['columns'] as $column) $arrayColumns[] = "{$table['prefix']}_{$column['name']}";
                    $order .= ",{$table['name']}_id";
                    break;
                }
                foreach ($table['columns'] as $column) {
                    switch ($column['class']) {
                        case 1:
                        $columns[] = "{$table['name']}.{$column['name']} AS {$table['prefix']}_{$column['name']}";
                        break;
                    }
                }
            }
            $order .= " ASC";
            //echo "SELECT ".join(",",$columns)." FROM {$thisTable['name']}$js$ws ORDER $order$ls\n";
            $stmtStr = "SELECT ".join(",",$columns)." FROM {$thisTable['name']}$js$ws ORDER $order$ls\n";
            $stmt = $this->db->prepare(
                "SELECT ".join(",",$columns)." "
                ."FROM {$thisTable['name']}$js$ws ORDER $order$ls"
            );
            if (!empty($where)) {
                foreach ($where as $w) {
                    [$key, $op, $val] = explode(' ', $w, 3);
                    $stmt->bindValue(":".str_replace('.','_',$key), $val);
                }
            }
            $stmt->execute();
            $stmt->setFetchMode(PDO::FETCH_ASSOC);
            $data = [];
            while ($row = $stmt->fetch()) {
                if ($row['deleted']) {
                    $data[$row['id']] = ['deleted' => true];
                    continue;
                }
                $firstOccurence = !array_key_exists($row['id'], $data); // rows that have the same id only add to array columns
                if ($firstOccurence) $data[$row['id']] = [];
                foreach ($row as $key => $val) {
                    if ($key === "id" || $key === "deleted") continue;
                    // if this is not the first occurence and it is not an arraycolumn, skip it.
                    $arrayColumn = in_array($key, $arrayColumns);
                    if (!$firstOccurence && !$arrayColumn) continue; 

                    if ($arrayColumn) { // these columns need to become arrays.
                        if ($firstOccurence) $data[$row['id']][$key] = [$val];
                        else $data[$row['id']][$key][] = $val;
                    } else {
                        $data[$row['id']][$key] = $val;
                    }
                }
            }
            return ['success' => True, 'data' => $data];
        } catch (PDOException $e) {
            //echo "Error: ".$e->getMessage()."\n";
            return ['success' => False, 'errormsg' =>
                "dbSelectJoin: Error fetching data from table(s) based on {$thisTable['name']}: ".$e->getMessage()."\nQuery:\n".$stmtStr];
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


