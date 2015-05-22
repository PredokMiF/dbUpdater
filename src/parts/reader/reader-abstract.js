"use strict";

var debug = require("debug");
var logErr = debug('dbUpdater:reader:abstract:err');

/** @namespace Reader */

/**
 * Абстрактный шаблон reader'а. Определяет интерфейс основных методов: init, getTasks и getText.
 * Нужно наследоваться от этого класса<br/>MyCoolReader.prototype = new TaskReaderAbstract();<br/>
 * Так можно создать свой адаптер для чтени задач из хранидища
 * @constructor
 * @memberof Reader
 */
function TaskReaderAbstract () {}

TaskReaderAbstract.prototype = {

    /**
     * Инициализация адаптера
     * @abstract
     * @param {function} cb - колбэк инициализации
     * @param {?Error} cb.err - Ошибка инициализации
     */
    init: function init (cb) {
        var err = new Error('TaskReaderAbstract.init must be implemented by subclass!');
        logErr(err);
        cb(err);
    },

    /**
     * Получает список всех задач в хранилище
     * @abstract
     * @param {function} cb - колбэк получения списка задач из хранилища
     * @param {?Error} cb.err - ошибка выполнения
     * @param {?object[]} cb.tasks - Массив задач в хранилище
     * @param {string} cb.tasks.name - имя задачи
     * @param {string} cb.tasks.md5 - md5 сумма задачи
     */
    getTasks: function taskSaverInit (cb) {
        var err = new Error('TaskReaderAbstract.getTasks must be implemented by subclass!');
        logErr(err);
        cb(err);
    },

    /**
     * Получить текст задачи
     * @abstract
     * @param {object} task - задача
     * @param {string} task.name - имя задачи
     * @param {string} task.md5 - контрольная сумма задачи
     * @param {function} cb - колбэк чтения задачи из хранилища
     * @param {?Error} cb.err - ошибка чтения
     * @param {?String} cb.text - текст задачи
     */
    getText: function (task, cb) {
        var err = new Error('TaskReaderAbstract.getText must be implemented by subclass!');
        logErr(err);
        cb(err);
    }

};

module.exports = TaskReaderAbstract;