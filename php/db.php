<!DOCTYPE html>
<html lang="en">
<?php
define('PHP_ROOT', '../');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
require_once('php/Database.inc.php');
$db = new Database($_GET['db']);
echo $db->getHead();
?>
<body>
<?php echo $db->getNavbar(); ?>
<section class="section">
 <div class="container">
  <h1 class="title"><?php echo $db->title; ?></h1>
 </div>
</section>
<section class="section">
 <div class="container">
<?php echo $db->getTableNav(); ?>
  <div class="buttons has-addons id-pulled-right">
   <span class="button is-primary">Edit</span>
  </div>
 </div>
 <div class="container">
<?php echo $db->getTable(); ?>
 </div>
</section>
<?php echo $db->getScript(); ?>
</body>
</html>
