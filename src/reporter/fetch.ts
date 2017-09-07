import Promise from '../airbrake-js/src/promise';
import Notice from '../airbrake-js/src/notice';
import jsonifyNotice from '../jsonify_notice';

import {ReporterOptions} from './reporter';


let rateLimitReset = 0;
let errIpRateLimited = new Error('faultline: ip is rate limited');


export default function report(notice: Notice, opts: ReporterOptions, promise: Promise): void {
    let utime = Date.now() / 1000;
    if (utime < rateLimitReset) {
        promise.reject(errIpRateLimited);
        return;
    }

    let url = `${opts.endpoint}/projects/${opts.project}/errors`;
    let payload = jsonifyNotice(notice, opts);

    let opt = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': opts.apiKey
        },
        body: payload,
    };

    fetch(url, opt).then((req: Response) => {
        if (req.status === 429) {
            promise.reject(errIpRateLimited);

            let s = req.headers.get('X-RateLimit-Reset');
            if (!s) {
                return;
            }

            let n = parseInt(s, 10);
            if (n > 0) {
                rateLimitReset = n;
            }
            return;
        }

        if (req.status >= 200 && req.status < 500) {
            req.json().then((resp) => {
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
            });
            return;
        }
        req.text().then((body) => {
            let err = new Error(
                `faultline: fetch: unexpected response: code=${req.status} body='${body}'`);
            promise.reject(err);
        });
    }).catch((err) => {
        promise.reject(err);
    });
}
