# faultline-js [![Build Status](https://travis-ci.org/faultline/faultline-js.svg?branch=master)](https://travis-ci.org/faultline/faultline-js)

> [faultline](https://github.com/faultline/faultline) exception and error notifier for JavaScript.

## Installation

Using npm:

```sh
npm install faultline-js
```

or 

```html
<script src="path/to/faultline-js/dist/client.min.js"></script>
```

## Usage

```js
var faultline = new faultlineJs.Client({
                  project: 'faultline-js', 
                  apiKey: 'xxxxXXXXXxXxXXxxXXXXXXXxxxxXXXXXX',
                  endpoint: 'https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0',
                  notifications: [
                    {
                      type: 'slack',
                      endpoint: 'https://hooks.slack.com/services/XXXXXXXXXX/B2RAD9423/WC2uTs3MyGldZvieAtAA7gQq',
                      channel: '#random',
                      username: 'faultline-notify',
                      notifyInterval: 1,
                      threshold: 1,
                      timezone: 'Asia/Tokyo'
                    }
                  ]
                });
```

Or if you are using browserify/webpack/etc:

```js
var faultlineJs = require('faultline-js');
var faultline = new faultlineJs({
                  project: 'faultline-js', 
                  apiKey: 'xxxxXXXXXxXxXXxxXXXXXXXxxxxXXXXXX',
                  endpoint: 'https://xxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v0',
                  notifications: [
                    {
                      type: 'slack',
                      endpoint: 'https://hooks.slack.com/services/XXXXXXXXXX/B2RAD9423/WC2uTs3MyGldZvieAtAA7gQq',
                      channel: '#random',
                      username: 'faultline-notify',
                      notifyInterval: 1,
                      threshold: 1,
                      timezone: 'Asia/Tokyo'
                    }
                  ]
                });
```

## Integration

### window.onerror

faultline-js automatically setups `window.onerror` handler when script is loaded, like [airbrake-js](https://github.com/airbrake/airbrake-js)

## References

- faultline-js is based on [airbrake/airbrake-js](https://github.com/airbrake/airbrake-js)
    - Airbrake Js is licensed under [The MIT License (MIT)](https://github.com/airbrake/airbrake-js/LICENSE.md).

## License

MIT © Ken&#39;ichiro Oyama

