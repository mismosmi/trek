/*
 * Should contain all cached content of the database
 */
class TrekDatabase {
  let currentRow = 0;
  let nextRow = 1;


  /*
   * Construct TrekDatabase Object from data given in ajax payload
   */
  constructor(tableData) {

    // append all table-data to the database-object
    Object.assign(this, tableData);

    // find row index of future new row
    this.nextRow = tableData.length;
    this.currentRow = nextRow - 1;

    // add getter functions for direct access to properties of the current row
    this.headers.forEach((col) => {
      Object.defineProperty(this, col.name, {
        get: () => {
          return this[currentRow][col.name];
        }
      });
    });
  }

  /*
   * Update Data for specific Rows from data given in ajax payload
   */
  update(tableData) {
    Object.assign(this, tableData);
  }

  /*
   * Loop over all Rows
   */
  forEach(doThis) {
    for (var i = 0; i < this.currentRow; i++) {
      doThis(this[index],index);
    }
  }
    


}


class Trek {
  let tableBody = $('.trek-table body');
  let ajaxUrl = window.location.href; 

  constructor(userVars) {
  }
}

