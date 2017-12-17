<!DOCTYPE html>
<html>
<?php
require_once('php/site_builder.inc.php');
$b = new site_builder();
?>
<?php $b->head('very simple inventory control'); ?>
<body>
<?php $b->navbar(); ?>
<?php $b->scripts(); ?>
</body>
</html>
