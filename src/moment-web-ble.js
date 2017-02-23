(function (global) {

/**
  * Moment namespace for SDK functions. Avoid modifying the global `Moment`
  * object directly.
  *
  * @global
  * @name Moment
  * @namespace
  */
var Moment = global['Moment'] = global['Moment'] || {};

var HTS_UUID =    '00009B69-58FD-0A19-9B69-4CF88FC7B8DA',
    JSU_UUID =    '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
    JSU_RX_UUID = '6E400002-B5A3-F393-E0A9-E50E24DCCA9E';

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

function connect(self) {
    exponentialBackoff(10 /* max retries */, 2 /* seconds delay */,
        function toTry() {
            console.log('Connecting to Bluetooth Device... ');
            return self.device.gatt.connect();
        },
        function success(server) {
            console.log('> Bluetooth Device connected. Try disconnect it now.');
            self.gatt_server = server;
            getService(self);
        },
        function fail() {
            console.log('Failed to reconnect.');
            self.gatt_server = false;
        }
    );
}

function onDisconnected() {
    connect();
}

function getService(self) {
    exponentialBackoff(10 /* max retries */, 2 /* seconds delay */,
        function toTry() {
            console.log('Getting JS UART Service... ');
            return self.gatt_server.getPrimaryService(JSU_UUID);
        },
        function success(service) {
            console.log('> JS UART Service Obtained.');
            self.js_uart_service = service;
            getCharacteristic(self);
        },
        function fail() {
            console.log('Failed to get JS UART Service.');
            self.js_uart_service = false;
        }
    );
}

function getCharacteristic(self) {
    exponentialBackoff(10 /* max retries */, 2 /* seconds delay */,
        function toTry() {
            console.log('Getting JS UART Characteristic... ');
            return self.gatt_server.getCharacteristic(JSU_RX_UUID);
        },
        function success(characteristic) {
            console.log('> JS UART Characteristic Obtained.');
            self.js_uart_char = characteristic;
        },
        function fail() {
            console.log('Failed to get JS UART Characteristic.');
            self.js_uart_char = false;
        }
    );
}

function chunkString(str, len) {
    var size = str.length / len + .5 | 0,
        ret  = new Array(size),
        offset = 0;

    for(var i = 0; i < size; ++i, offset += len) {
      ret[i] = str.substring(offset, offset + len);
    }

    return ret;
}

function writeCode(self, chunks) {
    if (chunks.length == 0)
        return;

    var chunk = Uint8Array.from(chunks.shift());
    exponentialBackoff(10 /* max retries */, 2 /* seconds delay */,
        function toTry() {
            console.log('Writing JS UART Characteristic... ');
            return self.js_uart_char.writeValue(chunk);
        },
        function success(characteristic) {
            console.log('> JS UART Characteristic Written.');
            writeCode(self, chunks);
        },
        function fail() {
            console.log('Failed to write JS UART Characteristic.');
        }
    );
}

/** Represents a Moment device connection from the browser, and provides
  * methods for connecting and executing JavaScript code on Moment using
  * the features provided by the Moment SDK.
  *
  * @constructor
  * @memberof Moment
  * @name Moment.Device
  *
  * @example
  * // connect to device
  * var device = new Moment.Device();
  * device.connect();
  * device.run("5 + 5;"); // execute JavaScript code on Moment
  * device.disconnect();
  */
function Device() {
    this.device = false;
    this.gatt_server = false;
    this.js_uart_service = false;
    this.js_uart_char = false;
}

/** This method connects to the first available Moment device that is
  * advertising nearby.
  *
  * @memberof Moment.Device
  * @name Moment.Device.connect
  * @public
  * @method
  *
  * @example
  * // connect to device
  * var device = new Moment.Device();
  * device.connect();
  * device.run("5 + 5;"); // execute JavaScript code on Moment
  * device.disconnect();
  */
Device['prototype']['connect'] = function () {
    var self = this;

    var request = navigator.bluetooth.requestDevice({
        'filters': [{
          'services': [HTS_UUID]
        }]
    });

    request.then(function (device) {
        self.device = device;
        device.addEventListener('gattserverdisconnected', onDisconnected);
        connect(self);
    });

    request.catch(function (error) {
        self.device = false;
    });
};

/** This method runs JavaScript code on Moment by sending the relevant code
  * via BLE.
  *
  * @memberof Moment.Device
  * @name Moment.Device.run
  * @public
  * @method
  *
  * @example
  * // connect to device
  * var device = new Moment.Device();
  * device.connect();
  * device.run("5 + 5;"); // execute JavaScript code on Moment
  * device.disconnect();
  */
Device['prototype']['run'] = function (code) {
    var chunks = chunkString(code, 19); // split code into packets
    writeCode(this, chunks);
};

/** This method disconnects from Moment.
  *
  * @memberof Moment.Device
  * @name Moment.Device.disconnect
  * @public
  * @method
  *
  * @example
  * // connect to device
  * var device = new Moment.Device();
  * device.connect();
  * device.run("5 + 5;"); // execute JavaScript code on Moment
  * device.disconnect();
  */
Device['prototype']['disconnect'] = function (code) {
    this.device.gatt.disconnect();
};

Moment['Device'] = Device;

})(Function('return this')());
