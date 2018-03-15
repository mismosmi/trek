<!DOCTYPE html>
<html lang="en">
<?php
define('PHP_ROOT', '');
define('HTML_ROOT', '');
define('HTML_FILE', basename(__FILE__));
require_once('php/Database.inc.php');
$p = new Database('testdb','Example Database');
echo $p->getHead('an example/template database');
?>
<body>
<?php echo $p->getNavbar(); ?>
<section class="section">
    <div class="container">
        <h1 class="title is-1">Example Database</h1>
        <div class="buttons is-right">
            <span class="button" onclick="Trek.enterEditMode();">Edit</span>
        </div>
    </div>
    <div class="container">
        <?php echo $p->getTable(); ?>
    </div>
</section>
</body>
</html>
