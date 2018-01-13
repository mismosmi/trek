<?php
if($_GET['operation'] == 'SELECT TABLE') die(
    '{"success":true,"data":{"mainValues":[{"jstest-id":1,"datacol":"Entry 1","timestamp":"2018-01-31"},{"jstest-id":2,"datacol":"Entry 2","timestamp":"2018-01-31"}],"sideValues":{}}}');
elseif($_GET['operation'] == 'INSERT') die(json_encode(
    ["success" => true,
    "data" => [
        "jstest-id" => 150,
        "datacol" => "Entry x",
        "timestamp" => "2018-02-01"
    ],
    "request" => $_GET]));

?>
