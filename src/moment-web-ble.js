(function (global) {

/**
  * Moment namespace for SDK functions. Avoid modifying the global `Moment`
  * object directly.
  *
  * @global
  * @name Moment
  * @namespace
  */
global['Moment'] = global['Moment'] || {};
var Moment = global['Moment'];

Moment['_device'] = false;

// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
function exponentialBackoff(max, delay, toTry, success, fail) {
    toTry().then(result => success(result))
        .catch(_ => {
            if (max === 0) {
                return fail();
            }
            console.log('Retrying in ' + delay + 's... (' + max + ' tries left)');
            setTimeout(function() {
                exponentialBackoff(--max, delay * 2, toTry, success, fail);
            }, delay * 1000);
        }
    );
}

function connect() {
    exponentialBackoff(3 /* max retries */, 2 /* seconds delay */,
        function toTry() {
            console.log('Connecting to Bluetooth Device... ');
            return Moment['_device'].gatt.connect();
        },
        function success() {
            console.log('> Bluetooth Device connected. Try disconnect it now.');
        },
        function fail() {
            console.log('Failed to reconnect.');
        }
    );
}

function onDisconnected() {
    connect();
}

/** Connect to Moment with automatic retry after a while.
  *
  * @memberof Moment
  * @name Moment.connect
  * @method
  * @static
  *
  * @example
  * // connect to Moment
  * Moment.connect();
  */
Moment['connect'] = function () {
    var request = navigator.bluetooth.requestDevice({
        'filters': [{
          'services': ['00009B69-58FD-0A19-9B69-4CF88FC7B8DA']
        }]
    });

    request.then(function (device) {
        Moment['_device'] = device;
        device.addEventListener('gattserverdisconnected', onDisconnected);
        connect();
    });

    request.catch(function (error) {
        Moment['_device'] = false;
    });
};

})(Function('return this')());
