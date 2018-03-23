<!DOCTYPE html>
<html lang="en">
<?php
define('PHP_ROOT', '');
define('HTML_ROOT', '');
define('HTML_FILE', basename(__FILE__));
require_once('php/Page.inc.php');
$p = new Page();
echo $p->getHead(); 
?>
<body>
<?php echo $p->getNavbar(); ?>
<section class="section">
 <div class="container">
  <h1 class="title">TREK</h1>
  <h2 class="subtitle">A simple SQL interface</h2>
 </div>
</section>
<section class="section">
 <div class="container">
  <h2 class="title">Databases:</h2>
  <div class="buttons">
<?php 
foreach ($p->config['order'] as $name) {
    $data = $p->config['pages'][$name];
    if ($data['type'] === "database") {
        $path = HTML_ROOT."php/db.php?db=$name";
        echo "   <a href=\"$path\" class=\"button\">{$data['title']}</a>\n";
    }
}
?>
  </div>
 </div>
</section>
</body>
</html>
