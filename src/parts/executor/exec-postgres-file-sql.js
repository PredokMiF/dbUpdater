"use strict";

var util = require('util');
var pg = require('pg');
var _ = require('lodash-node');

var debug = require("debug");
var logDev = debug('dbUpdater:executor:postgresFileSql:dev');
var logLog = debug('dbUpdater:executor:postgresFileSql:log');
var logWarn = debug('dbUpdater:executor:postgresFileSql:warn');
var logErr = debug('dbUpdater:executor:postgresFileSql:err');

var TaskExecAbstract = require('./exec-abstract');

/**
 * Выполняет SQL файлы. Имена файлов должны соовпадать с регуляркой /^.*\.postgres\-file\-sql\.sql$/ т.е. файл должен заканчиваться на ".postgres-file-sql.sql"
 * внутри должен быть валидный SQL код.
 * @example
 * // Имя файла 20150520-2359-grigorchuk.postgres-file-sql.sql
 * ALTER TABLE myyy ADD COLUMN id serial NOT NULL;
 * ALTER TABLE myyy ADD PRIMARY KEY (id);
 * @param {Object} config - параметры инициализации транспорта
 * @param {string} config.connString - строка подключения к БД
 * @returns {Executor.TaskExecPostgresFileSql}
 * @constructor
 * @augments Executor.TaskExecAbstract
 * @memberof Executor
 */
function TaskExecPostgresFileSql(config) {
    var self = this;

    if (self instanceof TaskExecPostgresFileSql === false) {
        return new TaskExecPostgresFileSql(config);
    }

    self.config = config || {};
    logDev('Config %j', self.config);
}

TaskExecPostgresFileSql.prototype = new TaskExecAbstract();

/**
 * Определяет принадлежность задачи этому executor'у (по имени задачи, применяя к нему регулярку /^.*\.postgres\-file\-sql\.sql$/ т.е. файл должен заканчиваться на ".postgres-file-sql.sql")
 * @abstract
 * @param {string} taskName - имя задачи
 * @returns {boolean} - результат, подходит ли этот формат под задачу (true - значит что этот executor будет выполнять эту задачу, при false продолжится поиск подходящего executor'а)
 */
TaskExecPostgresFileSql.prototype.matchType = function (taskName) {
    var match = !!taskName.match(/^.*\.postgres\-file\-sql\.sql$/);
    if (match) {
        logDev(util.format('Задача %s совпала с executor`ом exec-postgres-file-sql', taskName));
    }
    return match;
};

/**
 * Выполняет SQL запрос из файла.
 * @param {object} toExecuteTask - выполняемая задача
 * @param {string} toExecuteTask.name - имя выполенной задачи
 * @param {string} toExecuteTask.md5 - контрольная сумма текста задачи
 * @param {string} text - текст задачи
 * @param {function} cb - колбэк выполнения задачи
 * @param {?Error} cb.err - ошибка выполнения
 */
TaskExecPostgresFileSql.prototype.execute = function (toExecuteTask, text, cb) {
    var self = this,
        client;

    if (!self.config.connString) {
        cb(new Error('parametr "connString" is not set at taskSaver_postgresql config'));
        return;
    }

    pg.connect(self.config.connString, function(err, client, done) {
        if (err) {
            done();
            cb(err);
            return;
        }
        logDev('DB connected');

        try {
            logDev('executing SQL code:\n' + text);

            client.query(text, function (err) {
                done();
                cb(err);
            });
        } catch (e) {
            done();
            cb(e);
        }
    });
};

module.exports = TaskExecPostgresFileSql;