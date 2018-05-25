<!DOCTYPE html>
<html lang="en">
<?php
define('PHP_ROOT', '../');
define('HTML_ROOT', '../');
define('HTML_FILE', basename(__FILE__));
require_once(PHP_ROOT.'php/Database.inc.php');
$activeTable = array_key_exists('table', $_GET) ? $_GET['table'] : '';
$db = new Database($_GET['db'], '', '', $activeTable);
echo $db->getHead();
?>
<body>
<?php echo $db->getNavbar(); ?>
<section class="section">
 <div>
  <h1 class="title"><?php echo $db->getTitle(); ?></h1>
 </div>
</section>
<section class="section">
 <div class="container is-clearfix">
  <div class="buttons has-addons is-pulled-right">
   <span id="trek-print-button" class="button is-link" disabled>Print</span>
   <span id="trek-edit-button" class="button is-primary" disabled>Edit</span>
  </div>
<?php echo $db->getDbNav(); ?>
 </div>
 <section class="hero">
  <div class="hero-body" id="trek-container">
  </div>
 </section>
</section>
<?php echo $db->getScript(); ?>
</body>
</html>
