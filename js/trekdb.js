"use strict";
/*
 * Should contain all cached content from the database
 */
class TrekTableModel {

  // Construct TrekDatabase Object from data given in ajax payload
  constructor(columnData, tableData) {

    this.convertRowTypes = (row) => {
      const columns = columnData;
      columns.forEach( (col) => {
        const type = col.type.toUpperCase();
        if (
          type.startsWith('INT') ||
          type.startsWith('EURO')
        ) {
          if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => parseInt(val) );
          return row[col.name] = parseInt(row[col.name]);
        }
        
        if (
          type.startsWith('BOOL')
        ) {
        if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => val == true );
          return row[col.name] = row[col.name] == true;
        }

        if (
          type.startsWith('DOUBLE') ||
          type.startsWith('REAL')
        ) {
        if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => parseFloat(val) );
          return row[col.name] = parseFloat(row[col.name]);
        }
      });
      return row;
    };


    // type conversion
    Object.values(tableData).forEach(this.convertRowTypes);

    // append all table-data to the database-object
    Object.assign(this, tableData);

    // attach accessort
    columnData.forEach( (col) => {
      switch (col.class) {
        case 0: // id, timestamp etc.
          if (col.name === 'id') {
            Object.defineProperty(this, 'id', {
              get: () => {
                if (this.currentId === 'new') return '';
                return this.currentId;
              }
            });
          } else {
            Object.defineProperty(this, col.name, {
              get: () => {
                if (this.buffer !== undefined) return this.buffer[col.name];
                return this[this.currentId][col.name];
              }
            });
          }
          break;
        case 1: // Data Column
          Object.defineProperty(this, col.name, {
            get: () => {
              if (this.buffer !== undefined) return this.buffer[col.name] ? this.buffer[col.name] : '';
              return this[this.currentId][col.name] ? this[this.currentId][col.name] : '';
            },
            set: (value) => {
              const type = col.type.toUpperCase();
              if (type.startsWith('INT')) return this.buffer[col.name] = parseInt(value);
              
              if (type.startsWith('BOOL')) return this.buffer[col.name] = (value == true || value == 'true');

              if (type.startsWith('DOUBLE') || type.startsWith('REAL')) return this.buffer[col.name] = parseFloat(value);

              if (type.startsWith('EURO')) return this.buffer[col.name] = Math.round(parseFloat(value) * (10**4));


              return this.buffer[col.name] = value;
            }
          });
          break;
        case 2: // Auto Column
          Object.defineProperty(this, col.name, {
            get: () => {
              return col.run(this);
            }
          });
          break;
        case 3: // Foreign Key
          Object.defineProperty(this, col.name, {
            get: () => {
              if (this.buffer !== undefined) return (this.buffer[col.name]) ? this.buffer[col.name] : '';
              return (this[this.currentId][col.name]) ? this[this.currentId][col.name] : '';
            },
            set: (value) => {
              this.buffer[col.name] = value;
            }
          });
          break;
        case 4: // Foreign Column
          Object.defineProperty(this, col.name, {
            get: () => {
              if (this.buffer !== undefined) return this.buffer[col.name] ? this.buffer[col.name] : '';
              return this[this.currentId][col.name] ? this[this.currentId][col.name] : '';
            }
          });
      }
    });

  }

  // find largest numerical index
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

  // copy a row to buffer in order to edit non-destructively
  edit(id) {
    if (id === 'new') this.buffer = {};
    else this.buffer = Object.assign({}, this[id]);
    this.currentId = id;
  }

  editDone() {
    this.buffer = undefined;
  }

  bufferChanged() {
    return this.buffer = this[this.currentId];
  }

  sum(data) {
    if (data.length === 0) return 0;
    return data.reduce((accumulator, currentValue) => accumulator + currentValue );
  }

  avg(data) {
    if (data.length === 0) return 0;
    return this.sum(data) / data.length;
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
    // generate "new"-row
    this.newRow = document.createElement('tr');
    this.newRow.id = 'new';
    this.newRow.innerHTML = `<td colspan="${this.columns.length + 1}"><div class="columns is-centered"><div class="column is-6"><span class="button is-fullwidth is-primary">New Entry</span></div></div></td>`;
    this.newRow.addEventListener('click', (event) => {
      Trek.editThis(event)
    });
  }

  getTypedFormat(col) {
    switch (col.type) {
      case 'EURO':
        if (!this.model[col.name]) return '';
        return (this.model[col.name] * (10**-4)).toFixed(2);
      default:
        return this.model[col.name];
    }
  }

  // get column by name
  getColumnByName(colName) {
    return this.columns.find( (col) => {
      return col.name === colName;
    });
  }

  // generate row formatted as tr
  getRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    this.model.currentId = id;
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 4:
          break;
        default:
          tr.innerHTML += `<td data-col="${col.name}">${this.getTypedFormat(col)} ${col.symbol}</td>`;
      }
    });
    tr.innerHTML += '<td></td>'; // empty td for control column
    tr.addEventListener('click', (event) => {
      Trek.editThis(event)
    });
    return tr;
  }

  // return only data and foreign key fields for ajax requests
  getFormData() {
    const data = {};
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1:
          if (this.model.buffer[col.name] === 0 || this.model.buffer[col.name]) data[col.name] = this.model.buffer[col.name];
          break;
        case 3:
          if (this.model.buffer[col.name]) data[col.name] = this.model.buffer[col.name];
          break;
      }
    });
    return data;
  }
          


  // generate table head
  getHeadRow() {
    const tr = document.createElement('tr');
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 4:
          break;
        default:
          tr.innerHTML += `<th>${col.title}</th>`;
      }
    });
    tr.innerHTML += '<th></th>'; // empty header for controls-column
    return tr;
  }

  // generate form
  getFormRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    // loop columns
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1: // Data Column
        case 3: // Foreign Key
          // add an input here
          tr.innerHTML += `<td data-col="${col.name}" class="control"><input class="input" type="text" placeholder="${col.title}" value="${this.getTypedFormat(col)}" oninput="Trek.updateForm(this)"> ${col.symbol}</td>`;
          break;
        case 4: // Foreign Column
          break;
        default:
          tr.innerHTML += `<td data-col="${col.name}">${this.model[col.name] ? this.model[col.name] : ''}</td>`;
      }
    });

    const controlTd = document.createElement('td');
    controlTd.classList.add('buttons','has-addons');
    controlTd.innerHTML = `<span class="button is-link" onclick="Trek.saveThis(this)">Save</span><span class="button" onclick="Trek.cancelThis(this)">Cancel</span>`;
    if (id !== 'new') controlTd.innerHTML += `<span class="button is-danger" onclick="Trek.deleteThis(this)">Delete</span>`
    tr.appendChild(controlTd);
    return tr;
  }

  // update table body with changed rows
  update(tableData) {
    Object.keys(tableData).forEach( (id) => {
      const tr = document.getElementById(id);
      if (tableData[id].deleted) {
        if (this.model[id] !== undefined) {
          this.model[id] = undefined;
          this.body.removeChild(tr);
        }
      } else {
        this.model[id] = this.model.convertRowTypes(tableData[id]);
        if (tr === null) {
          let nextSmallerId = id - 1;
          while (this.model[nextSmallerId] === undefined && nextSmallerId > 0) {
            nextSmallerId--;
          }
          if (nextSmallerId === 0) this.body.appendChild(this.getRow(id));
          else this.body.insertBefore(this.getRow(id), document.getElementById(nextSmallerId));
        } else {
          this.body.replaceChild(this.getRow(id), tr);
        }
      }
    });
  }

}


class TrekDatabase {
  
  // request entry table from database
  constructor(settings) {
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

  // trigger event when row is clicked
  editThis(event) {
    if (this.editMode || event.currentTarget.id === 'new') {
      // first close any other active form
      this.cancelThis();
      // save the column we clicked on to focus it later
      const targetColumn = event.target.getAttribute('data-col');
      // copy row values to buffer
      this.table.model.edit(event.currentTarget.id);
      // replace row content with edit-form
      this.formRow = this.table.getFormRow(event.currentTarget.id);
      this.table.body.replaceChild(this.formRow, event.currentTarget);
      // find input in the right column if there is one and focus it
      let input = this.formRow.querySelector('td[data-col="'+targetColumn+'"] input');
      if (input !== null) input.focus();
      // otherwise focus first input in this row
      else {
        input = this.formRow.querySelector('input');
        if (input !== null) input.focus();
      }
    }
  }

  saveThis(target) {
    target.classList.add('is-loading');
    if (this.formRow.id === 'new') {
      this.insertRow(
        this.table.getFormData(), 
        () => { // onSuccess
          target.classList.remove('is-loading');
          this.table.body.replaceChild(this.table.newRow, this.formRow);
          this.formRow = undefined;
        },
        () => { // onError
          target.classList.remove('is-loading');
          this.formRow.classList.add('is-danger');
        }
      );
    } else {
      this.alterRow(
        this.table.getFormData(), 
        this.formRow.id, 
        () => { // onSuccess
          target.classList.remove('is-loading');
          this.formRow = undefined;
        },
        () => { // onError
          target.classList.remove('is-loading');
          this.formRow.classList.add('is-danger');
        }
      );
    }
  }

  cancelThis(target) {
    this.table.model.editDone();
    if (this.formRow !== undefined) {
      console.log('cancelThis, formRow: ',this.formRow, ' newRow: ', this.table.newRow);
      if (this.formRow.id === 'new') this.table.body.replaceChild(this.table.newRow, this.formRow);
      else this.table.body.replaceChild(this.table.getRow(this.formRow.id), this.formRow);
      this.formRow = undefined;
    }
  }

  deleteThis(target) {
    target.classList.add('is-loading');
    const onSuccess = () => {
      target.classList.remove('is-loading');
      this.formRow = undefined;
    };
    const onError = () => {
      target.classList.remove('is-loading');
      this.formRow.classList.add('has-background-danger');
    };
    this.deleteRow(
      this.formRow.id,
      () => { // onSuccess
        target.classList.remove('is-loading');
        this.formRow = undefined;
      },
      () => { // onError
        target.classList.remove('is-loading');
        this.formRow.classList.add('has-background-danger');
      }
    );
  }

  exitEditMode() {
    if (this.formRow !== undefined) this.cancelThis();
    if (this.editMode) {
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

  // recalculate all the Auto Columns while editing the form
  updateForm(target) {
    this.table.model[target.parentNode.getAttribute('data-col')] = target.value;
    this.table.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          this.formRow.querySelector('td[data-col="'+col.name+'"]')
            .textContent = this.table.model[col.name];
      }
    });
    // enable or disable save-button depending on whether data has been altered
    //if (this.table.model.buffer === this[this.currentId] || this.table.model.buffer === {}) this.saveButton.disabled = true;
    //else this.saveButton.disabled = false;
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
          this.error('Database error: '+response.errormsg);
          if (typeof onError === 'function') onError();
        }
      },
      error: (xhr, ajaxOptions, thrownError) => {
        this.error('Ajax error: '+xhr.status+'\n'+thrownError);
        if (typeof onError === 'function') onError();
      }
    });
  }

  // select all visible columns of a table
  selectTable(tabLink) {
    if (typeof tabLink === 'object') {
      this.activeTab.classList.remove('is-active');
      this.activeTab = tabLink.parentNode;
      this.tableName = this.activeTab.getAttribute('data-table');
    }
    this.activeTab.classList.add('is-active');
    this.exitEditMode();
    this.ajaxRequest(
      {operation: 'SELECT', tableName: this.tableName}, // data
      (response) => { // onSuccess
        this.table = new TrekTableView(this.tableColumns[this.tableName], response.data);
        this.table.head.innerHTML = '';
        this.table.head.appendChild(this.table.getHeadRow());
        this.table.body.innerHTML = '';
        this.table.body.appendChild(this.table.newRow);
        for (var index = this.table.model.getMaxIndex(); index > 0; index--) {
          if (this.table.model[index] !== undefined) {
            this.table.body.appendChild(this.table.getRow(index));
          }
        }
        this.lastUpdate = response.time;
        // push url including table
        const url = new URL(document.location.href);
        url.searchParams.set('table', this.tableName);
        window.history.pushState(response.data, '', url.pathname + url.search);
      },
    );
  }

  // pull updates since last refresh
  refreshTable(onSuccess, onError) {
    this.ajaxRequest(
      {operation: 'SELECT', tableName: this.tableName, lastUpdate: this.lastUpdate},
      (response) => {
        this.table.update(response.data);
        this.lastUpdate = response.time;
        onSuccess();
      },
      onError
    );
  }

  // insert a new row
  insertRow(rowData, onSuccess, onError) {
    this.ajaxRequest(
      {operation: 'INSERT', tableName: this.tableName, lastUpdate: this.lastUpdate, data: [rowData]},
      (response) => {
        this.table.model.editDone();
        this.table.update(response.data);
        this.lastUpdate = response.time;
        onSuccess();
      },
      onError
    );
  }

  // alter an existing row
  alterRow(rowData, rowId, onSuccess, onError) {
    const data = {};
    data[rowId] = rowData;
    this.ajaxRequest(
      {operation: 'ALTER', tableName: this.tableName, lastUpdate: this.lastUpdate, data: data},
      (response) => {
        this.table.model.editDone();
        this.table.update(response.data);
        this.lastUpdate = response.time;
        onSuccess();
      },
      onError
    );
  }

  // delete a row
  deleteRow(rowId, onSuccess, onError) {
    this.ajaxRequest(
      {operation: 'DELETE', tableName: this.tableName, lastUpdate: this.lastUpdate, rows: [rowId]},
      (response) => {
        this.table.update(response.data);
        this.lastUpdate = response.time;
        onSuccess();
      },
      onError
    );
  }

  error(message) {
    console.log('Trek Error: ', message);
  }

  warning(message) {
    console.log('Trek Warning: ', message);
  }

}
