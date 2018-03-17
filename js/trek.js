/*
 * Should contain all cached content of the database
 */
class TrekTableModel {

  // Construct TrekDatabase Object from data given in ajax payload
  constructor(tableData) {

    // append all table-data to the database-object
    tableData.forEach( (row) => {
      this[row.id] = row;
    });

    // find row index of future new row
    this.calcNextRow(true);

    // add getter functions for direct access to properties of the current row
    Object.keys(this[this.currentRow]).forEach( (col) => {
      Object.defineProperty(this, col, {
        get: () => {
          return this[currentRow][col];
        },
        set: (value) => {
          this[currentRow][col] = value;
        }
      });
    });

    // append empty row as nextRow
    this[this.nextRow] = {};
  }

  // find largest numerical index and calculate the highest index row and next row
  calcNextRow(setCurrentRow = false) {
    let max = 0;
    Object.keys(this).forEach( (key) => {
      index = parseInt(key);
      if (!isNaN(index) && max < index) max = index;
    });
    if (setCurrentRow) this.currentRow = max;
    this.nextRow = max + 1;
  }

  // Update Data for specific Rows from data given in ajax payload
  update(tableData) {
    tableData.forEach( (row) => {
      if (row.deleted) delete this[row.id];
      else this[row.id] = row;
    });
    this.calcNextRow(true);
  }

  // Append new row
  append(row = {}) {
    this.currentRow = this.nextRow;
    this[this.currentRow] = row;
    this.nextRow++;
  }

  // Loop over all Rows
  forAll(doThis) {
    Object.keys(this).forEach( (key) => {
      index = parseInt(key);
      if (!isNaN(index)) {
        doThis(this[key],index);
      }
    });
  }

  // Loop over rows up to currentRow
  forEach(doThis, maxIndex = this.currentRow) {
    for (var index = 1; index < maxIndex; index++) {
      if (this.hasOwnProperty(index)) {
        doThis(this[index], index);
      }
    });
  }

  // backup a row to restore on edit cancel
  backup(id) {
    this.backup = {
      id: id,
      data: Object.assign({}, this[id])
    }
  }

  // restore the backed-up row
  restore() {
    this[this.backup.id] = this.backup.data;
  }
    

}

class TrekTableView {

  // construct from data given in ajax payload
  constructor(tableColumns, tableData) {
    this.dom = document.getElementById('trek-table');
    this.tableBody = this.dom.getElementsByTagName('tbody')[0];
    this.tableHead = this.dom.getElementsByTagName('thead')[0];
    this.columns = tableColumns;
    this.model = new TrekTableModel(tableData);
  }

  // get value for a specific Column and Row. column specified by column object, row by id.
  getValue(col, id) {
    if (typeof id === 'number') this.model.currentRow = id;
    else if (id === 'nextRow') this.model.currentRow = this.model.nextRow;
    switch(col.class) {
      case 2: // AutoColumn
        return col.run(this.model);
    }
    return this.model[col.name];
  }

  // set value for specific column and row. column specified by columnName, row by id.
  setValue(value, colName, id) {
    if (typeof id === 'number') this.model.currentRow = id;
    else if (id === 'nextRow') this.model.currentRow = this.model.nextRow;
    this.model[colName] = value;
  }

  // generate row formatted as tr
  getRow(id) {
    let tr = '';
    this.columns.forEach( (col) => {
      tr += `<td>${this.getValue(col, id)}</td>`;
    });
    tr += '<td></td>';
    return tr;
  }


  // generate table head
  getHeadRow() {
    let tr = '';
    this.columns.forEach( (col) => {
      tr += `<th>${col.title}</th>`;
    });
    tr += '<th></th>';
    return tr;
  }

  // generate insert form
  getInsertForm() {
    var tr = '<form id="insert" onsubmit="Trek.insertSubmit()">';
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1: // Data Column
          tr += `<th data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${col.title}" oninput="Trek.updateInsertForm(this)"></th>`;
          break;
        default:
          tr += `<th data-col="${col.name}"></th>`;
      }
    });
    tr += '<th><button type="submit" value="save" class="button is-link">Save</button><button value="reset" class="button is-text" onclick="Trek.insertReset()">Reset</button></th></form>';
    return tr;
  }

  // generate alter form
  getEditForm(id) {
    this.model.currentRow = id;
    var tr = '<form id="alter" onsubmit="Trek.alterSubmit()">';
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1: // Data Column
          tr += `<td data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${this.model[col.name]}" oninput="Trek.updateEditForm(this)"></td>`;
          break;
        default:
          tr += `<td data-col="${col.name}">${this.model[col.name]}</td>`
    }
    });
    tr += '<td><button type="submit" value="save" class="button is-link"">Save</button><button value="cancel" class="button is-text" onclick="Trek.alterCancel()">Cancel</button></td></form>';
    return tr;
  }

  // generate table head and replace current contents
  replaceHead() {
    this.tableHead.innerHTML = this.getHeadRow()+this.getInsertForm();
  }

  // generate table body and replace current contents
  replaceBody() {
    let tbody = '';
    for (var index = this.model.nextRow - 1; index > 0; index--) {
      if (this.model.hasOwnProperty(index)) tbody += `<tr id="${index}">${this.getRow(index)}</tr>`;
    }
    this.tableBody.innerHTML = tbody;
  }

  // generate single row and replace in DOM
  replaceRow(id) {
    let row = this.tableBody.getElementById(id);
    row.innerHTML = this.getRow(id);
    return row
  }

  // generate alter form and replace row in DOM
  editRow(id) {
    this.model.backup(id);
    let row = this.tableBody.getElementById(id);
    row.innerHTML = this.getEditForm(id);
    return row;
  }

  // update table body with changed rows
  updateBody(tableData) {
    this.model.update(tableData);
    Object.keys(tableData).forEach( (id) => {
      this.replaceRow(id);
    });
  }



}


class TrekDatabase {
  
  // request entry table from database
  constructor() {
    this.ajaxUrl = window.location.href;
    this.selectTable();
  }

  // switch row to edit form
  edit(event) {
    let row = event.srcElement;
    row.removeEventListener('click', this.edit);
    if (this.hasOwnPropery('editForm')) this.editDone();
    this.table.editRow(row.id);
    this.editForm = document.getElementById('alterform');
  }

  // switch back to row
  editDone() {
    let id = this.editForm.parentNode.id;
    delete this.editForm;
    this.table.replaceRow(id).addEventListener('click', this.edit);
  }

  // switch to edit mode where a click on a row turns the row into an editForm
  enterEditMode() {
    this.table.tableBody.children.forEach( (row) => {
      row.addEventListener('click', this.edit);
    });
    this.table.dom.classList.add('is-hoverable');
  }

  exitEditMode() {
    this.table.tableBody.children.forEach( (row) => {
      row.removeEventListener('click', this.edit);
    });
    this.table.dom.classList.remove('is-hoverable');
  }

  // general ajax settings and error handling
  ajaxRequest(data, onSuccess) {
    $.ajax({
      url: this.ajaxUrl,
      data: data,
      dataType: 'json',
      success: (response) => {
        if (response.success) onSuccess(response);
        else console.log(response.errormsg);
      },
      error: (xhr, ajaxOptions, thrownError) => {
        console.log('Ajax error: '+xhr+'\n'+thrownError);
      }
    });
  }

  // select all visible columns of a table, if tableName is null default is set server-side
  selectTable(tableName = null) {
    this.ajaxRequest(
      {operation: 'SELECT', tableName: tableName},
      (response) => {
        this.table = new TrekTableView(this.tableColumns[tableName], response.data);
        this.table.replaceHead();
        this.table.replaceBody();
        this.lastUpdate = response.time;
        this.insertForm = document.getElementById('insertform');
      }
    );
  }

  // pull updates since last refresh
  refreshTable() {
    this.ajaxRequest(
      {operation: 'SELECT', tableName: this.tableName, lastUpdate = this.lastUpdate},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // insert a new row
  insertRow(rowData) {
    this.ajaxRequest(
      {operation: 'INSERT', tableName: this.tableName, lastUpdate = this.lastUpdate, data: [rowData]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // alter an existing row
  alterRow(rowData) {
    this.ajaxRequest(
      {operation: 'ALTER', tableName: this.tableName, lastUpdate = this.lastUpdate, data: [rowData]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // delete a row
  deleteRow(rowId) {
    this.ajaxRequest(
      {operation: 'DELETE', tableName: this.tableName, lastUpdate = this.lastUpdate, rows: [rowId]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // submit the insert form
  insertSubmit() {
    data = {}
    this.insertForm.getElementsByTagName('input').forEach( (input) => {
      data[input.getAttribute('data-col')] = input.value;
    });
    this.insertRow(data);
    this.insertReset();
  }

  // reset the insert form
  insertReset() {
    this.insertForm.getElementsByTagName('input').forEach( (input) => {
      input.value = "";
    });
  }

  // submit the edit form
  editSubmit() {
    data = {id: this.editForm.parentNode.id};
    this.editForm.getElementsByTagName('input').forEach( (input) => {
      if (input.value !== "") {
        data[input.getAttribute('data-col')] = input.value;
      }
    });
    this.alterRow(data);
    this.editDone();
  }

  // cancel editing this row
  editCancel() {
    let id = this.editForm.parentNode.id;
    this.table.restore(id);
    this.table.replaceRow(id);
  }

  // recalculate all auto-columns in insert form (executed live during input)
  updateInsertForm(origin) {
    this.table.setValue(origin.value, origin.parentNode.getAttribute('data-col'), 'nextRow');
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.insertForm.querySelectorAll('th[data-col="'+col.name+'"]')[0]
            .innerHTML = this.table.getValue(col, 'nextRow');
      }
    });
  }

  // recalculate all auto-columns in edit form (executed live during input)
  updateEditForm(origin) {
    let id = this.editForm.parentNode.id;
    this.table.setValue(origin.value, origin.parentNode.getAttribute('data-col'), id);
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.editForm.querySelectorAll('th[data-col="'+col.name+'"]')[0]
            .innerHTML = this.table.getValue(col, id);
      }
    });
  }

}

document.onload( () => {
  Trek = new TrekDatabase();
});

