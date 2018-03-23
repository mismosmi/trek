"use strict";
/*
 * Should contain all cached content of the database
 */
class TrekTableModel {

  // Construct TrekDatabase Object from data given in ajax payload
  constructor(columnData, tableData) {

    // append all table-data to the database-object
    Object.assign(this, tableData);

    // attach accessort
    columnData.forEach( (col) => {
      switch (col.class) {
        case 0:
          if (col.name === 'id') {
            Object.defineProperty(this, 'id', {
              get: () => {
                return this.currentId;
              }
            });
          } else {
            Object.defineProperty(this, col.name, {
              get: () => {
                return this[this.currentId][col.name];
              }
            });
          }
          break;
        case 1:
          Object.defineProperty(this, col.name, {
            get: () => {
              return this[this.currentId][col.name];
            },
            set: (value) => {
              this[this.currentId][col.name] = value;
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
              return (this[this.currentId][col.name]) ? this[this.currentId][col.name] : '';
            },
            set: (value) => {
              this[this.currentId][col.name] = value;
            }
          });
          break;
      }
    });

    // create empty row to store values from insertForm
    this.insertRow = {};

  }

  // find largest numerical index and calculate the highest index row and next row
  getMaxIndex() {
    let max = 0;
    Object.keys(this).forEach( (key) => {
      const index = parseInt(key);
      if (!isNaN(index) && max < index) max = index;
    });
    return max;
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

  // Loop over rows up to currentId
  forEach(doThis, maxIndex = this.currentId) {
    for (var index = 1; index < maxIndex; index++) {
      if (this[index] !== undefined) {
        doThis(this[index], index);
      }
    }
  }

  // copy a row to editRow in order to edit non-destructively
  edit(id) {
    this.editRow = Object.assign({}, this[id])
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

  // get column by name
  getColumnByName(colName) {
    return this.columns.find( (col) => {
      return col.name === colName;
    });
  }

  // generate row formatted as tr
  getRow(id) {
    let tr = '';
    this.model.currentId = id;
    this.columns.forEach( (col) => {
      tr += `<td data-col="${col.name}">${this.model[col.name]}</td>`;
    });
    tr += '<td></td>';
    return tr;
  }

  // return only data and foreign key fields for ajax requests
  getDataFields(rowId) {
    this.model.currentId = rowId;
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
    tr += '<th><div class="buttons has-addons"><span id="trek-insert-save" class="button is-link" onclick="Trek.insertSubmit(this)">Save</span><span id="trek-insert-reset" class="button is-text" onclick="Trek.insertReset()">Reset</span></div></th>';
    return tr;
  }

  // generate alter form
  getEditForm(id) {
    this.model.currentId = id;
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
    tr += '<td><div class="buttons has-addons"><span id="trek-edit-save" class="button is-link">Save</span><span id="trek-edit-cancel" class="button is-text">Cancel</span></div></td></form>';
    return tr;
  }

  // generate table head and replace current contents
  replaceHead() {
    this.tableHead.innerHTML = `<tr>${this.getHeadRow()}</tr><tr id="insertform">${this.getInsertForm()}</tr>`;
  }

  // generate table body and replace current contents
  replaceBody() {
    this.tableBody.innerHTML = '';
    for (var index = this.model.getMaxIndex(); index > 0; index--) {
      if (this.model[index] !== undefined) {
        const tr = document.createElement('tr');
        tr.id = index;
        tr.innerHTML = this.getRow(index);
        tr.addEventListener('click', (event) => {
          Trek.editThis(event);
        });
        this.tableBody.appendChild(tr);
      }
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
        tr.addEventListener('click', (event) => {
          Trek.editThis(event);
        });
        this.tableBody.insertBefore(tr, this.tableBody.children[0]);
      } else if (tableData[id].deleted) {
        this.model[id] = undefined;
        this.tableBody.removeChild(tr);
      } else {
        this.model[id] = tableData[id];
        tr.innerHTML = this.getRow(id);
      }
    });
  }



}


class TrekDatabase {
  
  // request entry table from database
  constructor(settings) {
    // set default value for ajaxUrl
    this.ajaxUrl = location.origin+'/php/api.php';
    // copy passed-in settings
    Object.assign(this, settings);
    // find active tab to reduce DOM calls for tab switching
    this.activeTab = document.querySelector('#trek-db-nav li[data-table="'+this.tableName+'"]');
    // fetch initial data from server
    this.selectTable();
    // we are not in edit mode
    this.editMode = false;
    // find editButton and add toggle function on click
    this.editButton = document.getElementById('trek-edit-button');
    this.editButton.addEventListener('click', () => {
      // toggle edit mode
      if (this.editMode) {
        this.exitEditMode();  
      } else {
        this.enterEditMode();
      }
    });
    // add Keyboard shortcuts
    //document.addEventListener('keydown', (event) => {
    //  const activeElement = document.activeElement;
    //  if (activeElement.nodeName === 'INPUT' && activeElement.parentNode.) {
    //    switch (event.key) {
    //      case 'Enter':
    //    }
    //  }
    //});
  }

  // switch row to edit form
  editThis(event) {
    if (this.editMode) {
      // if we click on a row and that row is not already the edit-form
      if (event.currentTarget !== this.editForm) {
        // first close any other edit-form
        this.editDone();
        // this row is becoming the new edit-form
        this.editForm = event.currentTarget;
        // save the column we clicked on to focus it later
        const targetColumn = event.target.getAttribute('data-col');
        // copy row values to editRow
        this.table.model.edit(this.editForm.id);
        // replace row content with edit-form
        this.editForm.innerHTML = this.table.getEditForm(this.editForm.id);
        // find input in the right column if there is one and focus it
        const input = this.editForm.querySelector('td[data-col="'+targetColumn+'"] input');
        if (input !== null) input.focus();
        // otherwise focus first input in this row
        else this.editForm.querySelector('input').focus();
      // if we click the save-button
      } else if (event.target.id === 'trek-edit-save') {
        event.target.classList.add('is-loading');
        this.alterRow(this.table.getDataFields('editRow'), this.editForm.id, () => {
          event.target.classList.remove('is-loading');
          this.editDone();
        }, () => {
          event.target.classList.remove('is-loading');
          this.table.model.edit(this.editForm.id);
          this.editForm.innerHTML = this.table.getEditForm(this.editForm.id);
        });
      // if we click the cancel-button
      } else if (event.target.id === 'trek-edit-cancel') {
        this.editDone();
      }
    }
  }

  // switch back to row
  editDone() {
    if (this.editForm !== undefined) {
      this.editForm.innerHTML = this.table.getRow(this.editForm.id);
      this.editForm = undefined;
    }
  }

  exitEditMode() {
    if (this.editMode) {
      this.editDone();
      this.table.dom.classList.remove('is-hoverable');
      this.editMode = false;
      this.editButton.textContent = "Edit";
    }
  }

  enterEditMode() {
    if (!this.editMode) {
      this.table.dom.classList.add('is-hoverable');
      this.editMode = true;
      this.editButton.textContent = "Done";
    }
  }

  // general ajax settings and error handling
  ajaxRequest(data, onSuccess, onError) {
    console.log('ajax request, url: ', this.ajaxUrl, ' data: ', data);
    $.ajax({
      url: this.ajaxUrl,
      method: 'POST',
      data: data,
      dataType: 'json',
      success: (response) => {
        console.log('response: ', response);
        if (response.success) onSuccess(response);
        else {
          alert('Database error: '+response.errormsg);
          if (typeof onError === 'function') onError();
        }
      },
      error: (xhr, ajaxOptions, thrownError) => {
        alert('Ajax error: '+xhr.status+'\n'+thrownError);
        if (typeof onError === 'function') onError();
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
    this.exitEditMode();
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
  insertRow(rowData, callback, onError) {
    this.ajaxRequest(
      {operation: 'INSERT', tableName: this.tableName, lastUpdate: this.lastUpdate, data: [rowData]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
        callback();
      },
      onError
    );
  }

  // alter an existing row
  alterRow(rowData, rowId, callback, onError) {
    const data = {};
    data[rowId] = rowData;
    this.ajaxRequest(
      {operation: 'ALTER', tableName: this.tableName, lastUpdate: this.lastUpdate, data: data},
      (response) => {
        this.table.updateBody(response.data, this.edit);
        this.lastUpdate = response.time;
        callback();
      },
      onError
    );
  }

  // delete a row
  deleteRow(rowId) {
    this.ajaxRequest(
      {operation: 'DELETE', tableName: this.tableName, lastUpdate: this.lastUpdate, rows: [rowId]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
      }
    );
  }

  // submit the insert form
  insertSubmit(submitButton) {
    submitButton.classList.add('is-loading');
    this.insertRow(this.table.model.insertRow, () => {
      submitButton.classList.remove('is-loading');
      this.insertReset();
    }, () => {
      submitButton.classList.remove('is-loading');
    });
  }

  // reset the insert form
  insertReset() {
    this.table.model.insertRow = {};
    this.insertForm.innerHTML = this.table.getInsertForm();
  }

  // recalculate all auto-columns in insert form (executed live during input)
  updateInsertForm(origin) {
    this.table.model.currentId = 'insertRow';
    this.table.model[origin.parentNode.getAttribute('data-col')] = origin.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.insertForm.querySelector('th[data-col="'+col.name+'"]')
            .textContent = this.table.model[col.name];
      }
    });
  }

  // recalculate all auto-columns in edit form (executed live during input)
  updateEditForm(origin) {
    this.table.model.currentId = 'editRow';
    this.table.model[origin.parentNode.getAttribute('data-col')] = origin.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.editForm.querySelector('td[data-col="'+col.name+'"]')
            .textContent = this.table.model[col.name];
      }
    });
  }

}
