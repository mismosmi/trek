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
      const newButton = document.createElement('span');
      newButton.classList.add('button', 'is-fullwidth', 'is-primary', 'is-loading');
      newButton.textContent = 'Add to ' + this.sheets[model.name].title;
      newColumn.appendChild(newButton);
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
              const td = this.formRow.querySelector('td[data-col="'+col.name+'"]');
              if (val !== td.textContent) td.textContent = val;
          }
        });
      };
    });

    



      



    this.clear = () => {};
  }
}
