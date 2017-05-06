import Promise from '../airbrake-js/src/promise';
import Notice from '../airbrake-js/src/notice';
import jsonifyNotice from '../jsonify_notice';

import {ReporterOptions} from './reporter';


let cbCount = 0;

export default function report(notice: Notice, opts: ReporterOptions, promise: Promise): void {
    cbCount++;

    let cbName = 'faultlineCb' + String(cbCount);
    window[cbName] = (resp) => {
        try {
            delete window[cbName];
        } catch (_) { // IE
            window[cbName] = undefined;
        }

        if (resp.id) {
            notice.id = resp.id;
            promise.resolve(notice);
            return;
        }
        if (resp.error) {
            let err = new Error(resp.error);
            promise.reject(err);
            return;
        }

        let err = new Error(resp);
        promise.reject(err);
    };

    let payload = encodeURIComponent(jsonifyNotice(notice, opts));
    let url = `${opts.endpoint}/projects/${opts.project}/errors?api_key={opts.apiKey}&callback=${cbName}&body=${payload}`; // not support

    let document = window.document;
    let head = document.getElementsByTagName('head')[0];
    let script = document.createElement('script');
    script.src = url;
    script.onload = () => head.removeChild(script);
    script.onerror = () => {
        head.removeChild(script);
        let err = new Error('faultline: JSONP script error');
        promise.reject(err);
    };
    head.appendChild(script);
}
