"use strict";

class TrekSmartInput {
  
  constructor(column, value, suggestionModel) {
    this.column = column;

    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.type = 'text';
    this.isValid = !this.column.required || value !== '';
    this.input.placeholder = column.title;
    this.input.value = value;
    this.input.addEventListener('input', () => this.update());
    this.hasActiveSuggestion = false;


    // suggestion system
    let makeSuggestion = false;
    let updateSuggestion;

    if (column.class === 3) { // Foreign Key
      makeSuggestion = true;
      updateSuggestion = (target) => {
        const search = target.value;
        suggestionModel.forAllAsc( (row, id) => {
          const idStr = id.toString();
          if (idStr.startsWith(search)) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-suggestion', id);
            this.suggestion.columns.forEach( (col) => {
              switch (col.class) {
                case 0: // Meta Column
                  if (col.name === 'id') tr.innerHTML += `<td><b>${search}</b>${idStr.slice(search.length)}</td>`;
                  break;
                case 1: // Data Column
                  tr.innerHTML += `<td>${row[col.name]}</td>`;
                  break;
              }
            });
            tr.addEventListener('click', event => this.acceptSuggestion(event.currentTarget) );
            tr.addEventListener('mousemove', event => this.selectSuggestion(event.currentTarget) );
            this.suggestion.table.appendChild(tr);
          }
        });
        this.suggestion.current = this.suggestion.table.firstChild;
        if (this.suggestion.current === null) return false;
        this.suggestion.current.classList.add('has-background-primary');
        return true;
      };
    } else if (column.class === 1 && column.type.startsWith('VARCHAR')) { // Data Column of type Text
      makeSuggestion = true;
      updateSuggestion = (target) => {
        const filteredResults = new Set();
        const search = target.value;
        suggestionModel.forAllAsc( (row, id) => {
          if (
            row[column.name] !== '' &&
            row[column.name].indexOf(search) !== -1
          ) filteredResults.add(row[column.name]);
        });
        if (filteredResults.size === 0) filteredResults.add(search);

        filteredResults.forEach( (result) => {
          const tr = document.createElement('tr');
          tr.setAttribute('data-suggestion', id);
          const index = result.indexOf(search);
          tr.innerHTML = `<td>${result.slice(0, index)}<b>${search}</b>${result.slice(index + search.length)}</td>`;
          tr.addEventListener('click', event => this.suggestion.accept(event.currentTarget) );
          tr.addEventListener('mousemove', event => this.suggestion.select(event.currentTarget) );
          this.suggestion.table.appendChild(tr);
        });
        this.suggestion.current = this.suggestion.table.firstChild;
        this.suggestion.current.classList.add('has-background-primary');
        return true;
      };
    }


    // generate suggestion for foreign keys and text inputs
    if (makeSuggestion) {
      this.suggestion = {
        box: document.createElement('div'),
        table: document.createElement('table'),
        update: updateSuggestion,
        accept: (target) => {
          this.input.value = target.getAttribute('data-suggestion');
          this.suggestion.hide();
        },
        select: (target) => {
          this.suggestion.current.classList.remove('has-background-primary');
          this.suggesiton.current = target;
          target.classList.add('has-background-primary');
        },
        show: () => {
          this.suggesiton.box.style.display = '';
          this.hasActiveSuggestion = true;
        },
        hide: () => {
          this.suggestion.box.style.display = 'none';
          this.hasActiveSuggestion = false;
        },
        hasMouse: false
      }
      this.suggestion.box.classList.add('box', 'suggestion', 'is-paddingless');
      this.suggestion.table.classList.add('table','is-hoverable');
      this.suggestion.box.appendChild(this.suggestion.table);
      this.suggestion.box.style.position = 'absolute';
      this.suggestion.table.addEventListener('mouseleave', () => this.suggestion.hasMouse = false );
      this.input.addEventListener('focusin', () => this.suggestion.show() );
      this.input.addEventListener('focusout', () => this.suggestion.hide() );
      this.suggestion.hide();
      this.input.insertAdjacentElement('afterend', this.suggestion.box);
    }


  }

  // type validation
  validate(value) {
    if (this.column.type.startsWith('INT')) {
      const match = this.input.value.match(/[0-9]*/);
      if (match === null || match[0] !== this.input.value) { // incorrect input
        this.input.classList.add('is-danger');
        this.input.value = match[0];
      } else this.input.classList.remove('is-danger'); // correct input
    } else if (
      this.column.type.startsWith('DOUBLE') ||
      this.column.type.startsWith('REAL') ||
      this.column.type.startsWith('EURO')
    ) {
      const match = this.input.value.match(/[0-9]*\.?[0-9]*/);
      if (match === null || match[0] !== this.input.value) { // incorrect input
        this.input.classList.add('is-danger');
        this.input.value = match[0];
      } else this.input.classList.remove('is-danger'); // correct input
    }
  }

  // callback functions
  onUpdate() {}

  update() {
    // validate input
    this.validate();

    // update suggestion and update validity
    this.isValid = this.suggestion.update() && (!this.column.required || this.input.value !== '');

    // update model
    this.model[this.column.name] = this.input.value;

    // callback
    this.onUpdate();
  }
}
  


class TrekTableModel {

  constructor(name, sheets, data) {
    this.name = name;
    this.columns = sheets[name].columns;
    this[''] = ''; // return empty string if requesting row from other table where id is not specified yet

    Object.values(data).forEach(this.parseRow);

    Object.assign(this, data);

    // attach accessors
    columns.forEach( (col) => {
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
              if (col.type.startsWith('INT')) return this.buffer[col.name] = parseInt(value);
              
              if (col.type.startsWith('BOOL')) return this.buffer[col.name] = (value == true || value == 'true');

              if (col.type.startsWith('DOUBLE') || col.type.startsWith('REAL')) return this.buffer[col.name] = parseFloat(value);

              if (col.type.startsWith('EURO')) return this.buffer[col.name] = Math.round(parseFloat(value) * (10**4));

              this.buffer[col.name] = value;
              this.onBufferChanged(this.buffer);
            }
          });
          break;
        case 2: // Auto Column
          Object.defineProperty(this, col.name, {
            get: () => {
              return col.run(this);
            }
          });
          col.tables.forEach( (tableName) => {
            Object.defineProperty(this, tableName, {
              get: () => {
                return sheets[tableName].model.filter( row => row[tableName + '_id'] === this.currentId );
              }
            });
          });
          break;
        case 3: // Foreign Key
          Object.defineProperty(this, col.name, {
            get: () => {
              if (this.buffer !== undefined) return (this.buffer[col.name]) ? this.buffer[col.name] : '';
              return (this[this.currentId][col.name]) ? this[this.currentId][col.name] : '';
            },
            set: (value) => {
              // foreign keys are always ints
              this.buffer[col.name] = parseInt(value);
              this.onBufferChanged(this.buffer);
            }
          });
          Object.defineProperty(this, col.table, {
            get: () => {
              return this.tables[col.table].at(
                (this.buffer !== undefined) 
                ? this.buffer[col.name] 
                : this[this.currentId][col.name]
              );
            }
          });
          break;
      }
    });

  }

  at(id) {
    if (id) this.currentId = id;
    this.filterFn = row => true;
    return this;
  }

  filter(filterFn) {
    this.filterFn = filterFn;
    return this;
  }

  // callback functions
  onBufferChanged(buffer) {}
  onRowDeleted(id) {}
  onRowChanged(id) {}

  reset() {
    this.filterFn = row => true;
    this.onBufferChanged = buffer => {};
    this.onRowDeleted = id => {};
    this.onRowChanged = id => {};
  }

  update(data) {
    Object.keys(data).forEach( (id) => {
      if (data[id].deleted) {
        if (this[id] !== undefined) {
          this[id] = undefined;
        }
        this.onRowDeleted(id);
      } else {
        this[id] = this.parseRow(data[id]);
        this.at(id);
        this.onRowChanged(id);
      }
    });
  }
    

  parseRow(row) {
    this.columns.forEach( (col) => {
      if (
        col.type.startsWith('INT') ||
        col.type.startsWith('EURO')
      ) {
        if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => parseInt(val) );
        return row[col.name] = parseInt(row[col.name]);
      }
      
      if (
        col.type.startsWith('BOOL')
      ) {
      if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => val == true );
        return row[col.name] = row[col.name] == true;
      }

      if (
        col.type.startsWith('DOUBLE') ||
        col.type.startsWith('REAL')
      ) {
      if (Array.isArray(row[col.name])) return row[col.name] = row[col.name].map( val => parseFloat(val) );
        return row[col.name] = parseFloat(row[col.name]);
      }
    });
    return row;
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

  // Loop over all Rows where Order does not matter
  // might be faster then iterating in ascending or descending order especially for large datasets
  forAll(doThis) {
    Object.keys(this).forEach( (key) => {
      const index = parseInt(key);
      if (!isNaN(index) && this.filterFn(this[key]) {
        this.currentId = key;
        doThis(this, index);
      }
    });
  }

  // Loop over all rows in ascending order
  forAllAsc(doThis) {
    for (var index = 1; index <= this.getMaxIndex(); index++) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        this.currentId = key;
        doThis(this, index);
      }
    }
  }

  // Loop over all rows in descending order
  forAllDesc(doThis) {
    for (var index = this.getMaxIndex(); index > 0; index--) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        this.currentId = key;
        doThis(this, index);
      }
    }
  }

  // Loop over rows up to currentId
  forEach(doThis, maxIndex = this.currentId) {
    for (var index = 1; index < maxIndex; index++) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        this.currentId = key;
        doThis(this, index);
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

  sum(data) {
    if (data.length === 0) return 0;
    return data.reduce((accumulator, currentValue) => accumulator + currentValue );
  }

  avg(data) {
    if (data.length === 0) return 0;
    return this.sum(data) / data.length;
  }

  // return only data and foreign key fields for ajax requests
  getFormData() {
    const data = {};
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 1:
          if (this.buffer[col.name] === 0 || this.buffer[col.name]) data[col.name] = this.buffer[col.name];
          break;
        case 3:
          if (this.buffer[col.name]) data[col.name] = this.buffer[col.name];
          break;
      }
    });
    return data;
  }
  

}


class TrekTableView {

  constructor(model, api) {
    this.api = api;
    // create table and append to content-container
    const container = document.getElementById('trek-container');
    container.innerHTML = '';
    this.table = document.createElement('table');
    container.appendChild(this.table);
    this.head = document.createElement('thead');
    this.table.appendChild(this.head);
    this.body = document.createElement('tbody');
    this.table.appendChild(this.body);

    this.editMode = false;
    this.editButton = document.getElementById('trek-edit-button');
    this.editButton.disabled = false;
    this.editButton.addEventListener('click', () => {
      // toggle edit mode
      if (this.editMode) {
        this.exitEditMode();  
      } else {
        this.enterEditMode();
      }
    });

    // generate and save newRow 
    this.newRow = document.createElement('tr');
    this.newRow.id = 'new';
    this.newRow.innerHTML = `<td colspan="${this.columns.length + 1}"><div class="columns is-centered"><div class="column is-6"><span class="button is-fullwidth is-primary">New Entry</span></div></div></td>`;
    this.newRow.addEventListener('click', (event) => this.edit(event) );

    this.model = model;

    this.editMode = false;
    // generate initial table content
    this.head.innerHTML = '';
    this.head.appendChild(this.getHeadRow());
    this.body.innerHTML = '';
    this.body.appendChild(this.newRow);
    this.model.at(0).forAllDesc( (row, id) => {
      this.body.appendChild(this.getRow(id));
    });
      
    // push url including table
    const url = new URL(document.location.href);
    url.searchParams.set('table', this.model.name);
    window.history.pushState(response.data, '', url.pathname + url.search);

    // set callback actions
    // update autocolumns in formrow
    model.onBufferChanged = (buffer) => {
      this.forEachColumn( (col) => {
        switch (col.class) {
          case 2: // Auto Column
            const val = buffer[col.name];
            const td = this.formRow.querySelector('td[data-col="'+col.name+'"]');
            if (val !== td.textContent) td.textContent = val;
        }
      });
    };

    // remove deleted row
    model.onRowDeleted = (id) => {
      this.body.removeChild(document.getElementById(id));
    };

    // update row or append in right place if new
    model.onRowChanged = (id) => {
      const tr = document.getElementById(id);
      if (tr === null) {
        let nextSmallerId = id;
        let nextRow;
        do {
          nextSmallerId--;
          if (nextSmallerId === 0) {
            this.body.appendChild(this.getRow(id));
            return;
          }
          nextRow = document.getElementById(nextSmallerId);
        } while (nextRow === null)
        this.body.insertBefore(this.getRow(id), nextRow);
        return;
      }
      this.body.replaceChild(this.getRow(id), tr);
      return;
    };

  }

    
  // if column type is a currency convert to float for correct display
  getDisplayFormat(col) {
    switch (col.type) {
      case 'EURO':
        if (this.model[col.name] === 0 || this.model[col.name]) return (this.model[col.name] * (10**-4)).toFixed(2);
        return '0.00';
      default:
        if (this.model[col.name] === 0 || this.model[col.name]) return this.model[col.name];
        return '';
    }
  }

  // shortcuts to access columns
  forEachColumn(doThis) {
    this.model.columns.forEach(doThis);
  }
  getColumnByName(name) {
    return this.model.columns.find( col => col.name === name );
  }

  // generate row formatted as tr
  getRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    this.model.at(id);
    this.forEachColumn( (col) => {
      const val = this.getDisplayFormat(col);
      tr.innerHTML += `<td data-col="${col.name}">${val} ${val ? col.symbol : ''}</td>`;
    });
    tr.innerHTML += '<td></td>'; // empty td for control column
    tr.addEventListener('click', event => this.edit(event) );
    return tr;
  }

  // generate table head
  getHeadRow() {
    const tr = document.createElement('tr');
    this.forEachColumn( col => tr.innerHTML += `<th>${col.title}</th>` );
    tr.innerHTML += '<th></th>'; // empty header for controls-column
    return tr;
  }

  // generate form
  getFormRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    tr.inputs = [];

    tr.validate = () => {
      tr.isValid = true;
      tr.inputs.forEach( (input) => {
        if (!input.isValid) tr.isValid = false;
      });
      if (tr.isValid) {
        tr.saveButton.disabled = false;
      } else {
        tr.saveButton.disabled = true;
      }
    };

    // loop columns
    this.forEachColumn( (col) => {
      const td = document.createElement('td');
      tr.appendChild(td);
      td.classList.add('control');
      td.setAttribute('data-col', col.name);
      switch (col.class) {
        case 1: // Data Column
          const input = new TrekSmartInput(col, this.getDisplayFormat(col), this.model.at(id));
          td.appendChild(input.input);
          input.onUpdate = tr.validate;
          tr.inputs.push(input);
          break;
        case 3: // Foreign Key
          const input = new TrekSmartInput(col, this.getDisplayFormat(col), this.model[col.table]);
          td.appendChild(input.input);
          input.onUpdate = tr.validate;
          tr.inputs.push(input);
          break;

        default:
          td.innerHTML += this.getDisplayFormat(col);
      }
      if (col.symbol) td.innerHTML += ` ${col.symbol}`;
    });

    const controlTd = document.createElement('td');
    tr.appendChild(controlTd);
    controlTd.classList.add('buttons','has-addons');
    tr.saveButton = document.createElement('span'); // save this in formRow for later
    controlTd.appendChild(tr.saveButton);
    tr.saveButton.classList.add('button', 'is-link');
    tr.saveButton.addEventListener('click', () => this.save() );
    tr.saveButton.disabled = true;
    tr.saveButton.textContent = 'Save';
    tr.cancelButton = document.createElement('span');
    controlTd.appendChild(tr.cancelButton);
    tr.cancelButton.classList.add('button');
    tr.cancelButton.addEventListener('click', () => this.cancel() );
    tr.cancelButton.textContent = 'Cancel';
    if (id !== 'new') {
      tr.deleteButton = document.createElement('span');
      controlTd.appendChild(deleteButton);
      tr.deleteButton.classList.add('button', 'is-danger');
      tr.deleteButton.addEventListener('click', () => this.delete() );
      tr.deleteButton.textContent = 'Delete';
    }


    return tr;
  }

  edit(event) {
    if (this.editMode || event.currentTarget.id === 'new') {
      // first close any other active form
      this.cancelThis();
      // save the column we clicked on to focus it later
      const targetColumn = event.target.getAttribute('data-col');
      // copy row values to buffer
      this.model.edit(event.currentTarget.id);
      // replace row content with edit-form
      this.formRow = this.getFormRow(event.currentTarget.id);
      this.body.replaceChild(this.formRow, event.currentTarget);
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

  save() {
    this.formRow.saveButton.classList.add('is-loading');
    const onSuccess = (data) => { // onSuccess
      this.formRow.saveButton.classList.remove('is-loading');
      this.model.update(data);
      this.formRow = undefined;
    };
    const onError = () => { // onError
      this.formRow.saveButton.classList.remove('is-loading');
      this.formRow.classList.add('is-danger');
    }
    if (this.formRow.id === 'new') {
      this.api.insertRow(
        this.model.getFormData(),
        onSuccess,
        onError
      );
    } else { // edit existing row
      this.alterRow(
        this.model.getFormData(),
        this.formRow.id,
        onSuccess,
        onError
      );
    }
  }

  cancel() {
    this.model.editDone();
    if (this.formRow !== undefined) {
      if (this.formRow.id === 'new') this.body.replaceChild(this.newRow, this.formRow);
      else this.body.replaceChild(this.getRow(this.formRow.id), this.formRow);
      this.formRow = undefined;
    }
  }

  delete() {
    this.formRow.deleteButton.classList.add('is-loading');
    const onSuccess = (data) => {
      this.formRow.deleteButton.classList.remove('is-loading');
      this.model.update(data);
      this.formRow = undefined;
    };
    const onError = () => {
      this.formRow.deleteButton.classList.remove('is-loading');
      this.formRow.classList.add('has-background-danger');
    };
    this.api.deleteRow(
      this.formRow.id,
      onSuccess,
      onError
    );
  }

  exitEditMode() {
    if (this.formRow !== undefined) this.cancel();
    if (this.editMode) {
      this.table.classList.remove('is-hoverable');
      this.editMode = false;
      this.editButton.textContent = 'Edit';
    }
  }

  enterEditMode() {
    if (!this.editMode) {
      this.table.classList.add('is-hoverable');
      this.editMode = true;
      this.editButton.textContent = 'Done';
    }
  }

}

class TrekApi {
  constructor(ajaxUrl) {
    this.ajaxUrl = ajaxUrl;
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

  select(activeSheet, sheets, onSuccess, onError) {
    const tables = [{name: activeSheet.name, lastUpdate = activeSheet.lastUpdate}];
    activeSheet.referencedTables.forEach( tableName => {
      tables.push({name: tableName, lastUpdate = sheets[tableName].lastUpdate});
    });
    this.ajaxRequest({operation: 'SELECT', tables: tables},
      (response) => {

  }


}


class TrekDatabase {

  constructor(settings) {
    // copy passed-in settings
    Object.assign(this, settings);
    // find active tab to reduce DOM calls for tab switching
    this.activeTab = document.querySelector('#trek-db-nav li.is-active');

  }

  selectTab(tabLink) {
    if (typeof tabLink === 'object') {
      this.activeTab.classList.remove('is-active');
      this.activeTab = tabLink.parentNode;
      if (this.view !== undefined) this.view.clear();
    }
    const activeSheet = this.sheets[this.activeTab.getAttribute('data-sheet')];
    const tables = [activeSheet.name, ...activeSheet.referencedTables];
    this.api.select(
      activeSheet.name,
      (data) => {
        data.forEach( [tableName, tableData] => {
          if (this.sheets[tableName].model) this.sheets[table].model.update(data[table]);
          else this.sheets[tableName].model = new TrekTableModel(
            tableName, 
            this.sheets,
            tableData
          );
        });
        this.view = new activeSheet.viewClass(activeSheet.model, this.api);
      }
    );
  }



          
      this.view = new sheet.viewClass(sheet.tables[sheet.name].model, this.api);

    }
    this.activeTab.classList.add('is-active');




