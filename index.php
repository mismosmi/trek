<!DOCTYPE html>
<html lang="en">
<?php
require_once('php/site_builder.inc.php');
$b = new site_builder();
echo $b->head('very simple inventory control'); 
?>
<body>
<?php echo $b->navbar(); ?>
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
            <?php echo $b->navigation_main('','btn btn-default btn-lg btn-block',''); ?>
        </div>
    </div>

</main>
<?php echo $b->scripts(); ?>
</body>
</html>
