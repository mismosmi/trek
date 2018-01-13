<!DOCTYPE html>
<html lang="en">
<?php
define('PHP_ROOT', '');
define('HTML_ROOT', '');
define('HTML_FILE', basename(__FILE__));
require_once('php/page.inc.php');
$p = new Page('Trek');
echo $p->getHead('very simple inventory control'); 
?>
<body>
<?php echo $p->getNavbar(); ?>
<main role="main" class="container-fluid">
    <div class="row">
        <div class="col-md-3"></div>
        <div class="col-md-6">
            <h1 class="italic">TREK</h1>
        </div>
    </div>
    <div class="row">
        <div class="col-md-1"></div>
        <div class="col-md-10 col-md-offset-1">
            <?php echo $p->getMainNavigation('','btn btn-default btn-lg btn-block',''); ?>
        </div>
    </div>

</main>
<?php echo $p->getScripts(); ?>
</body>
</html>
