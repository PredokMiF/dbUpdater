﻿"use strict";

var fs = require('fs');
var path = require('path');
var util = require('util');
var _ = require('lodash-node');
var async = require('async');
var md5 = require('MD5');

var debug = require("debug");
var logDev = debug('dbUpdater:reader:file:dev');
var log = debug('dbUpdater:reader:file:log');
var logWarn = debug('dbUpdater:reader:file:warn');
var logErr = debug('dbUpdater:reader:file:err');

var TaskReaderAbstract = require('./reader-abstract');

var DEF_CONFIG = {
    path: 'tasks'
};


/**
 * Транспорт чтения задач для dbUpdater'а из файловой системы 
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

    self.config = _.defaults(config || {}, DEF_CONFIG);
    logDev('Config %j', self.config);
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
            logDev('Tasks dir not found, create it: "%s"', self.config.path);
            fs.mkdir(self.config.path, function (err) {
                if (err) {
                    logErr(err);
                    cb(err);
                } else {
                    log('Tasks dir "%s" created', self.config.path);
                    cb();
                }
            });

        } else if (err) {
            logErr(err);
            cb(err);
        } else if (stat.isDirectory()) {
            logDev('Tasks dir "%s" is existing', self.config.path);
            cb();
        } else {
            err = new Error(util.format('Tasks dir name "%s" is used for non directory file type', self.config.path));
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
                logDev('Redy to execute tasks %j', result);
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