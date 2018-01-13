function ajaxTest(url, data) {
    $.ajax({
        url: url,
        data: data,
        //dataType: "json"
        async: false,
        success: function(result) {
            $('#output').append(
                "<li><p><b>JSON Api Test</b></p>"
                +"<p>data:<br/>"
                +JSON.stringify(data)+"</p>"
                +"<p>result:<br/>"
                +result+"</p></li>"
            );
        },
        error: function(xhr, ajaxOptions, thrownError) {
            $('#output').append(
                "<li><p><b>JSON Api Test Error</b></p>"
                +"<p>data:<br/>"
                +JSON.stringify(data)+"</p>"
                +"<p>xhr status:<br/>"
                +xhr.status+"</p>"
                +"<p>error:<br/>"
                +thrownError+"</p></li>"
            );
        }
    });
}
$(document).ready(function(){
    ajaxTest('jsonApiTest.php', {testdata: 'dies ist ein test'});
    ajaxTest('../p/dbtest.php', {operation: 'SELECT TABLE'});
    ajaxTest('../p/dbtest.php', {operation: 'INSERT', data: {datacol1: "exampledata"}});
    ajaxTest('../p/dbtest.php', {operation: 'SELECT TABLE'});
    ajaxTest('../p/dbtest.php', {operation: 'ALTER', row: 1, data: {datacol1: "changed data"}});
    ajaxTest('../p/dbtest.php', {operation: 'SELECT TABLE'});
    ajaxTest('../p/dbtest.php', {operation: 'DELETE', row: 1});
    ajaxTest('../p/dbtest.php', {operation: 'SELECT TABLE'});

});
