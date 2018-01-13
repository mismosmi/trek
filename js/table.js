function Tv(mainValues, sideValues) {
    this.mainValues = mainValues;
    this.sideValues = sideValues;
    for (var rn in this.mainValues) {
        for (var tn in this.sideValues) {
            this.mainValues[rn][tn] = this.sideValues[tn][this.mainValues[rn][tn+'-id']];
        }
    }

    this.get = function(at) {
        return $.extend({'+': },
            this.mainValues,
            this.sideValues,
            this.mainValues[at]
        );
    };
    this.add = function(row) {
        for (var tn in this.sideValues) {
            row[tn] = this.sideValues[tn][row[tn+'-id']];
        this.mainValues.push(row);
    };
}

function Trek(userVars) {
    this.tableBody = $('.trek-table tbody');
    this.ajaxUrl = window.location.href;
    this.columns = [];
    for (var v in userVars) {
        this[v] = userVars[v];
    }
    this.formDataFields = $('.trek-data');
    this.formAutoFields = $('.trek-auto');
    this.tv;

    this.getColumnByName = function(name) {
        for (var i in this.columns) {
            if (this.columns[i]['name'] === name) {
                return this.columns[i];
            }
        }
    }

    this.appendRow = function(n,row) {
        console.log('appendrow: '+JSON.stringify(row));
        var tr = $('<tr></tr>');
        var tv = this.tv.get(n);
        for (var i in this.columns) {
            var col = this.columns[i];
            console.log('for column '+col.name);
            if (col.class === 1) {
                tr.append('<td>'+col.run(tv,n)+'</td>');
            } else {
                tr.append('<td>'+row[col.name]+'</td>');
            }
        }
        this.tableBody.append(tr);
    };

    this.selectTable = function() {
        var _this = this;
        $.ajax({
            url: this.ajaxUrl, 
            data: {operation: 'SELECT TABLE'}, 
            dataType: 'json',
            success: function(response) {
                if (response.success) {
                    _this.tv = Tv(response.data.mainValues, response.data.sideValues);
                    for (var n in response.data.mainValues) {
                        _this.appendRow(n,response.data.mainValues[n]);
                    }
                } else {
                    alert(response.errormsg);
                }
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log('Ajax error: '+xhr+'\n'+thrownError);
            }
        });
    };
     
    this.insert = function() { 
        var _this = this;
        $('.trek-form button[type="submit"]').click(function() {
            console.log('clicked submit');
            var data = {};
            for (var cn in _this.formDataFields) {
                var df = _this.formDataFields[cn];
                console.log('for column '+cn);
                var t = df.val();
                df.val('');
                if (t !== '') {
                    data[cn] = t;
                }
            }
            console.log('ajax call to '+_this.ajaxUrl+' with data:');
            console.log(data);
            $.ajax({
                url: _this.ajaxUrl,
                data: {operation: 'INSERT', data: data},
                dataType: 'json',
                success: function(response) {
                    console.log(response);
                    if(response.success) {
                        _this.appendRow(response.data);
                    } else {
                        alert(response.errormsg);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    console.log('Ajax error: '+xhr+'\n'+thrownError);
                }
            });
        });
        _this.formDataFields.change(function() {
            _this.formAutoFields.each(function() {
                var col = _this.getColumnByName($(this).data('col'));
                $(this).val(col['run']('+',_this.tv.get()));
            });
        });
        for (var dcn in _this.formDataFields) {
            var df = _this.formDataFields[dcn];
            df.change(function() {
                af.each
                
            });
        }

    };
    this.edit = function() {};
    this.alter = function() {};
    this.delete = function() {};
    this.suggest = function() {};
    this.filter = function() {};
    this.initAll = function() {
        $.each(trekTools.constructors, function(name, fn) {
            fn();
        });
    };
    this.initMin = function() {
        trekTools.constructors.selectTable();
        trekTools.constructors.insert();
        trekTools.constructors.alter();
        trekTools.constructors.delete();
    };
}
