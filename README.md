# trek
A minimalistic framework for web based database management

## Database
All data is stored in a mariadb (mysql-compatible) database. Settings are available in config.php.

## Backend
A clean and minimalistic php-backend consisting of:
+ SqlDb: library manages database access
+ RestApi: library handles ajax calls
+ Page: library renders page head, navigation and other common elements
+ Database: library renders database specific elements and passes data inline to js
+ api: outputs json answers using RestApi
+ db: outputs database pages using Database
+ initDb: issues SQL commands to create necessary tables

## Frontend
A very minimalistic frontend based on [bulma.io](bulma.io) for style and javascript/jquery for:
+ api calls in ajax on table insert and alter operations
+ injecting returned data
+ switching between tables as tabs
+ filters
+ automatic suggestions for filters and data input


## Database definition
Databases can be defined in a json format. Simply create `<database name>.json`. It should contain an object with the following fields:
```
{
    "name": (unique) database name (required),
    "title": a title that is displayed in frontend (required),
    "users": true -> the database has a simple user entry on every table referencing a separate 'user'-table (default: false),
    "order": [
        array of sheet names that defines in which order sheets should be displayed
    ]
    "sheets": {
        <sheet name>: {
            "type": one of the following: [table, report] (default: table),
            in case type is table it needs either
            "column_reference": name of a sheet from where to copy the column definitions
            or
            "columns": [
                columns is an array of objects that necessarily have the field class and a number of other fields depending on the class
                use any of the following class-0 (Meta-)Columns, which will generally be created in any table but ignored in frontend if not explicitly specified:
                {
                    "class": 0,
                    "name": "id",
                    "title": title for the ID column (required),
                    "barcode": can have the values: [
                        "ean": the user will be able to use an ean product barcode as synonym for this id,
                        "auto": an automatic code128 will be generated for printing that can be used as synonym for this id
                    ] (default: none),
                },
                {
                    "class": 0,
                    "name": "createdate",
                    "title": a title for the create date column (required)
                },
                {
                    "class": 0,
                    "name": "modifieddate",
                    "title": a title for the modified date column (required)
                },
                use any number of the following other types of columns:
                { Data Column holds data
                    "class": 1,
                    "name": (table internally unique) column name (required),
                    "title": column title (required),
                    "type": one of the following: [string, int, float, euro] (required),
                    "required": true or false (default: false)
                },
                { Auto Column contains javascript logic
                    "class": 2,
                    "name": (table internally unique) column name (required),
                    "title": a column title (required),
                    "type": one of the following: [string, int, float, euro] (required),
                    "js": javascript code: this is always a function of (tv, id) where tv is an object of type TrekTableModel and provides the api to access all table data (required)
                },
                { Foreign Key Column contains referenced table ids
                    "class": 3,
                    "table": name of the referenced table (required),
                    "title": a column title (required)
                }
            ]
    }
}
```
    

                
                    

                

