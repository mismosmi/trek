<?php
if($_GET['operation'] == 'SELECT TABLE') die(
    '{"success":true,"data":{"mainValues":[{"jstest-id":1,"datacol":"Entry 1","datacol2":"More Data","timestamp":"2018-01-31"},{"jstest-id":2,"datacol":"Entry 2","datacol2":"Even More Data","timestamp":"2018-01-31"}],"sideValues":{}}}');
elseif($_GET['operation'] == 'INSERT') die(json_encode(
    ["success" => true,
    "data" => $_GET['data'],
    "request" => $_GET]));
elseif($_GET['operation'] == 'ALTER') die(json_encode(
    ["success" => true,
    "data" => $_GET['data']]));
elseif($_GET['operation'] == 'DELETE') die(json_encode(
    ["success" => true,
    "row" => $_GET['row']]));

?>
