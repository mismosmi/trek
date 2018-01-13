<?php
define('PHP_ROOT', dirname(__DIR__).'/');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
require_once(PHP_ROOT.'php/table.inc.php');
$t = new Table('testdb');

$t->setIdCol('Test-ID');
$t->addDataCol('datacol1', 'VARCHAR(30)', 'Data Column 1', 'some data', True);
$t->addAutoCol('autocol1', 'Auto Column 1', 'tv.datacol1');

if ($_GET) die($t->processRequest($_GET));

?>
<!DOCTYPE HTML>
<html lang="en">

<?php echo $t->getHead(); ?>
<body>
<?php echo $t->getNavbar(); ?>
<main role="main" class="container-fluid">
    <div class="row">
        <div class="col-md-3"></div>
        <div class="col-md-6">
        <h1 class="italic"><?php echo $t->title ?></h1>
        </div>
    </div>
    <div class="row">
        <div class="col-md-1"></div>
        <div class="col-md-10 col-md-offset-1">
            <?php echo $t->getTable(); ?>
        </div>
    </div>
</main>
<?php echo $t->getScripts(); ?>
<script>
$(document).ready(function(){
    trekData.initAll();
}
</script>
</body>
</html>
