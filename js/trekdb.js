"use strict";

class TrekSmartInput {
  
  constructor(column, value, target, onUpdate, suggestionModel, onShowSuggestion, onHideSuggestion) {
    this.column = column;
    this.onUpdate = onUpdate;
    console.log('creating input ',column,', onUpdate:',onUpdate);

    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.type = 'text';
    this.isValid = !this.column.required || value !== '';
    this.input.placeholder = column.title;
    this.input.value = value;
    this.input.addEventListener('input', () => this.update());
    target.appendChild(this.input);

    // suggestion system
    let makeSuggestion = false;
    let updateSuggestion;

    if (column.class === 3) { // Foreign Key
      makeSuggestion = true;
      updateSuggestion = () => {
        const search = this.input.value;
        this.suggestion.table.innerHTML = '';
        suggestionModel.forAllAsc( (row, id) => {
          const idStr = id.toString();
          if (idStr.startsWith(search)) {
            const tr = document.createElement('tr');
            tr.setAttribute('data-suggestion', id);
            suggestionModel.columns.forEach( (col) => {
              switch (col.class) {
                case 0: // Meta Column
                  if (col.name === 'id') tr.innerHTML += `<td><b>${search}</b>${idStr.slice(search.length)}</td>`;
                  break;
                case 1: // Data Column
                  tr.innerHTML += `<td>${row[col.name]}</td>`;
                  break;
              }
            });
            tr.addEventListener('click', () => this.suggestion.accept(id) );
            tr.addEventListener('mousemove', event => this.suggestion.select(event.currentTarget) );
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
      updateSuggestion = () => {
        const filteredResults = new Set();
        const search = this.input.value;
        suggestionModel.forAllAsc( (row, id) => {
          if (
            row[column.name] !== '' &&
            row[column.name].indexOf(search) !== -1
          ) filteredResults.add(row[column.name]);
        });
        if (filteredResults.size === 0) filteredResults.add(search);

        this.suggestion.table.innerHTML = '';
        filteredResults.forEach( (result) => {
          const tr = document.createElement('tr');
          tr.setAttribute('data-suggestion', result);
          const index = result.indexOf(search);
          tr.innerHTML = `<td>${result.slice(0, index)}<b>${search}</b>${result.slice(index + search.length)}</td>`;
          tr.addEventListener('click', () => this.suggestion.accept(event.currentTarget) );
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
          const value = target.getAttribute('data-suggestion');
          this.suggestion.hasMouse = false;
          this.input.value = value;
          this.suggestion.hide();
          this.isValid = true;
          this.onUpdate(value);
        },
        select: (target) => {
          this.suggestion.hasMouse = true;
          this.suggestion.current.classList.remove('has-background-primary');
          this.suggestion.current = target;
          target.classList.add('has-background-primary');
        },
        show: () => {
          this.suggestion.box.style.display = '';
          onShowSuggestion(this.suggestion);
        },
        hide: () => {
          if (!this.suggestion.hasMouse) {
            this.suggestion.box.style.display = 'none';
            onHideSuggestion();
          }
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
      this.suggestion.update();
      this.suggestion.hide();
      this.input.insertAdjacentElement('afterend', this.suggestion.box);
    }


  }

  // type validation
  validate() {
    console.log('validate',this.column.type,this.input.value);
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

  update() {
    // validate input
    this.validate();

    // update suggestion and update validity
    this.isValid = (
      this.suggestion === undefined || this.suggestion.update()
    ) && (
      !this.column.required || this.input.value !== ''
    );

    // callback
    console.log('call onUpdate(',this.input.value,')');
    this.onUpdate(this.input.value);
  }
}
  


class TrekTableModel {

  constructor(name, sheets, api) {
    this.name = name;
    this.api = api;
    this.columns = sheets[name].columns;
    this[''] = ''; // return empty string if requesting row from other table where id is not specified yet


    // access to other tables
    Object.entries(sheets).forEach( ([sheetName, sheet]) => {
      const keyColumn = this.name + '_id';
      if (sheetName !== this.name && sheet.columns.find( col => col.name === keyColumn ) !== undefined) {
        Object.defineProperty(this, sheetName, {
          get: () => {
            console.log('get sheet',sheetName, 'currentId',this.currentId);
            return sheets[sheetName].model.filter( row => row[keyColumn] == this.currentId );
          }
        });
      }
    });

    
    // attach accessors
    // generate defaultRow
    this.defaultRow = {};
    this.columns.forEach( (col) => {
      this.defaultRow[col.name] = col.default === undefined ? '' : col.default;

      switch (col.class) {
        case 0: // Meta Column
        case 2: // Auto Column
          Object.defineProperty(this, col.name, {
            get: () => {
              //console.log('get ',this.currentId,col.name);
              return this[this.currentId][col.name];
            }
          });
          break;
        case 1: // Data Column
          Object.defineProperty(this, col.name, {
            get: () => {
              //console.log('get ',this.currentId,col.name);
              return this[this.currentId][col.name];
            },
            set: (value) => {
              console.log('set', col.name, value);
              if (col.type.startsWith('INT')) return this.buffer[col.name] = parseInt(value);
              
              if (col.type.startsWith('BOOL')) return this.buffer[col.name] = (value == true || value == 'true');

              if (col.type.startsWith('DOUBLE') || col.type.startsWith('REAL')) return this.buffer[col.name] = parseFloat(value);

              if (col.type.startsWith('EURO')) return this.buffer[col.name] = Math.round(parseFloat(value) * (10**4));

              this.buffer[col.name] = value;
              this.run(this.buffer, 'buffer');
              this.onBufferChanged(this.buffer);
            }
          });
          break;
        case 3: // Foreign Key
          Object.defineProperty(this, col.name, {
            get: () => {
              //console.log('get ',this.currentId,col.name);
              return this[this.currentId][col.name];
            },
            set: (value) => {
              console.log('set', col.name, value);
              // foreign keys are always ints
              this.buffer[col.name] = parseInt(value);
              this.run(this.buffer, 'buffer');
              this.onBufferChanged(this.buffer);
            }
          });
          Object.defineProperty(this, col.table, {
            get: () => {
              return sheets[col.table].model.at(this[this.currentId][col.name]);
            }
          });
          break;
      }
    });

  }

  at(id) {
    this.sync();
    if (id) this.currentId = id;
    else this.currentId = 'defaultRow';
    this.filterFn = row => true;
    return this;
  }

  filterFn() { return true; }
  filter(filterFn) {
    this.sync();
    this.filterFn = filterFn;
    return this;
  }

  // callback functions
  onBufferChanged(buffer) {}
  onRowDeleted(id) {}
  onRowChanged(id) {}

  clear() {
    this.filterFn = row => true;
    this.onBufferChanged = buffer => {};
    this.onRowDeleted = id => {};
    this.onRowChanged = id => {};
    if (this.syncTimeout !== undefined) {
      clearTimeout(this.syncTimeout);
      this.syncTimerout = undefined;
    }
  }

  run(row, id) {
    if (typeof row !== 'object') row = this[row];
    this.currentId = (id === undefined) ? row.id : id;
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          row[col.name] = col.run(this);
          break;
      }
    });
    return row;
  }

  update(data) {
    const arrData = Object.values(data);
    arrData.forEach( (row) => {
      if (row.deleted) this[row.id] = undefined;
      else this[row.id] = this.parseRow(row);
    });
    arrData.forEach( (row) => {
      if (row.deleted) {
        this.onRowDeleted(row.id);
      } else {
        this.run(row);
        this.onRowChanged(row.id);
      }
    });
  }

  repaint(data = {}) {
    Object.values(data).forEach( (row) => {
      if (row.deleted) this[row.id] = undefined;
      else this[row.id] = this.parseRow(row);
    });
    this.filterFn = () => true;
    this.forAllDesc( (row, id) => {
      this.run(row, id);
      this.onRowChanged(id);
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
      if (!isNaN(index) && this.filterFn(this[index]) && max < index) max = index;
    });
    return max;
  }

  // Loop over all Rows where Order does not matter
  // might be faster then iterating in ascending or descending order especially for large datasets
  forAll(doThis) {
    Object.keys(this).forEach( (key) => {
      const index = parseInt(key);
      if (!isNaN(index) && this.filterFn(this[index])) {
        doThis(this[index], index);
      }
    });
  }

  // Loop over all rows in ascending order
  forAllAsc(doThis, minIndex = 1, maxIndex = this.getMaxIndex()) {
    for (var index = minIndex; index <= maxIndex; index++) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        doThis(this[index], index);
      }
    }
  }

  // Loop over all rows in descending order
  forAllDesc(doThis, minIndex = 1, maxIndex = this.getMaxIndex()) {
    for (var index = maxIndex; index >= minIndex; index--) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        doThis(this[index], index);
      }
    }
  }

  // Loop over rows up to currentId
  forEach(doThis, maxIndex = this.currentId) {
    for (var index = 1; index < maxIndex; index++) {
      if (this[index] !== undefined && this.filterFn(this[index])) {
        this.currentId = index;
        doThis(this, index);
      }
    }
  }

  // copy a row to buffer in order to edit non-destructively
  edit(id) {
    if (id === 'new') {
      this.buffer = Object.assign({}, this.defaultRow);
      this.run(this.buffer, 'buffer');
    }
    else this.buffer = Object.assign({}, this[id]);
    this.currentId = 'buffer';
  }

  editDone() {
    this.buffer = undefined;
  }

  sum(column) {
    let sum = 0;
    this.forAll( row => sum += row[column] );
    return sum;
  }

  avg(column) {
    let length = 0;
    let sum = 0;
    this.forAll( (row) => {
      sum += row[column];
      length++;
    });
    return sum / length;
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

  // api requests
  sync(repaint = false, onSuccess, onError) {
    const currentClientTime = Date.now();
    const onSuccessFn = (response) => {
      this.lastUpdate = {
        server: response.time,
        client: currentClientTime
      };
      if (repaint) this.repaint(response.data);
      else this.update(response.data);
      // if syncTimeout is set reset timeout to 5 min
      if (this.syncTimeout !== undefined) {
        if (this.syncTimeout !== true) clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => this.sync(), 300000);
      }
      if (typeof onSuccess === 'function') onSuccess();
    }
    if (this.lastUpdate === undefined) {
      this.api.xhrRequest(
        {operation: 'SELECT', tableName: this.name},
        onSuccessFn,
        onError
      );
    } else {
      // skip if less than 20 sec since last update
      if(currentClientTime - this.lastUpdate.client < 20000) {
        if (repaint) this.repaint();
        return;
      }
      this.api.xhrRequest(
        {operation: 'SELECT', tableName: this.name, lastUpdate: this.lastUpdate.server},
        onSuccessFn,
        onError
      );
    }
  }
  insert(onSuccess, onError) {
    this.api.xhrRequest(
      {
        operation: 'INSERT', 
        tableName: this.name, 
        lastUpdate: this.lastUpdate.server, 
        data: this.getFormData()
      },
      (response) => { // onSuccess
        this.lastUpdate = {
          server: response.time,
          client: Date.now()
        };
        this.editDone();
        this.update(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
  alter(id, onSuccess, onError) {
    this.api.xhrRequest(
      {
        operation: 'ALTER',
        tableName: this.name,
        lastUpdate: this.lastUpdate.server,
        row: id,
        data: this.getFormData()
      },
      (response) => { // onSuccess
        this.lastUpdate = {
          server: response.time,
          client: Date.now()
        };
        this.editDone();
        this.update(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
  delete(id, onSuccess, onError) {
    this.api.xhrRequest(
      {
        operation: 'DELETE',
        tableName: this.name,
        lastUpdate: this.lastUpdate.server,
        row: id
      },
      (response) => { // onSuccess
        this.lastUpdate = {
          server: response.time,
          client: Date.now()
        };
        this.editDone();
        this.update(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
  

}


class TrekTableView {

  constructor(model) {
    // create table and append to content-container
    const container = document.getElementById('trek-container');
    container.innerHTML = '';
    this.table = document.createElement('table');
    this.table.classList.add('table');
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

    this.model = model;

    // generate and save newRow 
    this.newRow = document.createElement('tr');
    this.newRow.id = 'new';
    this.newRow.innerHTML = `<td colspan="${this.model.columns.length + 1}"><div class="columns is-centered"><div class="column is-6"><span class="button is-fullwidth is-primary">New Entry</span></div></div></td>`;
    this.newRow.addEventListener('click', (event) => this.edit(event) );


    this.editMode = false;
    // generate initial table content
    this.head.innerHTML = '';
    this.head.appendChild(this.getHeadRow());
    this.body.innerHTML = '';
    this.body.appendChild(this.newRow);
      
    // push url including table
    const url = new URL(document.location.href);
    url.searchParams.set('table', this.model.name);
    window.history.pushState({
      viewClass: this.constructor.name,
      modelName: this.model.name,
      lastUpdate: this.model.lastUpdate 
    }, '', url.pathname + url.search);

    // set callback actions
    // update autocolumns in formrow
    this.model.onBufferChanged = (buffer) => {
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
    this.model.onRowDeleted = (id) => {
      this.body.removeChild(document.getElementById(id));
    };

    // update row or append in right place if new
    this.model.onRowChanged = (id) => {
      const tr = document.getElementById(id);
      if (tr === null) {
        let nextSmallerId = parseInt(id);
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

    // automatically refresh this model every 5 min
    this.model.syncTimeout = true;

    // asynchronously pull content per ajax request, append table-rows per callback
    setTimeout(() => this.model.sync(true));

    // add Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (this.formRow === undefined) { // no active form
        switch (event.key) {
          case 'Enter':
            this.model.edit('new');
            this.formRow = this.getFormRow('new');
            this.body.replaceChild(this.formRow, this.newRow);
            const input = this.formRow.querySelector('input');
            if (input !== null) input.focus();
            return;
        }
        if (this.editMode) { // edit mode, no active form
          switch (event.key) {
            case 'Escape':
              this.exitEditMode();
              return;
          }
        } else { // no edit mode, no active form
          switch (event.key) {
            case 'e':
              this.enterEditMode();
              return;
          }
        }
      } else { // active form
        if (this.formRow.activeSuggestion === undefined) { // no active suggestion
          switch (event.key) {
            case 'Enter':
              this.save();
              return;
            case 'Escape':
              this.cancel();
              return;
            case 'ArrowDown':
              const activeElement = document.activeElement;
              if (activeElement.nodeName === 'INPUT') {
                const input = this.formRow.inputs.find( input => input.input === activeElement );
                if (input.suggestion !== undefined) input.suggestion.show();
              }
              return;
          }
        } else { // active suggestion
          const s = this.formRow.activeSuggestion;
          switch (event.key) {
            case 'Escape':
              s.hide();
              return;
            case 'ArrowDown':
              s.select(s.current.nextSibling);
              return;
            case 'ArrowUp':
              s.select(s.current.previousSibling);
              return;
            case 'Enter':
              s.accept(s.current);
              return;
          }
        }
      }
    });

  }

    
  // if column type is a currency convert to float for correct display
  getDisplayFormat(col) {
    const val = this.model[col.name]
    switch (col.type) {
      case 'EURO':
        if (val === 0 || val) return (val * (10**-4)).toFixed(2);
        else return '0.00';
      default:
        if (val === 0 || val) return val;
        else return '';
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
    console.log('getRow(',id,')');
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
      console.log('validate');
      tr.isValid = true;
      tr.inputs.forEach( (input) => {
        if (!input.isValid) tr.isValid = false;
      });
      if (tr.isValid) {
        tr.saveButton.removeAttribute('disabled');
      } else {
        tr.saveButton.setAttribute('disabled', true);
      }
    };


    // loop columns
    this.forEachColumn( (col) => {
      const td = document.createElement('td');
      tr.appendChild(td);
      td.classList.add('control');
      td.setAttribute('data-col', col.name);
      let input;
      switch (col.class) {
        case 1: // Data Column
          input = new TrekSmartInput(
            col,  // column
            this.getDisplayFormat(col), // value
            td, // target
            (value) => { // onUpdate
              console.log('updating', col.name, 'with', value);
              this.model[col.name] = value;
              tr.validate()
            }, 
            this.model, // suggestionModel
            (suggestion) => { // onShowSuggestion
              tr.activeSuggestion = suggestion; 
            },
            () => { // onHideSuggestion
              tr.activeSuggestion = undefined;
            }
          );
          tr.inputs.push(input);
          break;
        case 3: // Foreign Key
          input = new TrekSmartInput(
            col, // column
            this.getDisplayFormat(col), // value
            td, // target 
            (value) => { // onUpdate
              this.model[col.name] = value;
              tr.validate();
            },
            this.model[col.table].at(0), // suggestionModel
            (suggestion) => { // onShowSuggestion
              tr.activeSuggestion = suggestion;
            },
            () => { // onHideSuggestion
              tr.activeSuggestion = undefined;
            }
          );
          tr.inputs.push(input);
          break;

        default:
          td.innerHTML += this.getDisplayFormat(col);
      }
      if (col.symbol) {
        const symbolspan = document.createElement('span');
        symbolspan.innerHTML = col.symbol;
        td.appendChild(symbolspan);
      }
    });

    const controlTd = document.createElement('td');
    tr.appendChild(controlTd);
    controlTd.classList.add('buttons','has-addons');
    tr.saveButton = document.createElement('span'); // save this in formRow for later
    controlTd.appendChild(tr.saveButton);
    tr.saveButton.classList.add('button', 'is-link');
    tr.saveButton.addEventListener('click', () => this.save() );
    tr.saveButton.setAttribute('disabled', true);
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
      this.cancel();
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
    const onError = () => { // onError
      this.formRow.saveButton.classList.remove('is-loading');
      this.formRow.classList.add('is-danger');
    }
    if (this.formRow.id === 'new') {
      this.model.insert( 
        () => { // onSuccess
          this.model.editDone();
          this.body.replaceChild(this.newRow, this.formRow);
          this.formRow = undefined;
        }, 
        onError
      );
    } else { // edit existing row
      this.model.alter(
        this.formRow.id, 
        () => { // onSuccess
          this.formRow = undefined; 
          this.model.editDone();
        },
        onError
      );
    }
  }

  cancel() {
    this.model.editDone();
    if (this.formRow !== undefined) {
      if (this.formRow.id === 'new') this.body.replaceChild(this.newRow, this.formRow);
      else this.body.replaceChild(this.getRow(this.formRow.id), this.formRow);
      this.model.editDone();
      this.formRow = undefined;
    }
  }

  delete() {
    this.formRow.deleteButton.classList.add('is-loading');
    const onError = () => {
      this.formRow.deleteButton.classList.remove('is-loading');
      this.formRow.classList.add('has-background-danger');
    };
    this.model.delete(
      this.formRow.id,
      () => { // onSuccess
        this.formRow = undefined;
        this.model.editDone();
      },
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

  clear() {
    this.model.clear();
  }

}

class TrekApi {
  constructor(ajaxUrl) {
    this.ajaxUrl = ajaxUrl;
  }

  // general ajax settings and error handling
  xhrRequest(data, onSuccess, onError) {
    console.log('ajax request, url: ', this.ajaxUrl, ' data: ', data);
    $.ajax({
      url: this.ajaxUrl,
      method: 'POST',
      data: data,
      dataType: 'json',
      async: false,
      success: (response) => {
        console.log('response: ', response);
        if (response.success) onSuccess(response);
        else {
          console.log('Database error: '+response.errormsg);
          if (typeof onError === 'function') onError();
        }
      },
      error: (xhr, ajaxOptions, thrownError) => {
        console.log('Ajax error: '+xhr.status+'\n'+thrownError);
        if (typeof onError === 'function') onError();
      }
    });
  }

}


class TrekDatabase {

  constructor(settings) {
    // find active tab to reduce DOM calls for tab switching
    this.activeTab = document.querySelector('#trek-db-nav li.is-active');
    // initialize api
    this.api = new TrekApi(settings.ajaxUrl);
    // iterate sheets and initialize models
    this.sheets = settings.sheets
    Object.entries(this.sheets).forEach( ([name, sheet]) => {
      if (sheet.modelClass !== undefined) sheet.model = new sheet.modelClass(name, this.sheets, this.api);
      else sheet.model = new TrekTableModel(name, this.sheets, this.api);
    });
    // select default sheet, generate HTML table
    this.selectTab();

  }

  selectTab(tabLink) {
    if (typeof tabLink === 'object') {
      this.activeTab.classList.remove('is-active');
      this.activeTab = tabLink.parentNode;
      this.activeTab.classList.add('is-active');
      if (this.view !== undefined) this.view.clear();
    }
    const activeSheet = this.sheets[this.activeTab.getAttribute('data-sheet')];
    if (activeSheet.viewClass !== undefined) this.view = new activeSheet.viewClass(activeSheet.model);
    else this.view = new TrekTableView(activeSheet.model);
  }

}
