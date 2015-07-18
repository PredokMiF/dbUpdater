"use strict";

var fs = require('fs');
var util = require('util');
var pg = require('pg');
var _ = require('lodash-node');

var debug = require("debug");
var logDev = debug('dbUpdater:saver:postgres:dev');
var log = debug('dbUpdater:saver:postgres:log');
var logWarn = debug('dbUpdater:saver:postgres:warn');
var logErr = debug('dbUpdater:saver:postgres:err');

var TaskSaverAbstract = require('./saver-abstract');

var DEF_CONFIG = {
    dbTable: 'tasks'
};

/**
 * Транспорт фиксации задач для PostgreSQL. Создается таблица config.dbTable и в ней фиксируются выполненные задачи
 * @param {object} config - параметры инициализации транспорта
 * @param {string} [config.dbTable=tasks] - имя таблицы в БД, куда будут записываться все выполненные апдейты
 * @param {string} config.connString - строка подключения к БД
 * @returns {Saver.TaskSaverPostgreSQL}
 * @constructor
 * @augments Saver.TaskSaverAbstract
 * @memberof Saver
 */
function TaskSaverPostgreSQL (config) {
    var self = this;

    if (self instanceof TaskSaverPostgreSQL === false) {
        return new TaskSaverPostgreSQL(config);
    }

    self.config = _.defaults(config || {}, DEF_CONFIG);
    logDev('Config %j', self.config);
}

TaskSaverPostgreSQL.prototype = new TaskSaverAbstract();

/**
 * Метод инициализирующий транспорт. Проверяет коннект, создает таблицу в БД, если её нет.
 * @param {function} cb - колбэк инициализации
 * @param {?Error} cb.err - Ошибка инициализации
 */
TaskSaverPostgreSQL.prototype.init = function init (cb) {
    var self = this,
        client,
        err;

    if (!self.config.connString) {
        err = new Error('parametr "connString" is not set at taskSaver_postgresql config');
        logErr(err);
        cb(err);
        return;
    }

    client = new pg.Client(self.config.connString);
    client.connect(function(err) {
        if(err) {
            client.end();
            logErr(err);
            cb(err);
            return;
        }
        logDev('DB connected');

        client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';", function(err, result) {
            var sql;

            if(err) {
                client.end();
                logErr(err);
                cb(err);
                return;
            }
            if (_.findIndex(result.rows, 'table_name', self.config.dbTable) === -1) {
                logDev('Task table "%s" not found, need to create it', self.config.dbTable);
                // Нужно добавить табличку

                sql = util.format('CREATE TABLE "%s" (' +
                    '   name character varying(256) NOT NULL, ' +
                    '   md5 character varying(128) NOT NULL, ' +
                    '   executed timestamp without time zone NOT NULL DEFAULT now(),' +
                    '   PRIMARY KEY (name)' +
                    ');',
                    self.config.dbTable
                );

                client.query(sql, function(err, result) {
                    if(err) {
                        client.end();
                        logErr(err);
                        cb(err);
                        return;
                    }

                    log('Task table "%s" is created', self.config.dbTable);
                    client.end();
                    cb();
                });

            } else {
                // Табличка есть, все ок
                client.end();
                logDev('Task table "%s" founded', self.config.dbTable);
                cb();
            }
        });
    });
};

/**
 * Получает список выполненных задач из БД
 * @param {function} cb - колбэк получения списка ваполненныз задач
 * @param {?Error} cb.err - ошибка выполнения
 * @param {?object[]} cb.tasks - Массив выполненных задач
 * @param {string} cb.tasks.name - имя выполненной задачи
 * @param {string} cb.tasks.md5 - md5 сумма выполненной задачи (защита от подмены/изменения)
 * @param {string} cb.tasks.executed - когда была выполнен задача
 */
TaskSaverPostgreSQL.prototype.getTasks = function taskSaverInit (cb) {
    var self = this,
        client;

    client = new pg.Client(self.config.connString);
    client.connect(function(err) {
        var sql;

        if (err) {
            client.end();
            logErr(err);
            cb(err);
            return;
        }
        logDev('DB connected');

        sql = util.format('SELECT "name", "md5", "executed" FROM "%s"', self.config.dbTable);
        client.query(sql, function (err, result) {
            if (err) {
                client.end();
                logErr(err);
                cb(err);
                return;
            }

            // Убираем промежуточные данные и формируем ISO строку
            result = _.map(result.rows, function (el) {
                el.executed = el.executed.toISOString();
                return el;
            });

            client.end();
            logDev('Executed tasks %j', result);
            cb(null, result);
        });
    });
};

/**
 * Записать в БД, что задача была выполнена
 * @param {object} task - выполненная задача
 * @param {string} task.name - имя выполенной задачи
 * @param {string} task.md5 - контрольная сумма текста задачи
 * @param {function} cb - колбэк записи задачи в БД
 * @param {?Error} cb.err - ошибка записи
 */
TaskSaverPostgreSQL.prototype.logExecutedTask = function (task, cb) {
    var self = this,
        client;

    client = new pg.Client(self.config.connString);
    client.connect(function(err) {
        var sql;

        if (err) {
            client.end();
            logErr(err);
            cb(err);
            return;
        }
        logDev('DB connected');

        sql = util.format('INSERT INTO "%s" (name, md5) VALUES ($1, $2);', self.config.dbTable);
        client.query(sql, [task.name, task.md5], function (err, result) {
            if (err) {
                client.end();
                logErr(err);
                cb(err);
                return;
            }

            client.end();
            cb(null, result);
        });
    });
};

module.exports = TaskSaverPostgreSQL;