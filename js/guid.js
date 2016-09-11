/*
guid.js - Generates a RFC 4122 version 4 GUID, using cryptographically random data when available.
Modified from https://stackoverflow.com/a/14663381
Copyright (c) 2013 Berni Atelšek
Copyright (c) 2016 James Rowley
This work is licensed under The MIT License, without the requirement to reproduce the licence in full.
To view a copy of the license, visit https://opensource.org/licenses/MIT
*/

var Guid = Guid || (function () {

//Ensure a string is at least a certain width by adding multiples of a character to the beginning of the string.
var _padLeft = function (paddingString, width, replacementChar) {
    return paddingString.length >= width ? paddingString : _padLeft(replacementChar + paddingString, width, replacementChar || ' ');
};

//Convert an unsigned word to a string represntation of itself in hexadecimal
var _s4 = function (number) {
    var hexadecimalResult = number.toString(16);
    return _padLeft(hexadecimalResult, 4, '0');
};

//Convert an unsigned word to a string represntation of itself in hexadecimal, replacing the first character of the string with a 4.
var _s34 = function (number) {
	var hexadecimalResult = number.toString(16);
    return "4"+_padLeft(hexadecimalResult, 4, '0').substr(1);
}

//Convert an unsigned word to a string represntation of itself in hexadecimal, replacing the first character of the string with an 8, 9, a, or b, chosen psuedorandomly.
var _s3y = function (number) {
	var hexadecimalResult = number.toString(16);
    return ["8","9","a","b"][Math.floor(Math.random()*4)]+_padLeft(hexadecimalResult, 4, '0').substr(1);
}

//Generate a GUID using cryptographically random data provided by the browser.
var _cryptoGuid = function () {
    var buffer = new window.Uint16Array(8); //Create an array or unsigned words for the random data to go in
    window.crypto.getRandomValues(buffer); //Fill that array with cryptographically random data from the browser
    return [_s4(buffer[0]) + _s4(buffer[1]), _s4(buffer[2]), _s34(buffer[3]), _s3y(buffer[4]), _s4(buffer[5]) + _s4(buffer[6]) + _s4(buffer[7])].join('-'); //Build the GUID from the cryptographically random data
};

//Generate a GUID using psuedorandom data seeded with the time of the function start.
var _guid = function () {
    var currentDateMilliseconds = new Date().getTime(); //Determine the seed
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (currentChar) { //Iterate along each character of the string to receive a random hex character.
        var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0; //Generate a psuedorandom character
        currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16); //Update the seed
        return (currentChar === 'x' ? randomChar : [0x8,0x9,0xa,0xb][Math.floor(Math.random()*4)]).toString(16); //Replace the character of the string with either the random character or 8, 9, a, or b, as specified by RFC 4122
    });
};

//Determine which method of generating the GUID will be used, and use it.
var create = function () {
    var hasCrypto = typeof (window.crypto) != 'undefined',
        hasRandomValues = hasCrypto ? typeof (window.crypto.getRandomValues) != 'undefined' : false;
    return (hasCrypto && hasRandomValues) ? _cryptoGuid() : _guid();
};

return create; //Return a function which returns a GUID.
})();