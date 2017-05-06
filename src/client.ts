import Promise from './airbrake-js/src/promise';
import {Notice, AirbrakeError} from './airbrake-js/src/notice';

import Processor from './airbrake-js/src/processor/processor';
import stacktracejsProcessor from './airbrake-js/src/processor/stacktracejs';

import Filter from './airbrake-js/src/filter/filter';
import windowFilter from './airbrake-js/src/filter/window';
import nodeFilter from './airbrake-js/src/filter/node';
import ignoreMessageFilter from './airbrake-js/src/filter/ignore_message';
import uncaughtMessageFilter from './airbrake-js/src/filter/uncaught_message';
import angularMessageFilter from './airbrake-js/src/filter/angular_message';

import {Reporter, ReporterOptions, detectReporter} from './reporter/reporter';
import nodeReporter from './reporter/node';
import compatReporter from './reporter/compat';
import xhrReporter from './reporter/xhr';
import jsonpReporter from './reporter/jsonp';

import {historian, getHistory} from './airbrake-js/src/instrumentation/historian';


declare const VERSION: string;

interface FunctionWrapper {
    (): any;
    __airbrake: boolean;
    __inner: () => any;
}

class Client {
    private opts: ReporterOptions = {} as ReporterOptions;

    private processor: Processor;
    private reporters: Reporter[] = [];
    private filters: Filter[] = [];

    private offline = false;
    private errors: any[] = [];

    constructor(opts: any = {}) {
        this.opts.project = opts.project;
        this.opts.apiKey = opts.apiKey;
        this.opts.endpoint = opts.endpoint;
        this.opts.timeout = opts.timeout || 10000;
        this.opts.notifications = opts.notifications;

        this.processor = opts.processor || stacktracejsProcessor;
        this.addReporter(opts.reporter || detectReporter());

        this.addFilter(ignoreMessageFilter);
        this.addFilter(uncaughtMessageFilter);
        this.addFilter(angularMessageFilter);

        if (typeof window === 'object') {
            this.addFilter(windowFilter);

            window.addEventListener('online', this.onOnline.bind(this));
            window.addEventListener('offline', () => this.offline = true);
        } else {
            this.addFilter(nodeFilter);
        }

        historian.registerNotifier(this);
    }

    setProject(project: string, apiKey: string, endpoint: string): void {
        this.opts.project = project;
        this.opts.apiKey = apiKey;
        this.opts.endpoint = endpoint;
    }

    setHost(host: string) {
        this.opts.host = host;
    }

    addReporter(name: string|Reporter): void {
        let reporter: Reporter;
        switch (name) {
        case 'node':
            reporter = nodeReporter;
            break;
        case 'compat':
            reporter = compatReporter;
            break;
        case 'xhr':
            reporter = xhrReporter;
            break;
        case 'jsonp':
            reporter = jsonpReporter;
            break;
        default:
            reporter = name as Reporter;
        }
        this.reporters.push(reporter);
    }

    addFilter(filter: Filter): void {
        this.filters.push(filter);
    }

    notify(err: any): Promise {
        if (typeof err !== 'object' || err.error === undefined) {
            err = {error: err};
        }
        let promise = err.promise || new Promise();

        if (!err.error) {
            let reason = new Error(
                `notify: got err=${JSON.stringify(err.error)}, wanted an Error`);
            promise.reject(reason);
            return promise;
        }

        if (this.offline) {
            err.promise = promise;
            this.errors.push(err);
            if (this.errors.length > 100) {
                this.errors.slice(-100);
            }
            return promise;
        }

        let notice: Notice = {
            id: '',
            errors: [],
            context: Object.assign({
                language: 'JavaScript',
                notifier: {
                    name: 'faultline-js',
                    version: VERSION,
                    url: 'https://github.com/faultline/faultline-js',
                },
            }, err.context),
            params: err.params || {},
            environment: err.environment || {},
            session: err.session || {},
        };

        let history = getHistory();
        if (history.length > 0) {
            notice.context.history = history;
        }

        this.processor(err.error, (_: string, error: AirbrakeError): void => {
            notice.errors.push(error);

            for (let filter of this.filters) {
                let r = filter(notice);
                if (r === null) {
                    return;
                }
                notice = r;
            }

            for (let reporter of this.reporters) {
                reporter(notice, this.opts, promise);
            }
        });

        return promise;
    }

    wrap(fn): FunctionWrapper {
        if (fn.__airbrake) {
            return fn;
        }

        let client = this;
        let airbrakeWrapper = function () {
            let fnArgs = Array.prototype.slice.call(arguments);
            let wrappedArgs = client.wrapArguments(fnArgs);
            try {
                return fn.apply(this, wrappedArgs);
            } catch (err) {
                client.notify({error: err, params: {arguments: fnArgs}});
                historian.ignoreNextWindowError();
                throw err;
            }
        } as FunctionWrapper;

        for (let prop in fn) {
            if (fn.hasOwnProperty(prop)) {
                airbrakeWrapper[prop] = fn[prop];
            }
        }

        airbrakeWrapper.__airbrake = true;
        airbrakeWrapper.__inner = fn;

        return airbrakeWrapper;
    }

    private wrapArguments(args: any[]): any[] {
        for (let i in args) {
            let arg = args[i];
            if (typeof arg === 'function') {
                args[i] = this.wrap(arg);
            }
        }
        return args;
    }

    call(fn, ..._args: any[]): any {
        let wrapper = this.wrap(fn);
        return wrapper.apply(this, Array.prototype.slice.call(arguments, 1));
    }

    onerror(): void {
        historian.onerror.apply(historian, arguments);
    }

    private onOnline(): void {
        this.offline = false;

        for (let err of this.errors) {
            this.notify(err);
        }
        this.errors = [];
    }
}

export = Client;
