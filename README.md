# trek
A minimalistic framework for web based database management

## Database
All data is stored in a mariadb (mysql-compatible) database. Settings are available in config.php.

## Backend
For maximum compatibility the backend is written in php. It only supports specific API calls. It will be kept as minimalistic as possible.

## Frontend
The frontend is written in javascript and jquery. As for version 1 Bootstrap is used for styling. In later versions Bootstrap should be replaced by a simpler CSS-only framework.

## Table magic
Tables can have javascript-based columns call AutoColumns. Column javascript code can be easily entered and has access to two important variables: `rv` (row values) and `tv` (table values). They work as follows:
`rv.<column name>` gives the value of cell `<column name>` in the current row.
`rv.<table name>.<column name>` gives the value of column `<column name>` of a row in table `<table name>` referenced by a foreign key in the current row,
`tv[<index>].<column>` gives the value of `<column>` in the row with id `<index>` in the current table,
`tv[<index>].<table>.<column>` gives the value of `<column>` of a row in table `<table>` referenced by foreign key in row `<index>` in the current table,
`tv.<table>[<index>].<column>` gives the value of `<column>` of row with id `<index>` ind table `<table>` and finally
```
tv.each(function(id,value){
// your code here
});
```
iterates over all rows up until the row before the current one.
AutoColumn code can be single line, e.g.
```
rv.entrydate
```
would be sufficient to duplicate the date an entry was last modified, or they can be multiline with a return value, e.g.
```
var sum = 0;
tv.each(function(id,row){
  sum += row.price;
});
return sum;
```
these values are constantly recalculated.

## Goals for 1.0
## Goals for 2.0
