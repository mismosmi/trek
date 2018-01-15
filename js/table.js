function TableValues(tableName, mainValues, sideValues) {
    console.log('called TableValues');
    this._id = tableName+'_id';
    
    this.keys = [];
    for (var rn in mainValues) {
        for (var tn in sideValues) {
            mainValues[rn][tn] = sideValues[tn][mainValues[rn][tn+'_id']];
        }
        this[mainValues[rn][this._id]] = mainValues[rn];
        this.keys.push(parseInt(mainValues[rn][this._id]));
    }
    for (var tn in sideValues) {
        this[tn] = sideValues[tn];
    }

    this._tableNames = Object.keys(sideValues);
    this._currentRow = Math.max.apply(Math,this.keys);
    console.log(this.keys);
    delete this.keys;
    console.log('currentRow after loop: '+this._currentRow);
    this._nextRow = this._currentRow + 1;

    this._getRow = function(row) {
        if (typeof row === 'undefined') {
            return this[this._currentRow];
        } else if (typeof row === 'object') {
            for (var tn in this._tableNames) {
                row[tn] = this[tn][at[tn+'_id']];
            }
            row[this._id] = this._nextRow;
            this._currentRow = this._nextRow;
            return row;
        } else { 
            this._currentRow = row;
            return this[row];
        }
    };
    this._insertRow = function(row) {
        for (var tn in this._tableNames) {
            row[tn] = this[tn][row[tn+'_id']];
        }
        this._currentRow = row[this._id];
        this[this._currentRow] = row;
        this._nextRow = this._currentRow+1;
    };
    this._deleteRow = function(at) {
        delete this[at];
    };
    this._alterRow = function(row) {
        for (var tn in this._tableNames) {
            row[tn] = this[tn][row[tn+'_id']];
        }
        this[row[this._id]] = row;
        this._currentRow = row[this._id];
    };
    this.each = function(doThis) {
        for (var _index = this._currentRow; _index > 0; _index--) {
            if (_index in this) {
                doThis(_index, this[_index]);
            }
        }
    };

    console.log('tv:');
    console.log(this);
}

function Trek(userVars) {
    this.tableBody = $('.trek-table tbody');
    this.ajaxUrl = window.location.href;
    this.columns = [];
    this.tableName;
    for (var v in userVars) {
        this[v] = userVars[v];
    }

    this.getInsertForm = function() {
        var tr = $('<tr class="trek-form-insert"></tr>');
        for (var i in this.columns) {
            var col = this.columns[i];
            if (col.class === 0) {
                var input = $('<input type="text" class="form-control trek-data">');
                input.data('col',col.name)
                .attr('placeholder', col.placeholder)
                .attr('required', col.required)
                .on('input',this.updateInsert);
                tr.append($('<td></td>').append(input));
            } else if (col.class === 1) {
                var input = $('<input type="text" class="form-control trek-auto">');
                input.data('col',col.name);
                tr.append($('<td></td>').append(input));
            } else {
                tr.append($('<td></td>'));
            }
        }
        var cancelbutton = $('<button value="cancel" class="btn btn-default">Clear</button>');
        tr.append(
            $('<td></td>').append(
                $('<button type="submit" value="save" class="btn btn-default">'
                    +'Save</button>').click(this.saveThis),
                $('<button value="cancel" class="btn btn-default">Clear</button>')
                .click(function() {
                    $('.trek-form-insert input').val('');
                })
            )
        );
        return tr;
    };

    this.getAlterForm = function(rv) {
        var tr = $('<tr class="trek-form-alter"></tr>');
        tr.data('id',rv[this.tableName+'_id']);
        for (var i in this.columns) {
            var col = this.columns[i];
            if (col.class === 0) {
                var input = $('<input type="text" class="form-control trek-data">');
                input.data('col',col.name)
                .attr('placeholder', col.placeholder)
                .attr('required', col.required)
                .on('input', this.updateAlter);
                if (typeof rv !== 'undefined') {
                    input.val(rv[col.name]);
                }
                tr.append($('<td></td>').append(input));
            } else if (col.class === 1) {
                var input = $('<input type="text" class="form-control trek-auto">');
                input.data('col',col.name);
                if (typeof rv !== 'undefined') {
                    input.val(col.run(this.tv,rv));
                }
                tr.append($('<td></td>').append(input));
            } else {
                tr.append($('<td></td>').text(rv[col.name]));
            }
        }
        tr.append(
            $('<td></td>').append(
                $('<button type="submit" value="save" class="btn btn-default">'
                    +'Save</button>').click(this.editDone),
                $('<button value="cancel" class="btn btn-default">Cancel</button>')
                .click(this.editCancel),
                $('<button value="delete" class="btn btn-default">Delete</button>')
                .click(this.deleteThis)
            )
        );
        return tr;
    }

    this.getRow = function(rv) {
        var _this = this;
        var tr = $('<tr data-id="'+rv[this.tableName+'_id']+'"></tr>');
        for (var i in this.columns) {
            var col = this.columns[i];
            if (col.class === 1) {
                tr.append('<td>'+col.run(this.tv,rv)+'</td>');
            } else {
                tr.append('<td>'+rv[col.name]+'</td>');
            }
        }
        tr.append(
            $('<td></td>').append(
                $('<button value="edit" class="btn btn-default">Edit</button>')
                    .click(this.editThis)
            )
        );
        tr.dblclick(this.editThis);
        return tr;
    }

    this.getColumnByName = function(name) {
        for (var i in this.columns) {
            if (this.columns[i]['name'] === name) {
                return this.columns[i];
            }
        }
    }

    this.selectTable = function() {
        console.log('selectTable()');
        var _this = this;
        $.ajax({
            url: this.ajaxUrl, 
            data: {operation: 'SELECT TABLE'}, 
            dataType: 'json',
            success: function(response) {
                console.log(response);
                if (response.success) {
                    _this.tv = new TableValues(_this.tableName,
                        response.data.mainValues, 
                        response.data.sideValues
                    );
                    _this.tv.each(function(n, rv) {
                        _this.tableBody.append(_this.getRow(rv));
                    });
                } else {
                    alert(response.errormsg);
                }
            },
            error: function(xhr, ajaxOptions, thrownError) {
                console.log('Ajax error: '+xhr+'\n'+thrownError);
            }
        });
    };
     
    this.initInsert = function() { 
        var _this = this;
        var formDataFields, formAutoFields, insertForm;
        this.saveThis = function() {
            var data = {};
            formDataFields.each(function() {
                data[$(this).data('col')] = $(this).val();
            });
            $.ajax({
                url: _this.ajaxUrl,
                data: {operation: 'INSERT', data: data},
                dataType: 'json',
                success: function(response) {
                    console.log('insert response:');
                    console.log(response);
                    if(response.success) {
                        _this.tv._insertRow(response.data[0]);
                        insertForm.after(_this.getRow(_this.tv._getRow()));
                    } else {
                        alert(response.errormsg);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    console.log('Ajax error: '+xhr+'\n'+thrownError);
                }
            });
            $('.trek-form-insert input').val('');
        };
        this.updateInsert = function() {
            var rv = {};
            formDataFields.each(function() {
                rv[$(this).data('col')] = $(this).val();
            });
            rv = _this.tv._getRow(rv);
            formAutoFields.each(function() {
                var col = _this.getColumnByName($(this).data('col'));
                $(this).val(col['run'](_this.tv,rv));
            });
        };
        insertForm = this.getInsertForm();
        this.tableBody.prepend(insertForm);
        var formDataFields = $('.trek-form-insert .trek-data');
        var formAutoFields = $('.trek-form-insert .trek-auto');
    };

    this.initAlter = function() {
        var _this = this, formDataFields, formAutoFields;
        this.editThis = function() {
            _this.editCancel();
            var tr = ($(this).is('tr') ? $(this) : $(this).parents('tr'));
            var id = tr.data('id');
            tr.replaceWith(_this.getAlterForm(_this.tv._getRow(id)));
            formDataFields = $('.trek-form-alter .trek-data');
            formAutoFields = $('.trek-form-alter .trek-auto');
        };
        this.editDone = function() {
            var data = {};
            var tr = $(this).parents('tr');
            var row = tr.data('id');
            formDataFields.each(function() {
                data[$(this).data('col')] = $(this).val();
            });
            $.ajax({
                url: _this.ajaxUrl,
                data: {operation: 'ALTER', row: row, data: data},
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        _this.tv._alterRow(response.data[0]);
                        tr.replaceWith(_this.getRow(_this.tv._getRow()));
                    } else {
                        alert(response.errormsg);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    console.log('Ajax error: '+xhr+'\n'+thrownError);
                }
            });
            $('.trek-form-alter input').val('');
        };

        this.editCancel = function() {
            var tr = $('.trek-form-alter');
            if (tr.length !== 0) {
                var id = tr.data('id');
                tr.replaceWith(_this.getRow(_this.tv._getRow(id)));
            }
        };

        this.updateAlter = function() {
            var rv = {};
            formDataFields.each(function() {
                rv[$(this).data('col')] = $(this).val();
            });
            rv = _this.tv._getRow(rv);
            formAutoFields.each(function() {
                var col = _this.getColumnByName($(this).data('col'));
                $(this).val(col['run'](_this.tv,rv));
            });
        };
    };

    this.initDelete = function() {
        _this = this;
        this.deleteThis = function() {
            console.log(this);
            var id = $(this).parents('tr').data('id');
            console.log('deleteThis: '+id);
            $.ajax({
                url: _this.ajaxUrl,
                data: {operation: 'DELETE', row: id},
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        _this.tv._deleteRow(response.row);
                        console.log('delete row '+response.row);
                    } else {
                        alert(response.errormsg);
                    }
                },
                error: function(xhr, ajaxOptions, thrownError) {
                    console.log('Ajax error: '+xhr+'\n'+thrownError);
                }
            });
            $('.trek-form-alter').remove();
        };
    };
    this.suggest = function() {
    };
    this.filter = function() {
    };

    this.selectTable();
    this.initInsert();
    this.initDelete();
    this.initAlter();
}
