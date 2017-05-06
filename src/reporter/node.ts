import Promise from '../airbrake-js/src/promise';
import Notice from '../airbrake-js/src/notice';
import jsonifyNotice from '../jsonify_notice';

import {ReporterOptions} from './reporter';

let request;
try {
    // Use eval to hide import from Webpack.
    request = eval('require')('request');
} catch (_) {}


export default function report(notice: Notice, opts: ReporterOptions, promise: Promise): void {
    let url = `${opts.endpoint}/projects/${opts.project}/errors`;
    let payload = jsonifyNotice(notice, opts);

    request({
        url: url,
        method: 'POST',
        body: payload,
        headers: {
            'content-type': 'application/json',
            'x-api-key': opts.apiKey
        },
        timeout: opts.timeout,
    }, function (error, response, body) {
        if (error) {
            promise.reject(error);
            return;
        }

        if (response.statusCode >= 200 && response.statusCode < 500) {
            let resp = JSON.parse(body);
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
        }

        body = body.trim();
        let err = new Error(
            `faultline: unexpected response: code=${response.statusCode} body='${body}'`);
        promise.reject(err);
    });
}
