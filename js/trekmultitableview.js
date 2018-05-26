"use strict";

class TrekMultiTableView {

  constructor(name, sheets) {
    this.sheets = sheets;
    this.name = name;
    this.models = [];
    // columns is a set of the 'table'-column that shows which table a row belongs to
    // and all columns in all used tables
    this.columns = new Set([{name: 'table', class: 0, type: 'string', symbol: ''}]);
    this.sheets[this.name].tables.forEach( (table) => {
      this.models.push(this.sheets[table].model) 
      this.sheets[table].model.columns.forEach( col => this.columns.add(col) );
    });

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

    this.newRow = document.createElement('tr');
    const newTd = document.createElement('td');
    newTd.colSpan = this.columns.size + 1;
    this.newRow.appendChild(newTd);
    const newColumnsLayout = document.createElement('div');
    newColumnsLayout.classList.add('columns', 'is-centered');
    newTd.appendChild(newColumnsLayout);
    // calculate how many of 12 columns a "new"-button will be wide
    const w = Math.floor(12/this.models.length);

    this.models.forEach( (model) => {
      const newColumn = document.createElement('div');

      newColumn.classList.add('column', 'is-' + w);
      newColumn.setAttribute('data-table', model.name);
      newColumn.id = '';
      newColumnsLayout.appendChild(newColumn);
      this.newButton = document.createElement('span');
      this.newButton.classList.add('button', 'is-fullwidth', 'is-primary', 'is-loading');
      this.newButton.textContent = 'Add to ' + this.sheets[model.name].title;
      newColumn.appendChild(this.newButton);
      newColumn.addEventListener('click', (event) => this.edit(event));
    });

    // set initial order
    this.order = {
      ascending: false,
      column: {name: 'id'}
    }

    this.editMode = false;
    this.filterMode = false;

    // generate initial table content
    this.head.innerHTML = '';
    //this.head.appendChild(this.getHeadRow());

    // push url
    const url = new URL(document.location.href);
    url.searchParams.set('sheet', this.name);
    const modelNames = 
    window.history.pushState({
      viewClass: this.constructor.name,
      tables: this.sheets[this.name].tables.join(', '),
      lastUpdates: this.models.map( model => model.lastUpdate ? model.lastUpdate : 0 ),
      viewTarget: 'web'
    }, '', url.pathname + url.search);

    // set callback actions
    this.models.forEach( (model) => {
      model.onBufferChanged = (buffer) => {
        model.columns.forEach( (col) => {
          switch (col.class) {
            case 2: // Auto Column
              const val = this.getDisplayFormat(buffer[col.name]);
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

      model.onRowDeleted = (id) => {
        this.body.removeChild(document.getElementById(model.name + '-' + id));
      };

      model.onRowAdded = (id) => {
        const sortedData = this.getSortedData();
        const next = sortedData.indexOf(model.data[id]) + 1;
        if (sortedData[next] === undefined) this.body.appendChild(this.getRow(model, id));
        else this.body.insertBefore(this.getRow(model, id), this.body.childNodes[next]);
      };

      model.onRowChanged = (id) => {
        const tr = document.getElementById(model.name + '-' + id);
        this.body.replaceChild(this.getRow(model, id), tr);
      };

      model.onHideRow = id => document.getElementById(model.name + '-' + id).style.display = 'none';
      model.onShowRow = id => document.getElementById(model.name + '-' + id).style.display = '';

      model.syncTimeout = true;
      setTimeout( () => model.sync(false, () => {
        model.forAll( row => row.table = model.name );
        this.repaint();
      }));

    });

    // add Keyboard shortcuts
    const keyAction = (event) => {
      if (this.formRow === undefined) { // no active form
        if (this.editMode) { // edit mode, no active form
          switch (event.key) {
            case 'Escape':
              this.exitEditMode();
              return;
          }
        } else if (this.filterMode) { // filter mode
          switch (event.key) {
            case 'Escape':
              // TODO implement this
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
    };

    document.addEventListener('keyup', keyAction);
    


    this.clear = () => {
      this.editButton.setAttribute('disabled', true);
      this.editButton.removeEventListener('click', editFn);
      this.models.forEach( model => model.clear() );
      document.removeEventListener('keyup', keyAction);
    };
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

    const allData = [];
    this.models.forEach( model => allData.push(...Object.values(model.data).filter( row => typeof row === 'object' )) );
    return allData.sort(sortFn); // apply sort
  }

  repaint() {
    this.newButton.classList.remove('is-loading');
    this.body.innerHTML = '';
    this.body.appendChild(this.newRow);
    this.getSortedData().forEach( (row) => {
      this.body.appendChild(this.getRow(this.sheets[row.table].model, row.id));
    });
  }

  getDisplayFormat(col, row) {
    const val = row[col.name];
    switch (col.type) {
      case 'euro':
        if (val === 0 || val) return (val * (10**-4)).toFixed(2);
        else return '0.00';
      default:
        if (val === 0 || val) return val;
        else return '';
    }
  }

  getRow(model, id) {
    const tr = document.createElement('tr');
    tr.id = model.name + '-' + id;
    tr.setAttribute('data-table', model.name);
    model.at(id);
    this.columns.forEach( (col) => {
      const val = this.getDisplayFormat(col, model.data[id]);
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

  getHeadRow(sorting = true) {
    const getIcon = (selected = false, ascending = false) => ` <span class="icon"><i class="fas fa-caret${selected ? '-square' : ''}-${ascending ? 'up' : 'down'}"></i></span>`;
    const tr = document.createElement('tr');
    if (this.editMode) {
      this.columns.forEach( (col) => {
        const th = document.createElement('th');
        const spacer = document.createElement('div');
        spacer.classList.add('trek-column', 'trek-column-' + col.type);
        spacer.innerHTML = '&nbsp;';
        th.appendChild(spacer);
        
        //th.colSpan = this.getColSpan(col);
        th.classList.add('is-unselectable');
        th.appendChild(document.createTextNode(col.title));
        if (this.order.column === col) th.innerHTML += getIcon(true, this.order.ascending);
        tr.appendChild(th);
      });
    } else {
      // column headers and sorting functions
      this.columns.forEach( (col) => {
        const th = document.createElement('th');
        
        const spacer = document.createElement('div');
        spacer.classList.add('trek-column', 'trek-column-' + col.type);
        spacer.innerHTML = '&nbsp;';
        th.appendChild(spacer);
        //th.colSpan = this.getColSpan(col);
        const a = document.createElement('a');
        a.classList.add('is-unselectable');
        a.innerHTML = col.title;
        if (this.order.column === col) {
          // switch order
          a.addEventListener('click', () => { 
            this.order.ascending = !this.order.ascending;
            this.head.innerHTML = '';
            this.head.appendChild(this.getHeadRow());
            this.models.forEach( model => setTimeout( () => model.sync(false, () => this.repaint() ) ) );
          });
          a.innerHTML += getIcon(true, this.order.ascending);
        } else {
          // sort by this column
          a.addEventListener('click', () => {
            this.order = {
              column: col,
              ascending: false
            };
            this.head.innerHTML = '';
            this.head.appendChild(this.getHeadRow());
            setTimeout( () => {
              this.model.sync(false, () => this.repaint() );
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
          this.applyFilters();
        });
        input.addEventListener('click', (event) => {
          if (event.layerX > input.offsetWidth - 20) {
            input.value = '';
            p.classList.remove('has-icons-right');
            deleteIcon.style.display = 'none';
            col.filterValue = input.value;
            this.applyFilters();
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

  getFormRow(model, id) {}
  applyFilters() {}
}
