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
              if (this.hasOwnProperty(this.currentId)) {
                return this[this.currentId][col.name];
              } else {
                return null;
              }
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
    this.formRow = {};

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
    if (id === 'insertRow') this.formRow = {};
    else this.formRow = Object.assign({}, this[id])
    this.currentId = id;
  }

}

class TrekTableView {

  // construct from data given in ajax payload
  constructor(tableColumns, tableData) {
    this.dom = document.getElementById('trek-table');
    this.body = this.dom.getElementsByTagName('tbody')[0];
    this.head = this.dom.getElementsByTagName('thead')[0];
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
    if (id === 'insertRow') return 'add new row'; // TODO make this span all the columns
    let tr = '';
    this.model.currentId = id;
    this.columns.forEach( (col) => {
      tr += `<td data-col="${col.name}">${this.model[col.name]}</td>`;
    });
    tr += '<td></td>';
    return tr;
  }

  // return form data
  getFormData() {
    this.model.currentId = 'formRow';
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

  // generate form
  getForm() {
    let tr = '';
    this.columns.forEach( (col) => {
      tr += ``;
      switch (col.class) {
        case 1: // Data Column
        case 3: // Foreign Key
          tr += `<td data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${this.model.formRow[col.name] ? this.model.formRow[col.name] : col.title}" oninput="Trek.updateForm(this)"></td>`;
          break;
        case 2: // Auto Column
          tr += `<td data-col="${col.name}">${this.model[col.name]}</td>`;
          break;
        default:
          tr += `<td data-col="${col.name}"></td>`;
      }
    });
    console.log('getForm, formRow:',Object.keys(this.model.formRow));
    tr += `<td><div class="buttons has-addons"><span id="trek-save" class="button is-link">Save</span><span id="trek-cancel" class="button">Cancel</span>${Object.keys(this.model.formRow).length === 0 ? '' : '<span id="trek-delete" class="button">Delete</span>'}</div></td>`;
    return tr
  }

  appendRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    tr.innerHTML = this.getRow(id);
    tr.addEventListener('click', (event) => {
      Trek.editThis(event);
    });
    this.body.appendChild(tr);
    return tr;
  }

  // update table body with changed rows
  updateBody(tableData) {
    Object.keys(tableData).forEach( (id) => {
      let tr = document.getElementById(id);
      if (tr === null) {
        if (!tableData[id].deleted) {
          this.model[id] = tableData[id];
          tr = document.createElement('tr');
          tr.innerHTML = this.getRow(id);
          tr.id = id;
          tr.addEventListener('click', (event) => {
            Trek.editThis(event);
          });
          this.body.insertBefore(tr, this.body.children[0]);
        }
      } else {
        if (tableData[id].deleted) {
          this.model[id] = undefined;
          this.body.removeChild(tr);
        } else {
          this.model[id] = tableData[id];
          tr.innerHTML = this.getRow(id);
        }
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
    if (this.editMode || event.currentTarget.id === 'insertRow') {
      // if we click on a row and that row is not already the edit-form
      if (event.currentTarget !== this.form) {
        // first close any other edit-form
        this.editDone();
        // this row is becoming the new edit-form
        this.form = event.currentTarget;
        // save the column we clicked on to focus it later
        const targetColumn = event.target.getAttribute('data-col');
        // copy row values to formRow and set currentId
        this.table.model.edit(this.form.id);
        // replace row content with edit-form
        this.form.innerHTML = this.table.getForm();
        // find input in the right column if there is one and focus it
        const input = this.form.querySelector('td[data-col="'+targetColumn+'"] input');
        if (input !== null) input.focus();
        // otherwise focus first input in this row
        else this.form.querySelector('input').focus();
        // TODO maybe add a select all if value != '' here
      // if we click the save-button
      } else if (event.target.id === 'trek-save') {
        event.target.classList.add('is-loading');
        if (this.form.id === 'insertRow') {
          const onSuccess = () => {
            event.target.classList.remove('is-loading');
            this.editDone();
          };
          const onError = () => {
            event.target.classList.remove('is-loading');
            this.table.model.edit(this.form.id);
            this.form.innerHTML = this.table.getForm(this.form.id);
          };
          this.insertRow(this.table.getFormData(), () => {

        this.alterRow(this.table.getFormData(), this.form.id, () => {
          event.target.classList.remove('is-loading');
          this.editDone();
        }, () => {
          event.target.classList.remove('is-loading');
          this.table.model.edit(this.form.id);
          this.form.innerHTML = this.table.getEditForm(this.form.id);
        });
      // if we click the cancel-button
      } else if (event.target.id === 'trek-cancel') {
        this.editDone();
      } else if (event.target.id === 'trek-delete') {
        event.target.classList.add('id-loading');
        this.deleteRow(this.form.id, () => {
          this.form = undefined;
          event.target.classList.remove('is-loading');
        }, () => {
          event.target.classList.remove('is-loading');
        });
      }
    }
  }

  // switch back to row
  editDone() {
    if (this.form !== undefined) {
      this.form.innerHTML = this.table.getRow(this.form.id);
      this.form = undefined;
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
        this.table.head.innerHTML = `<tr>${this.table.getHeadRow()}</tr>`;
        this.table.body.innerHTML = '';
        this.insertRow = this.table.appendRow('insertRow');
        for (var index = this.table.model.getMaxIndex(); index > 0; index--) {
          if (this.table.model[index] !== undefined) {
            this.table.appendRow(index);
          }
        }
        this.lastUpdate = response.time;
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
  deleteRow(rowId, callback, onError) {
    this.ajaxRequest(
      {operation: 'DELETE', tableName: this.tableName, lastUpdate: this.lastUpdate, rows: [rowId]},
      (response) => {
        this.table.updateBody(response.data);
        this.lastUpdate = response.time;
        callback();
      },
      onError
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

  // recalculate all auto-columns in form (executed live during input)
  updateForm(origin) {
    this.table.model.currentId = 'formRow';
    this.table.model[origin.parentNode.getAttribute('data-col')] = origin.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.form.querySelector('td[data-col="'+col.name+'"]').textContent = this.table.model[col.name];
      }
    });
  }

}
