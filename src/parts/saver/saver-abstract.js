"use strict";

var debug = require("debug");
var logErr = debug('dbupdater:saver:abstract:err');

/** @namespace Saver */

/**
 * Абстрактный шаблон saver'а. Определяет интерфейс основных методов: init, getTasks и logExecutedTask.
 * Нужно наследоваться от этого класса<br/>MyCoolSaver.prototype = new TaskSaverAbstract();<br/>
 * Так можно создать свой адаптер для хранения выполненных задач
 * @constructor
 * @memberof Saver
 */
function TaskSaverAbstract () {}

TaskSaverAbstract.prototype = {

    /**
     * Инициализация адаптера
     * @abstract
     * @param {function} cb - колбэк инициализации
     * @param {?Error} cb.err - Ошибка инициализации
     */
    init: function init (cb) {
        var err = new Error('TaskSaverAbstract.init must be implemented by subclass!');
        logErr(err);
        cb(err);
    },

    /**
     * Получает список выполненных задач
     * @abstract
     * @param {function} cb - колбэк получения списка ваполненныз задач
     * @param {?Error} cb.err - ошибка выполнения
     * @param {object[]} [cb.tasks] - Массив выполненных задач
     * @param {string} cb.tasks.name - имя выполненной задачи
     * @param {string} cb.tasks.md5 - md5 сумма выполненной задачи (защита от подмены/изменения)
     * @param {string} cb.tasks.executed - когда была выполнен задача
     */
    getTasks: function taskSaverInit (cb) {
        var err = new Error('TaskSaverAbstract.getTasks must be implemented by subclass!');
        logErr(err);
        cb(err);
    },

    /**
     * Зафиксировать, что задача была выполнена
     * @abstract
     * @param {object} task - выполненная задача
     * @param {string} task.name - имя выполенной задачи
     * @param {string} task.md5 - контрольная сумма текста задачи
     * @param {function} cb - колбэк записи задачи в хранилище
     * @param {?Error} cb.err - ошибка записи
     */
    logExecutedTask: function (task, cb) {
        var err = new Error('TaskSaverAbstract.logExecutedTask must be implemented by subclass!');
        logErr(err);
        cb(err);
    }

};

module.exports = TaskSaverAbstract;