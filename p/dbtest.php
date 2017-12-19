<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
require_once(PHP_ROOT.'config/config.php');

if (isset($_GET['q'])) {
    require_once(PHP_ROOT.'php/db_access.inc.php');
    $db = new database(true);
    $content = [];

    switch($_GET['q']) {
        case 'get':
            $db->('id')
            
            

    }
    
}



require_once(PHP_ROOT.'php/site_builder.inc.php');

$b = new site_builder('Database Test Page');
?>
<!DOCTYPE html>
<html lang="en">
<?php
echo $b->head();
?>
<body>
<?php echo $b->navbar(); ?>
<main role="main" class="container-fluid">
    <div class="row">
        <div class="col-md-3"></div>
        <div class="col-md-6">
            <h1 class="italic">TREK</h1>
        </div>
        <div class="col-md-3"></div>
    </div>
    <div class="row">
        <div class="col-md-1"></div>
        <div class="col-md-10">
            <table class="table-striped table-hover table-condensed col">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>email</th>
                        <th>tunnelwahrscheinlichkeit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td data-table="people" data-key="name">Wes Anderson</td>
                        <td data-table="people" data-key="email">sen@email.xy</td>
                        <td data-table="people" data-key="tunnel">0.00000000000974</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="col-md-1"></div>
    </div>

</div>
<?php echo $b->scripts(); ?>
</body>
</html>
