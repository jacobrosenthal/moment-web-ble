
var assert = require('assert'),
    moment_web_ble = require('../src/moment-web-ble');

describe('Moment global object', function () {
	describe('#Moment', function () {
		it('must exist in the global scope', function () {
			assert.ok(Moment);
		});
	});

	describe('#Moment.connect', function () {
		it('must exist as a property of the Moment object', function () {
			assert.ok(Moment.hasOwnProperty('connect'));
		});
	});
});
