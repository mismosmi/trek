# trek
A minimalistic framework for web based database management

## Database
All data is stored in a mariadb (mysql-compatible) database. Settings are available in config.php.

## Backend
A clean and minimalistic php-backend consisting of:
+ SqlDb: manages database access
+ Api: handles ajax calls
+ Page: renders page head, navigation and other common elements
+ Database: contains tables and views
+ Table: contains table information (Columns)
+ View: a view into one or more tables without its own sql table

## Frontend
A very minimalistic frontend based on [bulma.io](bulma.io) for style and javascript/jquery for:
+ api calls in ajax on table insert and alter operations
+ injecting returned data
+ switching between tables as tabs
+ filters
+ automatic suggestions for filters and data input

## Calculated fields
Fields can contain arbitrary calculations passed to Table-instances as anonymous php-functions.

These functions can access all values in the same record or a record referenced by 
a foreign id as `$tablename->columnname`

## Roadmap
### Goals for 1.0
- use bulma.io framework for styling
- Database access should be working and very stable
- views should make it easy to implement arbitrary calculations
- easy filters should be available for all columns
- automatic suggestions while typing should speed up entering data and filtering

## Long term goals
- move to nodejs-backend, server-side rendering and caching for calculated values
- user management
- encryption using [cryptico](https://wwwtyro.github.io/cryptico/)?


