"use strict";

var debug = require("debug");
var logDev = debug('dbupdater:executor:abstract:dev');
var logLog = debug('dbupdater:executor:abstract:log');
var logWarn = debug('dbupdater:executor:abstract:warn');
var logErr = debug('dbupdater:executor:abstract:err');

/** @namespace Executor */

/**
 * Абстрактный шаблон executor'а. Определяет интерфейс основных методов: matchType и execute.
 * Нужно наследоваться от этого класса<br/>MyCoolExecutor.prototype = new TaskExecAbstract();<br/>
 * Так можно создать свой формат для выполнения задач
 * @constructor
 * @memberof Executor
 */
function TaskExecAbstract () {}

TaskExecAbstract.prototype = {

    /**
     * Определяет принадлежность задачи этому executor'у (по имени задачи)
     * @abstract
     * @param {string} taskName - имя задачи
     * @returns {boolean} - результат, подходит ли этот формат под задачу (true - значит что этот executor будет выполнять эту задачу, при false продолжится поиск подходящего executor'а)
     */
    matchType: function (taskName) {
        return false;
    },

    /**
     * Выполняет задачу
     * @param {object} toExecuteTask - выполняемая задача
     * @param {string} toExecuteTask.name - имя выполенной задачи
     * @param {string} toExecuteTask.md5 - контрольная сумма текста задачи
     * @param {string} text - текст задачи
     * @param {function} cb - колбэк выполнения задачи
     * @param {?Error} cb.err - ошибка выполнения
     */
    execute: function (toExecuteTask, text, cb) {
        var err = new Error('TaskExecAbstract.execute must be implemented by subclass!');
        logErr(err);
        cb(err);
    }

};

module.exports = TaskExecAbstract;