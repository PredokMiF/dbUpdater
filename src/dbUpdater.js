var util = require('util');
var async = require('async');
var _ = require('lodash');

var debug = require("debug");
var logDev = debug('dbupdater:dev');
var log = debug('dbupdater:log');
var logWarn = debug('dbupdater:warn');
var logErr = debug('dbupdater:err');

/**
 * Данный модуль предназначен для выполнение разнообразных действий (задач) при старте проекта.
 * Главной особенность задачи в том, что она обязательно должна быть выполнена и только один раз.
 * Наиболее частое применение - обновление БД из заранее подготовленых файлов.
 * Например, есть несколько SQL скриптов которые должны быть последовательно выполнены, после чего можно стартовать приложение.
 * <br/>
 * Во время разработки появляются изменения в БД, которые должны быть выполнены на каждом сервере - мы добавляем соответствующие SQL скрипты (задачи)
 * и знаем, что перед стартом приложения БД будет обновлена (если этого еще не сделано). Это особенно актуально при большом количестве серверов.
 * Некоторые могут назвать этот механизм "миграцией", на мой взгляд это не она, а сонхронизация структуры БД.
 * <br/><br/>
 * Пример кода ниже<br/>
 * Примерs [JS]{@link Executor.TaskExecPostgresFileJs} и [SQL]{@link Executor.TaskExecPostgresFileSql} файлов заданий. В примерениже они должны лежать в папке tasks в корне проекта
 *
 * @example
 * var DbUpdater = require('dbupdater');
 *
 * var dbupdater = DbUpdater({
 *      taskReader: DbUpdater.TaskReaderFile(),
 *   // taskReader: DbUpdater.TaskReaderFile({path: 'tasks'}),
 *      taskSaver: DbUpdater.TaskSaverPostgreSQL({connString: 'postgres://postgres:1@localhost/mydb'}),
 *   // taskSaver: DbUpdater.TaskSaverPostgreSQL({connString: 'postgres://postgres:1@localhost/mydb', dbTable: 'tasks'}),
 *      taskExecutors: [
 *          DbUpdater.TaskExecPostgresFileJs({connString: 'postgres://postgres:1@localhost/mydb'}),
 *          DbUpdater.TaskExecPostgresFileSql({connString: 'postgres://postgres:1@localhost/mydb'})
 *      ]
 * });
 *
 * dbupdater.init(function (err) {
 *      if (err) {
 *          console.error('dbupdater: ' + err);
 *      } else {
 *          console.log('dbupdater done success!');
 *      }
 * });
 *
 * @param {object} options - объект, который умеет читать задачи из хранилища
 * @param {Reader.TaskReaderAbstract} options.reader - объект, который умеет читать задачи из хранилища
 * @param {Saver.TaskSaverAbstract} options.saver - объект, который умеет получать список выполненных задач и логировать выполненные задачи
 * @param {Executor.TaskExecAbstract[]} options.executors - массив объектов, которые умеют определять тип задач (один уникальный тип для одного executor'а) и выполнять их
 * @returns {DbUpdater}
 * @constructor
 */
function DbUpdater (options) {
    var self = this;

    if (self instanceof DbUpdater === false) {
        return new DbUpdater(options);
    }
    options = options || {};

    self.taskReader = options.taskReader;
    self.taskSaver = options.taskSaver;
    self.taskExecutors = options.taskExecutors;
}

DbUpdater.prototype = {

    /**
     * Метод инициализирующий модуль. Выполняет всю подготовительную работу, сравнивает выполненные задачи с задачами в хранилище по md5 и выполняет задачи которые еще небыли выполнены
     * @param {function} cb - колбэк инициализации
     * @param {?Error} cb.err - Ошибка инициализации
     */
    init: function init (cb) {
        var self = this;
        if (!self.taskReader) {
            cb(new Error('Не задан параметр options.taskReader'));
            return;
        } else if (!self.taskSaver) {
            cb(new Error('Не задан параметр options.taskSaver'));
            return;
        } else if (!self.taskExecutors) {
            cb(new Error('Не задан параметр options.taskExecutors'));
            return;
        }

        _.bindAll(self.taskReader);
        _.bindAll(self.taskSaver);

        async.series(
            {
                // Последовательная инициализация и запрос списка задач (на выполнение/выполненных)
                // Reader
                taskReaderInit: self.taskReader.init,
                taskReaderTasks: self.taskReader.getTasks,

                // Saver
                taskSaverInit: self.taskSaver.init,
                taskSaverTasks: self.taskSaver.getTasks
            },
            function (err, out) {
                var fileNamesToExecute, fileNamesExecuted, unknownExecutedTasks;

                if (err) {
                    cb(err);
                    return
                }

                // Получаем имена всех/выполненных задач
                fileNamesToExecute = _.map(out.taskReaderTasks, 'name');
                fileNamesExecuted = _.map(out.taskSaverTasks, 'name');

                // Проверяем массив задач на уникальность имен
                if (_.uniq(fileNamesToExecute).length !== fileNamesToExecute.length) {
                    cb(new Error('Очередь задач на выполнение содержит не уникальные значения'));
                    return;
                }

                // Проверяем массив выполненных задач на уникальность имен
                if (_.uniq(fileNamesExecuted).length !== fileNamesExecuted.length) {
                    cb(new Error('Среди выполненных задач есть не уникальные значения'));
                    return;
                }

                // Ищем имена задач которые содержатся в выполненных, но нет среди задач на выполнение - это ошибка
                // Т.е. задача была выполнена, а потом удалена из репозитория задач, но сохранилась
                unknownExecutedTasks = _.difference(fileNamesExecuted, fileNamesToExecute);
                if (unknownExecutedTasks.length) {
                    cb(new Error('Finded unknown executed tasks: ' + unknownExecutedTasks.join(', ')));
                    return;
                }

                // Последовательно выполняем задачи если они еще небыли выполнены
                async.reduce(out.taskReaderTasks, out.taskSaverTasks, taskIterator, cb);
            }
        );

        function taskIterator (executedTasks, toExecuteTask, next) {
            var taskPos = _.findIndex(executedTasks, 'name', toExecuteTask.name),
                executedTask,
                executor;

            if (taskPos === -1) {
                // Задачи нет среди выполненных - выполняем
                executor = _.findIndex(self.taskExecutors, function (taskExecutor) { return taskExecutor.matchType(toExecuteTask.name); });
                if (executor === -1) {
                    next(new Error(util.format('Для файла %s не найден executor', toExecuteTask.name)));
                } else {
                    executor = self.taskExecutors[executor];
                    // Читаем задачу и выполняем её
                    self.taskReader.getText(toExecuteTask, function (err, text) {
                        if (err) {
                            next(err);
                            return;
                        }
                        executor.execute(toExecuteTask, text, function (err) {
                            if (err) {
                                next(err);
                            } else {
                                log(util.format('Задача %s выполнена', toExecuteTask.name));
                                self.taskSaver.logExecutedTask(toExecuteTask, function (err) {
                                    next(err, executedTasks);
                                });
                            }
                        });
                    });
                }
            } else {
                // Задача уже есть в списке выполненных
                executedTask = executedTasks[taskPos];
                if (toExecuteTask.md5 === executedTask.md5) {
                    // Контрольные суммы совпали - все Ок!
                    next(null, executedTasks);
                } else {
                    // Контрольные суммы не совпали
                    next(new Error(util.format('В задаче %s ожидается md5:%s а пришла md5:%s', executedTask.name, executedTask.md5, toExecuteTask.md5)));
                }
            }
        }
    }

};

/**
 * See {@link Reader.TaskReaderAbstract}
 */
DbUpdater.TaskReaderAbstract = require('./parts/reader/reader-abstract');

/**
 * See {@link Reader.TaskReaderFile}
 */
DbUpdater.TaskReaderFile = require('./parts/reader/reader-file');

/**
 * See {@link Saver.TaskSaverAbstract}
 */
DbUpdater.TaskSaverAbstract = require('./parts/saver/saver-abstract');

/**
 * See {@link Saver.TaskSaverPostgreSQL}
 */
DbUpdater.TaskSaverPostgreSQL = require('./parts/saver/saver-postgres');

/**
 * See {@link Executor.TaskExecAbstract}
 */
DbUpdater.TaskExecAbstract = require('./parts/executor/exec-abstract');

/**
 * See {@link Executor.TaskExecPostgresFileJs}
 */
DbUpdater.TaskExecPostgresFileJs = require('./parts/executor/exec-postgres-file-js');

/**
 * See {@link Executor.TaskExecPostgresFileSql}
 */
DbUpdater.TaskExecPostgresFileSql = require('./parts/executor/exec-postgres-file-sql');

module.exports = DbUpdater;
