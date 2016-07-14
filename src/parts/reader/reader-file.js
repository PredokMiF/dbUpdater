"use strict";

var fs = require('fs');
var path = require('path');
var util = require('util');
var _ = require('lodash');
var async = require('async');
var md5 = require('md5');

var debug = require("debug");
var logDev = debug('dbupdater:reader:file:dev');
var log = debug('dbupdater:reader:file:log');
var logWarn = debug('dbupdater:reader:file:warn');
var logErr = debug('dbupdater:reader:file:err');

var TaskReaderAbstract = require('./reader-abstract');

var DEF_CONFIG = {
    path: 'tasks'
};


/**
 * Транспорт чтения задач для dbupdater'а из файловой системы 
 * @param {object} [config] - параметры инициализации транспорта
 * @param {string} [config.path=tasks] - путь к папке с файлама задач
 * @returns {Reader.TaskReaderFile}
 * @constructor    
 * @augments Reader.TaskReaderAbstract
 * @memberof Reader
 */
function TaskReaderFile (config) {
    var self = this;

    if (self instanceof TaskReaderFile === false) {
        return new TaskReaderFile(config);
    }

    logDev = config.logDev || logDev;
    log = config.log || log;
    logWarn = config.logWarn || logWarn;
    logErr = config.logErr || logErr;

    self.config = _.defaults(config || {}, DEF_CONFIG);
}

TaskReaderFile.prototype = new TaskReaderAbstract();

/**
 * Метод инициализирующий транспорт. Создает папку, если её нет.
 * @param {function} cb - колбэк инициализации
 * @param {?Error} cb.err - Ошибка инициализации
 */
TaskReaderFile.prototype.init = function (cb) {
    var self = this;

    fs.stat(self.config.path, function (err, stat) {
        if (err && err.code === 'ENOENT') {
            logDev(util.format('ReaderFile Tasks dir not found, create it: "%s"', self.config.path));
            fs.mkdir(self.config.path, function (err) {
                if (err) {
                    logErr(err);
                    cb(err);
                } else {
                    log(util.format('ReaderFile Tasks dir "%s" created', self.config.path));
                    cb();
                }
            });

        } else if (err) {
            logErr(err);
            cb(err);
        } else if (stat.isDirectory()) {
            logDev(util.format('ReaderFile Tasks dir "%s" is existing', self.config.path));
            cb();
        } else {
            err = new Error(util.format('ReaderFile Tasks dir "%s" must be a directory', self.config.path));
            logErr(err);
            cb(err);
        }
    });
};

/**
 * Получает список всех задач в папке
 * @param {function} cb - колбэк получения списка задач из хранилища
 * @param {?Error} cb.err - ошибка выполнения
 * @param {?object[]} cb.tasks - Массив файлов в папке
 * @param {string} cb.tasks.name - имя файла
 * @param {string} cb.tasks.md5 - md5 сумма файла
 */
TaskReaderFile.prototype.getTasks = function getTasks (cb) {
    var self = this;

    fs.readdir(self.config.path, function (err, files) {
        if (err) {
            logErr(err);
            cb(err);
            return;
        }

        async.mapLimit(files.sort(), 5, mapiterator, mapResult);

        function mapiterator (fileName, next) {
            fs.readFile(path.join(self.config.path, fileName), function(err, text) {
                if (err) {
                    next(err);
                    return;
                }
                next(null, {name: fileName, md5: md5(text)});
            });
        }

        function mapResult (err, result) {
            if (err) {
                logErr(err);
            } else {
                logDev(util.format('ReaderFile Redy to execute tasks %j', result));
            }
            cb(err, result)
        }
    });
};

/**
 * Получить текст задачи (файла)
 * @param {object} task - задача
 * @param {string} task.name - имя файла
 * @param {string} task.md5 - контрольная сумма файла
 * @param {function} cb - колбэк чтения файла из папки
 * @param {?Error} cb.err - ошибка чтения
 * @param {?String} cb.text - содержимое файла
 */
TaskReaderFile.prototype.getText = function (task, cb) {
    var self = this;

    task.fullPath = path.resolve(path.join(self.config.path, task.name));
    fs.readFile(task.fullPath, function (err, text) {
        if (err) {
            logErr(err);
        }
        cb(err, text.toString());
    });
};

module.exports = TaskReaderFile;