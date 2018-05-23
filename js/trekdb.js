"use strict";




class TrekTableModel {

  constructor(name, sheets, api) {
    this.name = name;
    this.api = api;
    this.columns = sheets[name].columns;
    this[''] = ''; // return empty string if requesting row from other table where id is not specified yet


    
    // initialize defaultRow
    this.defaultRow = {id: ''},
    // initialize data object
    this.data = { 

      forEach: (doThis, maxIndex = this.currentId) => {
        if (maxIndex) {
          for (var index = 1; index <= maxIndex; index++) {
            if (this.data[index] !== undefined && this.filterFn(this.data[index])) {
              this.currentId = index;
              doThis(this.data, index);
            }
          }
        } else {
          maxIndex = this.getMaxIndex();
          for (var index = 1; index <= maxIndex; index++) {
            if (this.data[index] !== undefined && this.filterFn(this.data[index])) {
              this.currentId = index;
              doThis(this.data, index);
            }
          }
          this.currentId = '';
          // I decided to use maxIndex + 1 here so that code that uses the index returns something meaningful. 
          // this might evaluate to something else if another row is inserted from somewhere else
          // while editing.
          doThis(this.data, maxIndex + 1);
        }
      },

      sum: (column) => {
        let sum = 0;
        this.data.forEach( row => sum += row[column] );
        return sum;
      },

      avg: (column) => {
        let length = 0;
        let sum = 0;
        this.data.forEach( (row) => {
          sum += row[column];
          length++;
        });
        return sum / length;
      }
    };

    // access to other tables
    Object.entries(sheets).forEach( ([sheetName, sheet]) => {
      const keyColumn = this.name + '_id';
      if (sheetName !== this.name && sheet.columns.find( col => col.name === keyColumn ) !== undefined) {
        Object.defineProperty(this.data, sheetName, {
          get: () => {
            if (this.currentId) return sheet.model.filter( row => row[keyColumn] == this.currentId );
            return sheet.model.filter( row => false );
          }
        });
      }
    });

    // attach accessors
    // set missing column types
    this.columns.forEach( (col) => {
      this.defaultRow[col.name] = col.default === undefined ? '' : col.default;

      switch (col.class) {
        case 0: // Meta Column
          switch (col.name) {
            case 'id':
              col.type = 'int';
              break;
            case 'createdate':
            case 'modifieddate':
              col.type = 'timestamp';
              break;
          }
        case 2: // Auto Column
          Object.defineProperty(this.data, col.name, {
            get: () => {
              if (this.currentId) return this.data[this.currentId][col.name];
              return this.buffer[col.name];
            }
          });
          break;
        case 1: // Data Column
          Object.defineProperty(this.data, col.name, {
            get: () => {
              //console.log('get',col.name,'id',this.currentId,'buffer',this.buffer);
              if (this.currentId) return this.data[this.currentId][col.name];
              return this.buffer ? this.buffer[col.name] : '';
            },
            set: (value) => {
              if (col.type === 'int') return this.buffer[col.name] = parseInt(value);
              
              if (col.type === 'bool') return this.buffer[col.name] = (value == true || value == 'true');

              if (col.type === 'float') return this.buffer[col.name] = parseFloat(value);

              if (col.type === 'euro') return this.buffer[col.name] = Math.round(parseFloat(value) * (10**4));

              this.buffer[col.name] = value;
              this.run(this.buffer, '');
              this.onBufferChanged(this.buffer);
            }
          });
          break;
        case 3: // Foreign Key
          col.type = 'int';
          Object.defineProperty(this.data, col.name, {
            get: () => {
              if (this.currentId) return this.data[this.currentId][col.name];
              return this.buffer ? this.buffer[col.name] : '';
            },
            set: (value) => {
              // foreign keys are always ints
              this.buffer[col.name] = parseInt(value);
              this.run(this.buffer, '');
              this.onBufferChanged(this.buffer);
            }
          });
          Object.defineProperty(this.data, col.table, {
            get: () => {
              console.log('get table', col.table,' from ',sheets,', currentId',this.currentId, 'data', this.data);
              if (this.currentId) return sheets[col.table].model.at(this.data[this.currentId][col.name]);
              return sheets[col.table].model.at(this.buffer[col.name]);
            }
          });
          break;
      }
    });

    // initialize empty filters
    this.resetFilters();
  }

  at(id) {
    this.sync();
    if (id) this.currentId = id;
    else this.currentId = '';
    this.filterFn = row => true;
    return this.data;
  }

  // TODO should rename this to avoid ambiguity with applyFilter/resetFilter/filterValue
  filterFn() { return true; }
  filter(filterFn) {
    this.sync();
    this.filterFn = filterFn;
    this.currentId = this.getMaxIndex();
    return this.data;
  }

  parseRow(row) {
    this.columns.forEach( (col) => {
      if (col.name === 'id' || col.class === 3) return row[col.name] = parseInt(row[col.name]);

      if (col.type === 'int' || col.type === 'euro') {
        return row[col.name] = parseInt(row[col.name]);
      }
      
      if (col.type === 'bool') {
        return row[col.name] = row[col.name] == true;
      }

      if (col.type === 'float') {
        return row[col.name] = parseFloat(row[col.name]);
      }

      if (row[col.name]) return row[col.name];
      return row[col.name] = this.defaultRow[col.name];
    });
    return row;
  }

  // find largest numerical index
  getMaxIndex(useFilter = true) {
    let max = 0;
    Object.keys(this.data).forEach( (key) => {
      const index = parseInt(key);
      if (
        !isNaN(index) && 
        (useFilter === false || this.filterFn(this.data[index])) && 
        max < index
      ) max = index;
    });
    return max;
  }

  // callback functions
  onBufferChanged(buffer) {}
  onRowDeleted(id) {}
  onRowChanged(id) {}
  onRowAdded(id) {}
  onRepaintDone() {}
  onShowRow() {}
  onHideRow() {}

  clear() {
    this.resetFilters();
    this.filterFn = row => true;
    this.onBufferChanged = buffer => {};
    this.onRowDeleted = id => {};
    this.onRowChanged = id => {};
    this.onRepaintDone = () => {};
    if (this.syncTimeout !== undefined) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = undefined;
    }
  }

  run(row, id) {
    if (typeof row !== 'object') row = this.data[row];
    this.currentId = id === undefined ? row.id : id;
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 2: // Auto Column
          row[col.name] = col.run(this.data);
          break;
      }
    });
    return row;
  }


  applyFilters() {
    this.forAll( (row) => {
      let makeVisible = true;
      this.columns.forEach( (col) => {
        if (row[col.name].toString().indexOf(col.filterValue) === -1) {
          makeVisible = false;
        }
      });
      if (row.visible !== false && makeVisible === false) {
        row.visible = false;
        this.onHideRow(row.id);
      } else if (row.visible === false && makeVisible === true) {
        row.visible = true;
        this.onShowRow(row.id);
      }
    });
  }

  resetFilters() {
    this.columns.forEach( (col) => {
      col.filterValue = '';
    });
    this.forAll( (row) => {
      if (row.visible !== true) this.onShowRow(row.id);
      row.visible = true;
    });
  }


  update(data) {
    const arrData = Object.values(data);
    arrData.forEach( (row) => {
      if (row.deleted) {
        this.data[row.id] = undefined;
        this.onRowDeleted(row.id);
      } else if (this.data[row.id] !== undefined) {
        this.data[row.id] = this.run(this.parseRow(row));
        this.onRowChanged(row.id);
      } else {
        this.data[row.id] = this.parseRow(row);
        this.run(this.data[row.id]);
        const sortedEntries = this.getSortedData(); 
        const next = sortedEntries.indexOf(this.data[row.id]) + 1;
        if (sortedEntries[next] === undefined) this.onRowAdded(row.id);
        else this.onRowAdded(row.id, next);
      }
    });
    this.currentId = '';
    this.applyFilters();
  }

  repaint(data = {}) {
    this.onRepaint();
    Object.values(data).forEach( (row) => {
      if (row.deleted) this.data[row.id] = undefined;
      else this.data[row.id] = this.parseRow(row);
    });
    this.getSortedData().forEach( (row) => {
      this.run(row);
      this.onRowAdded(row.id);
    });
    this.currentId = '';
    this.applyFilters();
  }

  getSortedData() {
    // define sort function
    let sortFn;
    if (this.order === undefined) {
      sortFn = (rowA, rowB) => {
        return rowB.id - rowA.id;
      };
    } else {
      const reverse = this.order.ascending ? 1 : -1;
      if (
        this.order.column.type !== undefined && 
        (
          this.order.column.type === 'string' ||
          this.order.column.name === 'createdate' ||
          this.order.column.name === 'modifieddate'
        )
      ) {
        sortFn = (rowA, rowB) => {
          const valA = rowA[this.order.column.name].toUpperCase();
          const valB = rowB[this.order.column.name].toUpperCase();
          if (valA < valB) return reverse * -1;
          if (valA > valB) return reverse * 1;
          return 0;
        };
      } else {
        sortFn = (rowA, rowB) => {
          if (!rowA[this.order.column.name] && !rowB[this.order.column.name]) return 0;
          if (!rowA[this.order.column.name]) return reverse * -1;
          if (!rowB[this.order.column.name]) return reverse * 1;
          return reverse * (rowA[this.order.column.name] - rowB[this.order.column.name])
        };
      }
    }
    // return data as array sorted with sortFn
    return Object.values(this.data).filter( row => typeof row === 'object' ).sort(sortFn); // apply sort
  }

  // Loop over all Rows where Order does not matter
  // might be faster then iterating in ascending or descending order especially for large datasets
  forAll(doThis) {
    Object.values(this.data).filter( row => typeof row === 'object' ).forEach( (row) => {
      doThis(row, row.id);
    });
  }

  // Loop over all rows in ascending order
  forAllAsc(doThis, minIndex = 1, maxIndex = this.getMaxIndex(false)) {
    for (var index = minIndex; index <= maxIndex; index++) {
      if (this.data[index] !== undefined) {
        doThis(this.data[index], index);
      }
    }
  }

  // Loop over all rows in specified order
  forAllSorted(doThis) {
    Object.entries(this.data).filter( ([id, row]) => !isNaN(parseInt(id)) )
      .sort(this.getSort())
      .forEach( ([id, row]) => doThis(row, id) );
  }

  // copy a row to buffer in order to edit non-destructively
  edit(id) {
    if (id) this.buffer = Object.assign({}, this.data[id]);
    this.currentId = '';
  }

  resetBuffer() {
    this.buffer = Object.assign({}, this.defaultRow);
    this.run(this.buffer);
    this.currentId = '';
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
        this.resetBuffer();
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
        this.resetBuffer();
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
        this.resetBuffer();
        this.update(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
  

}

class TrekSmartInput {
  
  constructor(column, value, target, suggestionModel) {
    this.column = column;

    this.input = document.createElement('input');
    this.input.classList.add('input');
    this.input.type = 'text';
    this.isValid = !this.column.required || value !== '';
    this.input.placeholder = column.title;
    this.input.addEventListener('input', () => this.update());
    this.input.addEventListener('click', () => this.input.select());
    target.appendChild(this.input);
    if (
      column.type === 'int' || 
      column.type === 'euro' || 
      column.type === 'float'
    ) this.input.classList.add('has-text-right');

    // suggestion system
    let makeSuggestion = false;
    let updateSuggestion;

    // sync model
    suggestionModel.sync();

    if (column.class === 3) { // Foreign Key
      makeSuggestion = true;
      updateSuggestion = () => {
        this.suggestion.show();
        const search = this.input.value;
        this.suggestion.table.innerHTML = '';
        suggestionModel.forAllAsc( (row, id) => {
          const idStr = id.toString();
          if (idStr.startsWith(search)) {
            const tr = document.createElement('tr');
            tr.setAttribute('tabindex', '0');
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
            tr.addEventListener('mousemove', event => this.suggestion.select(event.currentTarget) );
            this.suggestion.table.appendChild(tr);
          }
        });
        this.suggestion.current = this.suggestion.table.firstChild;
        if (this.suggestion.current === null) return false;
        this.suggestion.current.classList.add('has-background-primary');
        return true;
      };
    } else if (column.class === 1 && column.type === 'string') { // Data Column of type Text
      makeSuggestion = true;
      updateSuggestion = () => {
        this.suggestion.show();
        const filteredResults = new Set();
        const search = this.input.value;
        suggestionModel.forAllAsc( (row, id) => {
          if (
            row[column.name] &&
            row[column.name].indexOf(search) !== -1
          ) filteredResults.add(row[column.name]);
        });
        if (filteredResults.size === 0) filteredResults.add(search);

        this.suggestion.table.innerHTML = '';
        filteredResults.forEach( (result) => {
          const tr = document.createElement('tr');
          tr.setAttribute('tabindex', '0');
          tr.setAttribute('data-suggestion', result);
          const index = result.indexOf(search);
          tr.innerHTML = `<td>${result.slice(0, index)}<b>${search}</b>${result.slice(index + search.length)}</td>`;
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
          this.onShowSuggestion(this.suggestion);
        },
        hide: (event) => {
          if (
            event !== undefined && 
            event.relatedTarget !== null && 
            event.relatedTarget.hasAttribute('data-suggestion')
          ) {
            this.suggestion.accept(event.relatedTarget);
          }
          this.suggestion.box.style.display = 'none';
          this.onHideSuggestion();
        },
        hasMouse: false
      }
      this.suggestion.box.classList.add('box', 'suggestion', 'is-paddingless');
      this.suggestion.table.classList.add('table','is-hoverable');
      this.suggestion.box.appendChild(this.suggestion.table);
      this.suggestion.box.style.position = 'absolute';
      this.suggestion.table.addEventListener('mouseleave', () => this.suggestion.hasMouse = false );
      this.input.addEventListener('focus', () => this.suggestion.show() );
      this.input.addEventListener('blur', event => this.suggestion.hide(event) );
      this.suggestion.update();
      this.suggestion.hide();
      this.input.insertAdjacentElement('afterend', this.suggestion.box);
    }
  }

  // callback
  onShowSuggestion(suggestion) {}
  onHideSuggestion() {}


  // type validation
  validate() {
    if (this.column.type === 'int') {
      const match = this.input.value.match(/[0-9]*/);
      if (match === null || match[0] !== this.input.value) { // incorrect input
        this.input.classList.add('is-danger');
        this.input.value = match[0];
      } else this.input.classList.remove('is-danger'); // correct input
    } else if (
      this.column.type === 'double' ||
      this.column.type === 'euro'
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
    this.onUpdate(this.input.value);
  }
}
  

class TrekTableView {

  constructor(model, sheets) {
    this.sheets = sheets;
    this.model = model;

    // create table and append to content-container
    const container = document.getElementById('trek-container');
    container.innerHTML = '';
    this.table = document.createElement('table');
    this.table.id = "#trek-table";
    this.table.classList.add('table', 'is-narrow');
    container.appendChild(this.table);
    //const colgroup = document.createElement('colgroup');
    //this.forEachColumn( (column) => {
    //  const col = document.createElement('col');
    //  if (column.type) col.classList.add('column-' + column.type);
    //  colgroup.appendChild(col);
    //});
    //const controlCol = document.createElement('col');
    //controlCol.classList.add('column-control');
    //colgroup.appendChild(controlCol);
    //this.table.appendChild(colgroup);

    this.head = document.createElement('thead');
    this.table.appendChild(this.head);

    this.body = document.createElement('tbody');
    this.table.appendChild(this.body);

    this.editMode = false;
    this.editButton = document.getElementById('trek-edit-button');
    this.editButton.removeAttribute('disabled');
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
    this.newRow.id = '';
    const newTd = document.createElement('td');
    newTd.colSpan = this.model.columns.length + 1;

    this.newRow.appendChild(newTd);
    const newColumnsLayout = document.createElement('div');
    newColumnsLayout.classList.add('columns', 'is-centered');
    newTd.appendChild(newColumnsLayout);
    const newColumn = document.createElement('div');
    newColumn.classList.add('column', 'is-6');
    newColumnsLayout.appendChild(newColumn);
    const newButton = document.createElement('span');
    newButton.classList.add('button', 'is-fullwidth', 'is-primary', 'is-loading');
    newButton.textContent = 'New Entry';
    newColumn.appendChild(newButton);
    this.newRow.addEventListener('click', (event) => this.edit(event) );

    this.model.order = {
      ascending: false,
      column: {name: 'id'}
    }

    this.editMode = false;
    this.filterMode = false;
    // generate initial table content
    this.head.innerHTML = '';
    this.head.appendChild(this.getHeadRow());

      
    // push url
    const url = new URL(document.location.href);
    url.searchParams.set('table', this.model.name);
    window.history.pushState({
      viewClass: this.constructor.name,
      modelName: this.model.name,
      lastUpdate: this.model.lastUpdate ? this.model.lastUpdate : 0,
    }, '', url.pathname + url.search);


    // set callback actions
    // update autocolumns in formrow
    this.model.onBufferChanged = (buffer) => {
      this.forEachColumn( (col) => {
        switch (col.class) {
          case 2: // Auto Column
            const val = this.getDisplayFormat(buffer[col.name]);
            const td = this.formRow.querySelector('td[data-col="'+col.name+'"]');
            if (val !== td.textContent) td.textContent = val;
        }
      });
    };

    // remove deleted row
    this.model.onRowDeleted = (id) => {
      this.body.removeChild(document.getElementById(id));
    };

    // append row at end of tbody
    this.model.onRowAdded = (id, next) => {
      console.log('onRowAdded',next);
      if (next !== undefined) this.body.insertBefore(this.getRow(id), this.body.childNodes[next]);
      else this.body.appendChild(this.getRow(id));
    }

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

    this.model.onRepaint = () => {
      newButton.classList.remove('is-loading');
      this.body.innerHTML = '';
      this.body.appendChild(this.newRow);
    };

    this.model.onHideRow = id => {
      document.getElementById(id).style.display = 'none';
      console.log('hide',id);
    };
    this.model.onShowRow = id => document.getElementById(id).style.display = '';

    // automatically refresh this model every 5 min
    this.model.syncTimeout = true;

    // asynchronously pull content per ajax request, append table-rows per callback
    setTimeout(() => this.model.sync(true));

    // add Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (this.formRow === undefined) { // no active form
        switch (event.key) {
          case 'Enter':
            this.model.edit('');
            this.formRow = this.getFormRow('');
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
        } else if (this.filterMode) { // filter mode
          switch (event.key) {
            case 'Escape':
              console.log('we should leave filterMode now');
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
  getDisplayFormat(col, row) {
    const val = (row === undefined) ? this.model.data[col.name] : row[col.name];
    switch (col.type) {
      case 'euro':
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

  getColSpan(col) {
    if (col === 'control') return 3;
    if (col.type === 'string') return 3;
    if (col.name === 'createdate' || col.name === 'modifieddate') return 2;
    if (col.type === 'euro') return 2;
    return 1;
  }

  // generate row formatted as tr
  getRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    this.model.at(id);
    this.forEachColumn( (col) => {
      const val = this.getDisplayFormat(col);
      const td = document.createElement('td');
      //td.colSpan = this.getColSpan(col);
      td.setAttribute('data-col', col.name);
      if (col.type === 'int' || col.type === 'float' || col.type === 'euro') {
        td.classList.add('has-text-right');
        td.setAttribute('nowrap', true);
      }
      td.innerHTML += `${val} ${val ? col.symbol : ''}`;
      tr.appendChild(td);
    });
    const controlTd = document.createElement('th');
    //controlTd.colSpan = this.getColSpan('control');
    tr.appendChild(controlTd); // empty td for controls-column
    tr.addEventListener('click', event => this.edit(event) );
    return tr;
  }



  // generate table head
  getHeadRow(sorting = true) {
    const getIcon = (selected = false, ascending = false) => ` <span class="icon"><i class="fas fa-caret${selected ? '-square' : ''}-${ascending ? 'up' : 'down'}"></i></span>`;
    const tr = document.createElement('tr');
    if (this.editMode) {
      this.forEachColumn( (col) => {
        const th = document.createElement('th');
        const spacer = document.createElement('div');
        spacer.classList.add('trek-column', 'trek-column-' + col.type);
        spacer.innerHTML = '&nbsp;';
        th.appendChild(spacer);
        
        //th.colSpan = this.getColSpan(col);
        th.classList.add('is-unselectable');
        th.appendChild(document.createTextNode(col.title));
        if (this.model.order.column === col) th.innerHTML += getIcon(true, this.model.order.ascending);
        tr.appendChild(th);
      });
    } else {
      // column headers and sorting functions
      this.forEachColumn( (col) => {
        const th = document.createElement('th');
        const spacer = document.createElement('div');
        spacer.classList.add('trek-column', 'trek-column-' + col.type);
        spacer.innerHTML = '&nbsp;';
        th.appendChild(spacer);
        //th.colSpan = this.getColSpan(col);
        const a = document.createElement('a');
        a.classList.add('is-unselectable');
        a.innerHTML = col.title;
        if (this.model.order.column === col) {
          // switch order
          a.addEventListener('click', () => { 
            this.model.order.ascending = !this.model.order.ascending;
            this.head.innerHTML = '';
            this.head.appendChild(this.getHeadRow());
            setTimeout( () => this.model.sync(true) );
          });
          a.innerHTML += getIcon(true, this.model.order.ascending);
        } else {
          // sort by this column
          a.addEventListener('click', () => {
            this.model.order = {
              column: col,
              ascending: false
            };
            this.head.innerHTML = '';
            this.head.appendChild(this.getHeadRow());
            setTimeout( () => {
              this.model.sync(true);
            });
          });
          a.innerHTML += getIcon(false, false);
        }
        th.appendChild(a);

        th.appendChild(document.createElement('br'));
        
        // filters
        const p = document.createElement('p');
        p.classList.add('control', 'has-icons-left');
        const filterIcon = document.createElement('span');
        filterIcon.classList.add('icon', 'is-small', 'is-left');
        filterIcon.innerHTML = `<i class="fas fa-filter"></i>`;
        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('icon', 'is-small', 'is-right');
        deleteIcon.innerHTML = `<a class="delete is-small"></a>`;
        deleteIcon.style.display = 'none';
        const input = document.createElement('input');
        input.classList.add('input', 'is-small');
        input.type = 'text';
        input.placeholder = `by ${col.name}`;
        input.addEventListener('focus', () => {
          p.classList.remove('has-icons-left');
          filterIcon.style.display = 'none';
          this.filterMode = true;
        });
        input.addEventListener('blur', () => {
          if (input.value === '') {
            p.classList.add('has-icons-left');
            filterIcon.style.display = '';
          }
          this.filterMode = false;
        });
        input.addEventListener('input', () => {
          if (input.value === '') {
            p.classList.remove('has-icons-right');
            deleteIcon.style.display = 'none';
          } else {
            p.classList.add('has-icons-right');
            deleteIcon.style.display = '';
          }
          col.filterValue = input.value;
          this.model.applyFilters();
        });
        input.addEventListener('click', (event) => {
          if (event.layerX > input.offsetWidth - 20) {
            input.value = '';
            p.classList.remove('has-icons-right');
            deleteIcon.style.display = 'none';
            col.filterValue = input.value;
            this.model.applyFilters();
          }
        });
        p.appendChild(input);
        p.appendChild(filterIcon);
        p.appendChild(deleteIcon);
        th.appendChild(p);
        tr.appendChild(th);
      });
    }
    const controlTh = document.createElement('th');
    const spacer = document.createElement('div');
    spacer.classList.add('trek-column', 'trek-column-control');
    spacer.innerHTML = '&nbsp;';
    controlTh.appendChild(spacer);

    const p = document.createElement('p');
    p.classList.add('column', 'column-control');
    //controlTh.colSpan = this.getColSpan('control');
    tr.appendChild(controlTh); // empty header for controls-column
    return tr;
  }

  // generate form
  getFormRow(id) {
    const tr = document.createElement('tr');
    tr.classList.add('trek-formrow');
    tr.id = id;
    tr.inputs = [];

    tr.validate = () => {
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
      //const spacer = document.createElement('div');
      //spacer.innerHTML = '&nbsp;';
      //spacer.classList.add('trek-row-formrow');
      //td.appendChild(spacer);
      //td.colSpan = this.getColSpan(col);
      td.classList.add('control');
      if (col.type === 'int' || col.type === 'float' || col.type === 'euro') {
        td.classList.add('has-text-right');
        td.setAttribute('nowrap', true);
      }
      td.setAttribute('data-col', col.name);
      td.style.verticalAlign = 'middle';
      td.style.height = '39px';
      tr.appendChild(td);
      let inputDiv;
      let input;
      switch (col.class) {
        case 1: // Data Column
          input = new TrekSmartInput(
            col, // column
            this.getDisplayFormat(col),
            td, // target
            this.model // suggestionModel
          );
          input.input.setAttribute('tabindex', 1);
          input.onUpdate = (value) => {
            this.model.data[col.name] = value;
            tr.validate()
          };
          input.onShowSuggestion = (suggestion) => {
            tr.activeSuggestion = suggestion;
          };
          input.onHideSuggestion = () => {
            tr.activeSuggestion = undefined;
          };
          tr.inputs.push(input);
          break;
        case 3: // Foreign Key
          input = new TrekSmartInput(
            col, // column
            this.getDisplayFormat(col), // value
            td, // target
            this.sheets[col.table].model // suggestionModel
          );
          input.input.setAttribute('tabindex', 1);
          input.onUpdate = (value) => {
            this.model.data[col.name] = value;
            tr.validate()
          };
          input.onShowSuggestion = (suggestion) => {
            tr.activeSuggestion = suggestion;
          };
          input.onHideSuggestion = () => {
            tr.activeSuggestion = undefined;
          };
          tr.inputs.push(input);
          break;
        default:
          td.innerHTML += `<div class="trek-row-formrow">${this.getDisplayFormat(col)}</div>`;
      }
      if (col.symbol) {
        const symbolspan = document.createElement('span');
        symbolspan.innerHTML = ' ' + col.symbol;
        td.appendChild(symbolspan);
      }
    });

    const controlTd = document.createElement('td');
    const spacer = document.createElement('div');
    spacer.classList.add('trek-row-formrow');
    controlTd.appendChild(spacer);
    const buttons = document.createElement('div');
    buttons.classList.add('buttons','has-addons');
    spacer.appendChild(buttons);
    tr.saveButton = document.createElement('span'); // save this in formRow for later
    tr.saveButton.classList.add('button', 'is-link');
    tr.saveButton.addEventListener('click', () => this.save() );
    tr.saveButton.setAttribute('disabled', true);
    tr.saveButton.textContent = 'Save';
    tr.saveButton.tabindex = 1;
    buttons.appendChild(tr.saveButton);
    tr.cancelButton = document.createElement('span');
    tr.cancelButton.classList.add('button');
    tr.cancelButton.addEventListener('click', () => this.cancel() );
    tr.cancelButton.textContent = 'Cancel';
    tr.cancelButton.tabindex = 1;
    buttons.appendChild(tr.cancelButton);
    if (id) {
      tr.deleteButton = document.createElement('span');
      tr.deleteButton.classList.add('button', 'is-danger');
      tr.deleteButton.addEventListener('click', () => this.delete() );
      tr.deleteButton.textContent = 'Delete';
      tr.deleteButton.tabindex = 1;
      buttons.appendChild(tr.deleteButton);
    }
    //controlTd.colSpan = this.getColSpan('control');
    tr.appendChild(controlTd);


    return tr;
  }

  edit(event) {
    if (this.editMode || !event.currentTarget.id) {
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
      if (input !== null) {
        input.focus();
        input.select();
      // otherwise focus first input in this row
      } else {
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
    if (this.formRow.id) { // row exists, alter
      this.model.alter(
        this.formRow.id, 
        () => { // onSuccess
          this.formRow = undefined; 
          // reset buffer
          this.model.resetBuffer();
        },
        onError
      );
    } else { // new row, insert
      this.model.insert( 
        () => { // onSuccess
          // reset buffer
          this.model.resetBuffer();
          this.body.replaceChild(this.newRow, this.formRow);
          this.formRow = undefined;
        }, 
        onError
      );
    }
  }

  cancel() {
    this.model.resetBuffer();
    if (this.formRow !== undefined) {
      if (this.formRow.id) this.body.replaceChild(this.getRow(this.formRow.id), this.formRow);
      else this.body.replaceChild(this.newRow, this.formRow);
      this.model.resetBuffer();
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
        this.model.resetBuffer();
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
      this.head.innerHTML = '';
      this.head.appendChild(this.getHeadRow(true));
    }
  }

  enterEditMode() {
    if (!this.editMode) {
      this.table.classList.add('is-hoverable');
      this.editMode = true;
      this.editButton.textContent = 'Done';
      this.head.innerHTML = '';
      this.head.appendChild(this.getHeadRow(false));
    }
  }

  clear() {
    this.editButton.setAttribute('disabled', true);
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
    // initialize buffers, could not be done before all models are constructed
    Object.values(this.sheets).forEach( (sheet) => {
      sheet.model.resetBuffer();
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
    else this.view = new TrekTableView(activeSheet.model, this.sheets);
  }

}
