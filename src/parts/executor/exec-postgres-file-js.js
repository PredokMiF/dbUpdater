"use strict";

var util = require('util');
var pg = require('pg');
var _ = require('lodash');

var debug = require("debug");
var logDev = debug('dbupdater:executor:postgresFileJs:dev');
var log = debug('dbupdater:executor:postgresFileJs:log');
var logWarn = debug('dbupdater:executor:postgresFileJs:warn');
var logErr = debug('dbupdater:executor:postgresFileJs:err');

var TaskExecAbstract = require('./exec-abstract');

/**
 * Выполняет JS файлы. Имена файлов должны соовпадать с регуляркой /^.*\.postgres\-file\-js\.js$/ т.е. файл должен заканчиваться на ".postgres-file-js.js"
 * внутри должен быть валидный NodeJS код. Можно использовать require. Сама задача должна быть оформлена в виде модуля и возвращать функцию с интерфейсом (dbClient, cb)
 * @example
 * // Имя файла 20150506-0053-grigorchuk.postgres-file-js.js
 * var _ = require('lodash');
 * module.exports = function (client, cb) {
 * var sql = 'CREATE TABLE "myyy" (' +
 *      '   name character varying(256) NOT NULL, ' +
 *      '   md5 character varying(128) NOT NULL, ' +
 *      '   executed timestamp without time zone NOT NULL DEFAULT now()' +
 *      ');';
 *      client.query(sql, cb);
 * };
 * @param {Object} config - параметры инициализации транспорта
 * @param {string} config.connString - строка подключения к БД
 * @returns {Executor.TaskExecPostgresFileJs}
 * @constructor
 * @augments Executor.TaskExecAbstract
 * @memberof Executor
 */
function TaskExecPostgresFileJs (config) {
    var self = this;

    if (self instanceof TaskExecPostgresFileJs === false) {
        return new TaskExecPostgresFileJs(config);
    }

    logDev = config.logDev || logDev;
    log = config.log || log;
    logWarn = config.logWarn || logWarn;
    logErr = config.logErr || logErr;

    self.config = config || {};
}

TaskExecPostgresFileJs.prototype = new TaskExecAbstract();

/**
 * Определяет принадлежность задачи этому executor'у (по имени задачи, применяя к нему регулярку /^.*\.postgres\-file\-js\.js$/ т.е. файл должен заканчиваться на ".postgres-file-js.js")
 * @abstract
 * @param {string} taskName - имя задачи
 * @returns {boolean} - результат, подходит ли этот формат под задачу (true - значит что этот executor будет выполнять эту задачу, при false продолжится поиск подходящего executor'а)
 */
TaskExecPostgresFileJs.prototype.matchType = function (taskName) {
    var match = !!taskName.match(/^.*\.postgres\-file\-js\.js$/);
    if (match) {
        logDev(util.format('ExecPGFileJS Задача %s совпала с executor`ом exec-postgres-file-js', taskName));
    }
    return match;
};

/**
 * Выполняет файл.
 * @param {object} toExecuteTask - выполняемая задача
 * @param {string} toExecuteTask.name - имя выполенной задачи
 * @param {string} toExecuteTask.md5 - контрольная сумма текста задачи
 * @param {string} text - текст задачи
 * @param {function} cb - колбэк выполнения задачи
 * @param {?Error} cb.err - ошибка выполнения
 */
TaskExecPostgresFileJs.prototype.execute = function (toExecuteTask, text, cb) {
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
        logDev('ExecPGFileJS DB connected');

        try {
            logDev('ExecPGFileJS executing js code:\n' + text);

            require(toExecuteTask.fullPath)(client, function (err) {
                done();
                cb(err);
            });
        } catch (e) {
            done();
            cb(e);
        }
    });
};

module.exports = TaskExecPostgresFileJs;