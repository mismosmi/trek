<?php
echo 'hallowelt';
require_once("php/site_builder.php");
echo 'abc';
$b = new site_builder();
?>
<!DOCTYPE html>
<html>
<?php $b->head(); ?>
<body>
<?php $b->navbar(); ?>
<?php $b->scripts(); ?>
</body>
</html>
