/*
 * Should contain all cached content of the database
 */
class TrekTableModel {

  // Construct TrekDatabase Object from data given in ajax payload
  constructor(columnData, tableData) {

    // append all table-data to the database-object
    Object.assign(this, tableData);

    // find row index of future new row
    this.calcNextRow(true);

    // attach accessort
    columnData.forEach( (col) => {
      switch (col.class) {
        case 0:
          if (col.name === 'id') {
            Object.defineProperty(this, 'id', {
              get: () => {
                return this.currentRow;
              }
            });
          } else {
            Object.defineProperty(this, col.name, {
              get: () => {
                return this[this.currentRow][col.name];
              }
            });
          }
          break;
        case 1:
          Object.defineProperty(this, col.name, {
            get: () => {
              //return (this[this.currentRow][col.name] === null) ? '' : this[this.currentRow][col.name];
              return this[this.currentRow][col.name];
            },
            set: (value) => {
              this[this.currentRow][col.name] = value;
            }
          });
          break;
        case 2:
          Object.defineProperty(this, col.name, {
            get: () => {
              return col.run(this);
            }
          });
          break;
        case 3:
          Object.defineProperty(this, col.name, {
            get: () => {
              return (this[this.currentRow][col.name]) ? this[this.currentRow][col.name] : '';
            },
            set: (value) => {
              this[this.currentRow][col.name] = value;
            }
          });
          break;
      }
    });

  }

  // find largest numerical index and calculate the highest index row and next row
  calcNextRow(setCurrentRow = false) {
    let max = 0;
    Object.keys(this).forEach( (key) => {
      const index = parseInt(key);
      if (!isNaN(index) && max < index) max = index;
    });
    if (setCurrentRow) this.currentRow = max;
    this.nextRow = max + 1;

    // append empty row as nextRow
    this[this.nextRow] = {};
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
      if (this[index] !== undefined) {
        doThis(this[index], index);
      }
    }
  }

  // backup a row to restore on edit cancel
  backup(id) {
    this.backupRow = {
      id: id,
      data: Object.assign({}, this[id])
    }
  }

  // restore the backed-up row
  restore() {
    this[this.backupRow.id] = this.backupRow.data;
  }

}

class TrekTableView {

  // construct from data given in ajax payload
  constructor(tableColumns, tableData) {
    this.dom = document.getElementById('trek-table');
    this.tableBody = this.dom.getElementsByTagName('tbody')[0];
    this.tableHead = this.dom.getElementsByTagName('thead')[0];
    this.columns = tableColumns;
    this.model = new TrekTableModel(tableColumns, tableData);
  }

  // generate row formatted as tr
  getRow(id) {
    let tr = '';
    this.model.currentRow = id;
    this.columns.forEach( (col) => {
      tr += `<td>${this.model[col.name]}</td>`;
    });
    tr += '<td></td>';
    return tr;
  }

  // return only data and foreign key fields for ajax requests
  getDataFields(rowId) {
    this.model.currentRow = rowId;
    const data = {};
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1:
          if (this.model[col.name] === 0 || this.model[col.name]) data[col.name] = this.model[col.name];
          break;
        case 3:
          if (this.model[col.name]) data[col.name] = this.model[col.name];
          break;
      }
    });
    return data;
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
    let tr = '';
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1: // Data Column
        case 3: // Foreign Key
          tr += `<th data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${col.title}" oninput="Trek.updateInsertForm(this)"></th>`;
          break;
        case 2: // Auto Column
          tr += `<th data-col="${col.name}">${this.model[col.name]}</th>`;
          break;
        default:
          tr += `<th data-col="${col.name}"></th>`;
      }
    });
    tr += '<th><div class="buttons has-addons"><span value="trek-insert-save" class="button is-link" onclick="Trek.insertSubmit(this)">Save</span><span value="trek-insert-reset" class="button is-text" onclick="Trek.insertReset()">Reset</span></div></th>';
    return tr;
  }

  // generate alter form
  getEditForm(id) {
    this.model.currentRow = id;
    let tr = '';
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1: // Data Column
        case 3: // Foreign Key
          tr += `<td data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${this.model[col.name]}" oninput="Trek.updateEditForm(this)"></td>`;
          break;
        default:
          tr += `<td data-col="${col.name}">${this.model[col.name]}</td>`
    }
    });
    tr += '<td><div class="buttons has-addons"><span value="trek-edit-save" class="button is-link">Save</span><span value="trek-edit-cancel" class="button is-text">Cancel</span></div></td></form>';
    return tr;
  }

  // generate table head and replace current contents
  replaceHead() {
    this.tableHead.innerHTML = `<tr>${this.getHeadRow()}</tr><tr id="insertform">${this.getInsertForm()}</tr>`;
  }

  // generate table body and replace current contents
  replaceBody() {
    let tbody = '';
    for (var index = this.model.nextRow - 1; index > 0; index--) {
      if (this.model[index] !== undefined) {
        const tr = document.createElement('tr');
        tr.id = index;
        tr.innerHTML = this.getRow(index);
        tr.addEventListener('click', Trek.edit);
        this.tableBody.appendChild(tr);
      }
    }
  }

  // generate single row and replace in DOM
  replaceRow(id) {
    const row = document.getElementById(id);
    if (this.model[id] !== undefined) { 
      row.innerHTML = this.getRow(id);
      return row
    } else {
      this.tableBody.removeChild(row);
    }
  }

  // update table body with changed rows
  updateBody(tableData) {
    Object.keys(tableData).forEach( (id) => {
      let tr = document.getElementById(id);
      if (tr === null && !tableData[id].deleted) {
        this.model[id] = tableData[id];
        tr = document.createElement('tr');
        tr.innerHTML = this.getRow(id);
        tr.id = id;
        tr.addEventListener('click', Trek.edit);
        this.tableBody.insertBefore(tr, this.tableBody.children[0]);
      } else if (tableData[id].deleted) {
        this.model[id] = undefined;
        this.tableBody.removeChild(tr);
      } else {
        this.model[id] = tableData[id];
        tr.innerHTML = this.getRow(id);
      }
    });
    this.model.calcNextRow(true);
  }



}


class TrekDatabase {
  
  // request entry table from database
  constructor(settings) {
    this.ajaxUrl = location.origin+'/php/api.php';
    Object.assign(this, settings);
    this.activeTab = document.querySelector('#trek-db-nav li[data-table="'+this.tableName+'"]');
    this.selectTable();
    this.editMode = false;
    console.log('constructor editMode: ',this.editMode);
  }

  // switch row to edit form
  edit(event) {
    console.log('edit editMode: ',this.editMode, ' currentTarget: ',event.currentTarget, ' editForm: ',this.editForm);
    if (this.editMode) {
      if (event.currentTarget !== this.editForm) {
        this.editDone();
        this.editForm = event.currentTarget;
        this.table.model.backup(this.editForm.id);
        this.editForm.innerHTML = this.table.getEditForm(row.id);
      } else if (event.target.value === 'trek-edit-save') {
        event.target.classList.add('is-loading');
        this.alterRow(this.table.getDataFields(this.editForm.id), this.editForm.id, () => {
          event.target.classList.remove('is-loading');
          this.editDone();
        });
      } else if (event.target.value === 'trek-edit-cancel') {
        this.table.model.restore(this.editForm.id);
        this.editDone();
      }
    }
  }

  // switch back to row
  editDone() {
    console.log('editDone, id: ',this.editForm.id);
    if (this.editForm !== undefined) {
      this.editForm.innerHTML = this.table.getRow(this.editForm.id);
      this.editForm = undefined;
    }
    console.log('editForm: ',this.editForm);
  }

  toggleEditMode(editButton) {
    if (this.editMode) {
      this.editCancel();
      this.table.dom.classList.remove('is-hoverable');
      this.editMode = false;
      editButton.textContent = "Edit";
    } else {
      this.table.dom.classList.add('is-hoverable');
      this.editMode = true;
      editButton.textContent = "Done";
    }
  }


  // general ajax settings and error handling
  ajaxRequest(data, onSuccess) {
    console.log('ajax request, url: ', this.ajaxUrl, ' data: ', data);
    $.ajax({
      url: this.ajaxUrl,
      method: 'POST',
      data: data,
      dataType: 'json',
      success: (response) => {
        console.log('response: ', response);
        if (response.success) onSuccess(response);
        else console.log('Database error: '+response.errormsg);
      },
      error: (xhr, ajaxOptions, thrownError) => {
        console.log('Ajax error: '+xhr.status+'\n'+thrownError);
      }
    });
  }

  // select all visible columns of a table, if tableName is null default is set server-side
  selectTable(tabLink) {
    if (typeof tabLink === 'object') {
      this.activeTab.classList.remove('is-active');
      this.activeTab = tabLink.parentNode;
      this.tableName = this.activeTab.getAttribute('data-table');
    }
    this.activeTab.classList.add('is-active');
    this.ajaxRequest(
      {operation: 'SELECT', tableName: this.tableName},
      (response) => {
        this.table = new TrekTableView(this.tableColumns[this.tableName], response.data);
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
      {operation: 'SELECT', tableName: this.tableName, lastUpdate: this.lastUpdate},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // insert a new row
  insertRow(rowData, callback) {
    this.ajaxRequest(
      {operation: 'INSERT', tableName: this.tableName, lastUpdate: this.lastUpdate, data: [rowData]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
        if (typeof callback === 'function') callback();
      }
    );
  }

  // alter an existing row
  alterRow(rowData, rowId, callback) {
    const data = {};
    data[rowId] = rowData;
    this.ajaxRequest(
      {operation: 'ALTER', tableName: this.tableName, lastUpdate: this.lastUpdate, data: data},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
        if (typeof callback === 'function') callback();
      }
    );
  }

  // delete a row
  deleteRow(rowId, callback) {
    this.ajaxRequest(
      {operation: 'DELETE', tableName: this.tableName, lastUpdate: this.lastUpdate, rows: [rowId]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
        if (typeof callback === 'function') callback();
      }
    );
  }

  // submit the insert form
  insertSubmit(submitButton) {
    console.log('submitButton: ',submitButton);
    submitButton.classList.add('is-loading');
    this.insertRow(this.table.getDataFields(this.table.model.nextRow), () => {
      submitButton.classList.remove('is-loading');
    });
  }

  // reset the insert form
  insertReset() {
    this.insertForm.innerHTML = this.table.getInsertForm();
  }

  // recalculate all auto-columns in insert form (executed live during input)
  updateInsertForm(origin) {
    this.table.model.currentRow = this.table.model.nextRow;
    this.table.model[origin.parentNode.getAttribute('data-col')] = origin.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.insertForm.querySelector('th[data-col="'+col.name+'"]')
            .innerHTML = this.table.model[col.name];
      }
    });
  }

  // recalculate all auto-columns in edit form (executed live during input)
  updateEditForm(origin) {
    this.table.model.currentRow = this.editForm.id;
    this.table.model[origin.parentNode.getAttribute('data-col')] = origin.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.editForm.querySelector('td[data-col="'+col.name+'"]')
            .innerHTML = this.table.model[col.name];
      }
    });
  }

}
