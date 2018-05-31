"use strict";

class TrekTableModel {

  constructor(name, sheets, api, user) {
    //console.log('TrekTableModel(',name,sheets,api,user,')');
    this.name = name;
    this.api = api;
    this.user = user;
    this.columns = sheets[name].columns;
    this[''] = ''; // return empty string if requesting row from other table where id is not specified yet


    
    // initialize defaultRow
    this.defaultRow = {id: ''},
    // initialize data object
    this.data = { 

      forEach: (doThis, maxIndex = this.currentId) => {
        if (maxIndex === 0) return;
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
      },

      max: (column) => {
        return Math.max( 
          Object.values(this.data).filter( row => typeof row === 'object' ).map( row => row[column] ) 
        );
      }
    };


    // access to other tables
    const keyColumn = this.name + '_id';
    Object.entries(sheets).forEach( ([sheetName, sheet]) => {
      if (sheetName !== this.name && sheet.type === 'table' && sheet.columns.find( col => col.name === keyColumn ) !== undefined) {
        Object.defineProperty(this.data, sheetName, {
          get: () => {
            if (this.currentId) return sheet.model.filter( row => row[keyColumn] == this.currentId );
            return sheet.model.filter( row => false );
          }
        });
      }
    });

    // attach accessors for Meta columns
    Object.defineProperty(this.data, 'id', {
      get: () => {
        //console.log('on ',this.name, 'get id, currentId',this.currentId,'data', this.data);
        if (this.currentId) return this.data[this.currentId].id;
        return this.buffer ? this.buffer.id : '';
      }
    });
    const idCol = this.columns.find( col => col.name === 'id' );
    if (idCol) {
      this.barcode = idCol.barcode;
      if (idCol.barcode === 'ean') this.eanBarcode = (value) => {
        this.buffer.barcode = value;
      }
    }

    Object.defineProperty(this.data, 'createdate', {
      get: () => {
        //console.log('on ',this.name, 'get createdate, currentId',this.currentId,'data', this.data);
        if (this.currentId) return this.data[this.currentId].createdate;
        return this.buffer ? this.buffer.createdate : '';
      }
    });
    Object.defineProperty(this.data, 'modifieddate', {
      get: () => {
          //console.log('on ',this.name, 'get moddate, currentId',this.currentId,'data', this.data);
        if (this.currentId) return this.data[this.currentId].modifieddate;
        return this.buffer ? this.buffer.modifieddate : '';
      }
    });
    if (this.user) {
      Object.defineProperty(this.data, 'modifieduser', {
        get: () => {
          //console.log('on ',this.name, 'get modeuser, currentId',this.currentId,'data', this.data);
          if (this.currentId) return this.data[this.currentId].modifieduser;
          return this.buffer ? this.buffer.modifieduser : '';
        }
      });
      Object.defineProperty(this.data, 'createuser', {
        get: () => {
          //console.log('on ',this.name, 'get createuser, currentId',this.currentId,'data', this.data);
          if (this.currentId) return this.data[this.currentId].createuser;
          return this.buffer ? this.buffer.createuser : '';
        }
      });
    }
    
    // attach accessors
    // set missing column types
    this.columns.forEach( (col) => {
      if (col.default === undefined) {
        switch (col.type) {
          case 'int':
          case 'float':
          case 'euro':
            this.defaultRow[col.name] = 0;
            break;
          case 'bool':
            this.defaultRow[col.name] = false;
          default:
            this.defaultRow[col.name] = '';
        }
      } else this.defaultRow[col.name] = col.default;

      switch (col.class) {
        case 2: // Auto Column
          Object.defineProperty(this.data, col.name, {
            get: () => {
              //console.log('on ',this.name, 'get ',col.name,' currentId',this.currentId,'data', this.data);
              if (this.currentId) return this.data[this.currentId][col.name];
              return this.buffer ? this.buffer[col.name] : this.defaultRow[col.name];
            }
          });
          break;
        case 1: // Data Column
          Object.defineProperty(this.data, col.name, {
            get: () => {
              //console.log('on ',this.name, 'get ',col.name,' currentId',this.currentId,'data', this.data);
              if (this.currentId) return this.data[this.currentId][col.name];
              return this.buffer ? this.buffer[col.name] : this.defaultRow[col.name];
            },
            set: (value) => {
              switch (col.type) {
                case 'int':
                  this.buffer[col.name] = parseInt(value);
                  break;
                case 'bool': 
                  this.buffer[col.name] = (value == true || value == 'true');
                  break;
                case 'float': 
                  this.buffer[col.name] = parseFloat(value);
                  break;
                case 'euro':
                  this.buffer[col.name] = Math.round(parseFloat(value) * (10**4));
                  break;
                default:
                  this.buffer[col.name] = value;
              }
              this.run(this.buffer, '');
              this.onBufferChanged(this.buffer);
            }
          });
          break;
        case 3: // Foreign Key
          col.type = 'int';
          Object.defineProperty(this.data, col.name, {
            get: () => {
              //console.log('on ',this.name, 'get ',col.name,' currentId',this.currentId,'data', this.data);
              if (this.currentId) return this.data[this.currentId][col.name];
              if (this.buffer) return this.buffer[col.name];
              return this.defaultRow[col.name];
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
              //console.log('on ',this.name, 'get ',col.name,' currentId',this.currentId,'data', this.data);
              if (this.currentId) return sheets[col.table].model.at(this.data[this.currentId][col.name]);
              if (this.buffer) return sheets[col.table].model.at(this.buffer[col.name]);
              return sheets[col.table].model.at('');
            }
          });
          if (sheets[col.table].model.barcode === 'ean') {
            this.eanBarcode = (value) => {
              this.buffer[col.name] = Object.values(sheets[col.table].model.data).find( row => value === row.barcode ).id;
              this.onBarcodeEntered(col, this.buffer);
            };
          }
          break;
      }
    });

    Object.defineProperty(this.data, 'barcode', {
      get: () => {
        if (this.currentId) return this.data[this.currentId].barcode;
        return this.buffer ? this.buffer.barcode : '';
      },
      set: (value) => {
        const matchCol = this.columns.find( col => value.startsWith(col.table) );
        if (matchCol) {
          this.buffer[matchCol.name] = parseInt(value.slice(value.length - 13));
          this.run(this.buffer);
          this.onBarcodeEntered(col, this.buffer);
          this.onBufferChanged(this.buffer);
          return true;
        }
        else if (this.eanBarcode) {
          this.eanBarcode(parseInt(value));
          this.run(this.buffer);
          this.onBufferChanged(this.buffer);
          return true;
        }
        return false;
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
      if (col.name === 'id') {
        if (col.barcode === 'ean' && row.barcode) row.barcode = parseInt(row.barcode);
        return row[col.name] = parseInt(row[col.name]);
      }

      if (col.class === 3) return row[col.name] = parseInt(row[col.name]);

      if (col.type === 'int' || col.type === 'euro') {
        return row[col.name] = parseInt(row[col.name]);
      }
      
      if (col.type === 'bool') {
        return row[col.name] = row[col.name] == true;
      }

      if (col.type === 'float') {
        return row[col.name] = parseFloat(row[col.name]);
      }

      if (row[col.name] !== undefined && row[col.name] !== null) return row[col.name];
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
    //console.log('run',row,id);
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


  runAll() {
    this.forAllAsc( row => this.run(row) );
  }

  update(data) {
    const arrData = Object.values(data);
    arrData.forEach( (row) => {
      if (row.deleted) {
        this.data[row.id] = undefined;
        this.onRowDeleted(row.id);
      } else if (this.data[row.id] !== undefined) {
        this.data[row.id] = this.parseRow(row)
        this.run(this.data[row.id]);
        this.onRowChanged(row.id);
      } else {
        this.data[row.id] = this.parseRow(row);
        this.run(this.data[row.id]);
        const sortedData = this.getSortedData(); 
        const next = sortedData.indexOf(this.data[row.id]) + 1;
        if (sortedData[next] === undefined) this.onRowAdded(row.id);
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
  setBuffer(id) {
    if (id) this.buffer = Object.assign({}, this.data[id]);
    this.currentId = '';
  }

  resetBuffer() {
    //console.log('resetBuffer on',this.name);
    this.buffer = Object.assign({}, this.defaultRow);
    this.run(this.buffer);
    this.currentId = '';
  }

  // return only data and foreign key fields for ajax requests
  getFormData() {
    const data = {};
    this.columns.forEach( (col) => {
      switch (col.class) {
        case 0:
          if (col.barcode !== undefined && col.barcode === 'ean' && this.buffer.barcode) {
            data.barcode = this.buffer.barcode;
          }
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

  find(findFn) {
    return Object.values(this.data).filter( val => typeof val === 'object' ).find(findFn);
  }

  // api requests
  pull(onSuccess, onError) {
    this.api.xhrRequest(
      {operation: 'SELECT', tableName: this.name},
      (response) => { // onSuccess
        Object.values(response.data).forEach( (row) => this.data[row.id] = this.parseRow(row) );
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
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
    };
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
    const data = this.getFormData();
    if (this.user) {
      data.createuser = this.user.name;
      data.modifieduser = this.user.name;
    }
    this.api.xhrRequest(
      {
        operation: 'INSERT', 
        tableName: this.name, 
        lastUpdate: this.lastUpdate.server, 
        data: data
      },
      (response) => { // onSuccess
        this.lastUpdate = {
          server: response.time,
          client: Date.now()
        };
        this.update(response.data);
        if (typeof onSuccess === 'function') onSuccess();
      },
      onError
    );
  }
  alter(id, onSuccess, onError) {
    const data = this.getFormData();
    if (this.user) data.modifieduser = this.user.name;
    this.api.xhrRequest(
      {
        operation: 'ALTER',
        tableName: this.name,
        lastUpdate: this.lastUpdate.server,
        row: id,
        data: data
      },
      (response) => { // onSuccess
        this.lastUpdate = {
          server: response.time,
          client: Date.now()
        };
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
    this.input.value = value;
    this.input.placeholder = column.title;
    this.input.addEventListener('click', () => this.input.select());
    this.isValid = !this.column.required || value !== '';
    if (
      column.type === 'int' || 
      column.type === 'euro' || 
      column.type === 'float'
    ) this.input.classList.add('has-text-right');

    const control = document.createElement('div');
    control.classList.add('control');
    control.appendChild(this.input);
    if (column.symbol) {
      control.classList.add('has-icons-right');
      const span = document.createElement('span');
      span.classList.add('icon', 'is-right');
      span.innerHTML = column.symbol;
      control.appendChild(span);
    } 
    target.appendChild(control);

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
      this.suggestion.box.classList.add('box', 'suggestion', 'is-paddingless', 'trek-suggestion-box');
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

  setAttribute(identifier, value) {
    this.input.setAttribute(identifier, value);
  }
  removeAttribute(identifier) {
    this.input.removeAttribute(identifier);
  }
  addClass(className) {
    this.input.classList.add(className);
  }
  removeClass(className) {
    this.input.classList.remove(className);
  }
  focus() {
    this.input.focus();
  }
  set(value) {
    this.input.value = value;
  }
  get() {
    return this.input.value;
  }
  enter(value) {
    this.input.value += value;
  }

    
}
  

class TrekTableView {

  constructor(name, sheets) {
    this.sheets = sheets;
    this.model = sheets[name].model;

    // create table and append to content-container
    this.container = document.getElementById('trek-container');
    this.container.innerHTML = '';
    this.table = document.createElement('table');
    this.table.id = "#trek-table";
    this.table.classList.add('table', 'is-narrow');
    this.container.appendChild(this.table);

    this.head = document.createElement('thead');
    this.table.appendChild(this.head);

    this.body = document.createElement('tbody');
    this.table.appendChild(this.body);

    this.editMode = false;
    this.editButton = document.getElementById('trek-edit-button');
    this.editButton.removeAttribute('disabled');
    const editFn = () => {
      // toggle edit mode
      if (this.editMode) {
        this.exitEditMode();  
      } else {
        this.enterEditMode();
      }
    };
    this.editButton.addEventListener('click', editFn);
    this.printButton = document.getElementById('trek-print-button');
    this.printButton.removeAttribute('disabled');
    const printFn = () => this.print();
    this.printButton.addEventListener('click', printFn );


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

    // set initial order
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
    url.searchParams.set('sheet', this.model.name);
    window.history.pushState({
      viewClass: this.constructor.name,
      table: this.model.name,
      lastUpdate: this.model.lastUpdate ? this.model.lastUpdate : 0,
      viewTarget: 'web'
    }, '', url.pathname + url.search);


    // set callback actions
    // update autocolumns in formrow
    this.model.onBufferChanged = (buffer) => {
      this.forEachColumn( (col) => {
        switch (col.class) {
          case 0: // Meta Column
            if (col.barcode) {
              const val = buffer.barcode;
              if (val) {
                const spacer = this.formRow.querySelector('td[data-col="'+col.name+'"] .trek-row-formrow');
                spacer.innerHTML = `Barcode:<br>${val}`;
                spacer.classList.add('is-size-7');
              }
            }
            break;
          case 2: // Auto Column
            const val = this.getDisplayFormat(col, buffer);
            const spacer = this.formRow.querySelector('td[data-col="'+col.name+'"] .trek-row-formrow');
            spacer.textContent = val;
            if (col.symbol) {
              const symbolspan = document.createElement('span');
              symbolspan.innerHTML = ' ' + col.symbol;
              spacer.appendChild(symbolspan);
            }
            break;
        }
      });

    };

    this.model.onBarcodeEntered = (column, buffer) => {
      const input = this.formRow.inputs.find( input => input.column === column );
      input.set(this.getDisplayFormat(input.column, buffer));
      input.isValid = true;
    };

    // remove deleted row
    this.model.onRowDeleted = (id) => {
      const row = document.getElementById(id);
      if (row !== null) this.body.removeChild(row);
    };

    // append row at end of tbody
    this.model.onRowAdded = (id, next) => {
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
    };
    this.model.onShowRow = id => document.getElementById(id).style.display = '';

    // automatically refresh this model every 5 min
    this.model.syncTimeout = true;

    // asynchronously pull content per ajax request, append table-rows per callback
    setTimeout(() => this.model.sync(true));

    let keyQueue = [];
    let keyTimeout = -1;
    let keyTime = 0;
    // add Keyboard shortcuts
    const keyAction = (event) => {
      //console.log(event.key);
      if (this.formRow === undefined) { // no active form
        switch (event.key) {
          case 'Enter':
            this.model.setBuffer('');
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
        if (event.key === 'Enter' && keyQueue.length > 0) {
          clearTimeout(keyTimeout);
          const scanValue = keyQueue.join('');
          const activeElement = document.activeElement;
          let input;
          if (activeElement.tagName === 'INPUT') {
            input = this.formRow.inputs.find( input => input.input === activeElement );
            input.set(this.model.buffer[input.column.name]);
            input.update();
          }
          this.model.data.barcode = scanValue;
          keyQueue = [];
          keyTime = Date.now();
          return;

        } 

        const now = Date.now();
        if (now - keyTime > 10) {
          const activeElement = document.activeElement;
          let input;
          if (activeElement.tagName === 'INPUT') {
            input = this.formRow.inputs.find( input => input.input === activeElement );
          }
          if (event.key.match(/^[a-z0-9]$/)) {
            keyQueue.push(event.key);
          }
          switch (event.key) {
            case 'Enter':
            case 'Escape':
            case 'ArrowDown':
            case 'ArrowUp':
              break;
            default:
              clearTimeout(keyTimeout);
              keyTimeout = setTimeout( () => {
                keyQueue = [];
                if (input) input.update();
              }, 50);
          }
          keyTime = now;
        } else {
          if (event.key.match(/^[a-z0-9]$/)) {
            keyQueue.push(event.key);
          }
          keyTime = now;
          return;
        }


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
              if (s.current.nextSibling) s.select(s.current.nextSibling);
              return;
            case 'ArrowUp':
              if (s.current.previousSibling) s.select(s.current.previousSibling);
              return;
            case 'Enter':
              s.accept(s.current);
              return;
          }
        }
      }
    };

    document.addEventListener('keyup', keyAction);
    
    this.clear = () => {
      this.editButton.setAttribute('disabled', true);
      this.editButton.removeEventListener('click', editFn);
      this.printButton.setAttribute('disabled', true);
      this.printButton.removeEventListener('click', printFn);
      this.model.clear();
      document.removeEventListener('keyup', keyAction);
    };


  }

    
  // if column type is a currency convert to float for correct display
  getDisplayFormat(col, row) {
    const val = (row === undefined) ? this.model.data[col.name] : row[col.name];
    if (col.name === 'id') {
      if (val) return val;
      else return '';
    }
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

  // generate row formatted as tr
  getRow(id) {
    const tr = document.createElement('tr');
    tr.id = id;
    const data = this.model.at(id);
    this.forEachColumn( (col) => {
      const val = this.getDisplayFormat(col);
      const td = document.createElement('td');
      //td.colSpan = this.getColSpan(col);
      td.setAttribute('data-col', col.name);
      if (col.type === 'int' || col.type === 'float' || col.type === 'euro') {
        td.classList.add('has-text-right');
        td.setAttribute('nowrap', true);
      }
      if (col.name === 'id' && col.barcode === 'ean' && data.barcode) {
        td.innerHTML += `<span class="is-size-7">(${data.barcode})</span> `;
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
          input.setAttribute('tabindex', 1);
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
          input.setAttribute('tabindex', 1);
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
          const spacer = document.createElement('div');
          spacer.classList.add('trek-row-formrow');
          spacer.innerHTML += this.getDisplayFormat(col);
          spacer.style.paddingTop = '0.6em';
          if (col.symbol) {
            const symbolspan = document.createElement('span');
            symbolspan.innerHTML = ' ' + col.symbol;
            spacer.appendChild(symbolspan);
          }
          td.appendChild(spacer);
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
      this.model.setBuffer(event.currentTarget.id);
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
    //console.log('save');
    if (!this.formRow.isValid) {
      //console.log('is invalid');
      this.formRow.inputs.forEach( (input) => {
        if (input.isValid) input.removeClass('is-danger');
        else input.addClass('is-danger');
      });
      return;
    }
    this.formRow.saveButton.classList.add('is-loading');
    const onError = () => { // onError
      this.formRow.saveButton.classList.remove('is-loading');
      this.formRow.classList.add('has-background-danger');
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

  print() {
    if (this.printWindow !== undefined) this.printWindow.close();
    const title = this.sheets[this.model.name].title;
    this.printWindow = window.open('', 'tab');
    const d = this.printWindow.document;
    d.title = title;
    const printHead = d.querySelector('head');
    // concatenate absolute url to stylesheet and add to print page
    const currentUrl = new URL(document.location.href);
    const path = currentUrl.pathname.split('/');
    path.pop(); // remove filename
    this.printInfo.stylesheet.split('/').forEach( (dir) => {
      if (dir === '..') path.pop();
      else path.push(dir);
    });
    const stylesheet = d.createElement('link');
    stylesheet.type = "text/css";
    stylesheet.rel = "stylesheet";
    stylesheet.href = currentUrl.origin + path.join('/');
    printHead.appendChild(stylesheet);
    // find body, add title and date
    const printBody = d.querySelector('body');
    const titleDiv = d.createElement('div');
    titleDiv.innerHTML = `<h2 id="title">${title}</h2>`;
    const date = new Date();
    titleDiv.innerHTML += `<p id="timestamp"><span id="date">${date.getDate()}.${date.getMonth()}.${date.getFullYear()}</span> <span id="time">${date.getHours()}:${date.getMinutes()}</span></p>`
    printBody.appendChild(titleDiv);
    // create table
    const table = d.createElement('div');
    table.id = 'table';
    // add space to generate barcodes
    const hasBarcode = this.model.barcode;
    //console.log('print ,hasBarcode = ',hasBarcode);

    const barcodeSpace = document.createElement('div');
    if (hasBarcode) {
      this.container.appendChild(barcodeSpace);
    }

    this.model.getSortedData().forEach( (row) => {
      const tr = d.createElement('div');
      tr.classList.add('tr');
      // generate barcode
      if (hasBarcode) {
        const barcode = document.createElement('img');
        barcode.id = 'barcode';
        barcodeSpace.appendChild(barcode);
        if (row.barcode) {
          const code = row.barcode;
          JsBarcode('#barcode', code , {
            format: 'ean13'
          });
        } else {
          const code = this.model.name + ("0000000000000" + row.id).slice(-13);
          JsBarcode('#barcode', code , {
            format: row.barcode ? 'ean13' : 'code128',
            width: 1
          });
        }
        const barcodeTd = document.createElement('span');
        barcodeTd.classList.add('td-barcode');
        //barcodeTd.appendChild(barcode);
        barcode.id = '';
        barcode.classList.add('barcode');
        tr.appendChild(barcode);
      }
      const p = document.createElement('p');
      p.classList.add('p');
      // generate rest of column
      this.forEachColumn( (col) => {
        const val = this.getDisplayFormat(col, row);
        if (val) {
          const td = d.createElement('span');
          td.classList.add('td', 'td-' + col.type);
          const label = d.createElement('div');
          label.classList.add('label');
          label.textContent = col.title;
          td.appendChild(label);
          const content = d.createElement('span');
          content.classList.add('content');
          content.textContent = val;
          if (col.symbol) content.innerHTML += col.symbol;
          td.appendChild(content);
          p.appendChild(td);
        }
      });
      tr.appendChild(p);
      table.appendChild(tr);
    });
    printBody.appendChild(table);
    // clean up
    if (hasBarcode) this.container.removeChild(barcodeSpace);

  }
    

}
    

class TrekApi {
  constructor(ajaxUrl) {
    this.ajaxUrl = ajaxUrl;
  }

  // general ajax settings and error handling
  xhrRequest(data, onSuccess, onError) {
    //console.log('ajax request, url: ', this.ajaxUrl, ' data: ', data);
    $.ajax({
      url: this.ajaxUrl,
      method: 'POST',
      data: data,
      dataType: 'json',
      async: false,
      success: (response) => {
        //console.log('response: ', response);
        if (response.success) onSuccess(response);
        else {
          console.log('Database error: '+response.errormsg);
          if (typeof onError === 'function') onError();
        }
      },
      error: (xhr, ajaxOptions, thrownError) => {
        //console.log('Ajax error: '+xhr.status+'\n'+thrownError);
        if (typeof onError === 'function') onError();
      }
    });
  }

}


class TrekDatabase {

  constructor(settings) {
    this.title = settings.title;
    // find active tab to reduce DOM calls for tab switching
    this.activeTab = document.querySelector('#trek-db-nav li.is-active');
    // initialize api
    this.api = new TrekApi(settings.ajaxUrl);
    // print info
    this.printInfo = settings.printInfo;
    // user lock
    if (settings.user === 'simple') {
      this.user = {};
      this.lock = new TrekSimpleUserLock(this.user, this.api);
      this.lock.onUnlock = () => this.selectTab();
      this.lock.onLock = () => {
        if (this.view !== undefined) this.view.clear();
        this.view = undefined;
      };
    }
    // iterate sheets and initialize models
    this.sheets = settings.sheets
    Object.entries(this.sheets).forEach( ([name, sheet]) => {
      if (sheet.type === 'table') {
        if (sheet.modelClass !== undefined) sheet.model = new sheet.modelClass(name, this.sheets, this.api, this.user);
        else sheet.model = new TrekTableModel(name, this.sheets, this.api, this.user);
      }
    });
    // pull, run, initialize buffers
    const tables = Object.values(this.sheets).filter( sheet => sheet.type === 'table' );
    tables.forEach( sheet => sheet.model.pull() );
    tables.forEach( sheet => sheet.model.runAll() );
    tables.forEach( sheet => sheet.model.resetBuffer() );
    
    if (!settings.user) this.selectTab();
    //this.selectTab();

  }

  selectTab(tabLink) {
    if (typeof tabLink === 'object') {
      this.activeTab.classList.remove('is-active');
      this.activeTab = tabLink.parentNode;
      this.activeTab.classList.add('is-active');
      if (this.view !== undefined) this.view.clear();
    }
    const name = this.activeTab.getAttribute('data-sheet');
    const activeSheet = this.sheets[name];
    document.title = `${this.title} | ${activeSheet.title}`;
    const printStylesheet = activeSheet.printStylesheet ? activeSheet.printStylesheet : this.printStylesheet;
    if (activeSheet.viewClass !== undefined) this.view = new activeSheet.viewClass(name, this.sheets);
    else this.view = new TrekTableView(name, this.sheets);
    this.view.printInfo = this.printInfo;
  }

}
