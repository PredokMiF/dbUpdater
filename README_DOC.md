# dbupdater

Данный модуль предназначен для выполнение разнообразных действий (задач) при старте проекта.
Главной особенность задачи в том, что она обязательно должна быть выполнена и только один раз.
Наиболее частое применение - обновление БД из заранее подготовленых файлов.
Например, есть несколько SQL скриптов которые должны быть последовательно выполнены, после чего можно стартовать приложение.
<br/>
Во время разработки появляются изменения в БД, которые должны быть выполнены на каждом сервере - мы добавляем соответствующие SQL скрипты (задачи)
и знаем, что перед стартом приложения БД будет обновлена (если этого еще не сделано). Это особенно актуально при большом количестве серверов.
Некоторые могут назвать этот механизм "миграцией", на мой взгляд это не она, а сонхронизация структуры БД.

## Инсталяция

Using npm:

```bash
$ npm install --save dbupdater
```

In Node.js/io.js:

```js
var DbUpdater = require('dbupdater');
var dbConnStr = 'postgres://user:pass@localhost/dbName';

var dbupdater = DbUpdater({
     taskReader: DbUpdater.TaskReaderFile(/*{path: 'tasks'}*/),
     taskSaver: DbUpdater.TaskSaverPostgreSQL({connString: dbConnStr/*, dbTable: 'tasks'*/}),
     taskExecutors: [
         DbUpdater.TaskExecPostgresFileJs({connString: dbConnStr}),
         DbUpdater.TaskExecPostgresFileSql({connString: dbConnStr})
     ]
});

dbupdater.init(function (err) {
     if (err) {
         console.error('dbupdater: ' + err);
     } else {
         console.log('dbupdater done success!');
     }
});
```

JS задача
```js
// Имя файла tasks/20150506-0053-grigorchuk.postgres-file-js.js
var _ = require('lodash');
module.exports = function (client, cb) {
var sql = 'CREATE TABLE "myyy" (' +
     '   name character varying(256) NOT NULL, ' +
     '   md5 character varying(128) NOT NULL, ' +
     '   executed timestamp without time zone NOT NULL DEFAULT now()' +
     ');';
     client.query(sql, cb);
};
```

SQL задача
```sql
-- Имя файла tasks/20150520-2359-grigorchuk.postgres-file-sql.sql
ALTER TABLE myyy ADD COLUMN id serial NOT NULL;
ALTER TABLE myyy ADD PRIMARY KEY (id);
```