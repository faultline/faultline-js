import Promise from '../airbrake-js/src/promise';
import Notice from '../airbrake-js/src/notice';


export interface ReporterOptions {
    project: string;
    apiKey: string;
    endpoint: string;
    host: string;
    timeout: number;
    notifications: any;

    ignoreWindowError?: boolean;
}

export type Reporter = (notice: Notice, opts: ReporterOptions, promise: Promise) => void;
export default Reporter;

export function detectReporter(_opts): string {
    if (typeof fetch === 'function') {
        return 'fetch';
    }

    if (typeof XMLHttpRequest !== 'undefined') {
        return 'xhr';
    }

    if (typeof window !== 'undefined') {
        return 'jsonp';
    }

    return 'node';
}
