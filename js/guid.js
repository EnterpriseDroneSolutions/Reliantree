//Modified from https://stackoverflow.com/a/14663381

var Guid = Guid || (function () {

var EMPTY = '00000000-0000-0000-0000-000000000000';

var _padLeft = function (paddingString, width, replacementChar) {
    return paddingString.length >= width ? paddingString : _padLeft(replacementChar + paddingString, width, replacementChar || ' ');
};

var _s4 = function (number) {
    var hexadecimalResult = number.toString(16);
    return _padLeft(hexadecimalResult, 4, '0');
};

var _s34 = function (number) {
	var hexadecimalResult = number.toString(16);
    return "4"+_padLeft(hexadecimalResult, 4, '0').substr(1);
}

var _s3y = function (number) {
	var hexadecimalResult = number.toString(16);
    return ["8","9","a","b"][Math.floor(Math.random()*4)]+_padLeft(hexadecimalResult, 4, '0').substr(1);
}

var _cryptoGuid = function () {
    var buffer = new window.Uint16Array(8);
    window.crypto.getRandomValues(buffer);
    return [_s4(buffer[0]) + _s4(buffer[1]), _s4(buffer[2]), _s34(buffer[3]), _s3y(buffer[4]), _s4(buffer[5]) + _s4(buffer[6]) + _s4(buffer[7])].join('-');
};

var _guid = function () {
    var currentDateMilliseconds = new Date().getTime();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (currentChar) {
        var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
        currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
        return (currentChar === 'x' ? randomChar : [0x8,0x9,0xa,0xb][Math.floor(Math.random()*4)]).toString(16);
    });
};

var create = function () {
    var hasCrypto = typeof (window.crypto) != 'undefined',
        hasRandomValues = typeof (window.crypto.getRandomValues) != 'undefined';
    return (hasCrypto && hasRandomValues) ? _cryptoGuid() : _guid();
};

return {
    newGuid: create,
    empty: EMPTY
};})();