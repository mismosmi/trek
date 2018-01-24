/*
 * Should contain all cached content of the database
 */
class TrekDatabase {
   let currentTable;

  /*
   * Construct TrekDatabase Object from data given in ajax payload
   */
  constructor(data) {
    currentTable = defaultTable;

    /*
     * append all table-data to the database-object
     */
    Object.assign(this, tableData);

    /*
     * add getter functions for direct access to properties of the current row
     */
    tableData[current].headers.forEach((col) => {
      Object.defineProperty(this, col.name, {
        get: () => {
          return this[current][col.name];
        } 
      });

      /*
       * if column type is foreign key -> acess the matching row via TrekTable.tablename.column
       */
      if (col.type === 1) {
        Object.defineProperty(this[current], col.table, {
          get: () => {
            return this[col.table][this[current][col.name]];
          }
        });
      } 
    });
  }

}


function Trek(userVars) {}
