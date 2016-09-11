/*
rt-tree.js - Responsible for the tree and tree indices in the Reliantree Client.
Copyright (c) 2016 Enterprise Drone Solutions, LLC

This file is part of Reliantree, which is licensed under the GNU Affero General Public License version 3.
You should have received a copy of this license along with Reliantree.  If not, see <http://www.gnu.org/licenses/>.
*/

////////////////////////////////////////////////TEMPORARY THINGS HERE (TODO: MOVE OR REMOVE THEM)
var rtCurrentVersion = "0.0.1";

var sampleTree = {
	//Traceability stuff
	"reliantreeVersion":"0.0.1", //major.minor.revision (client)
	"rtServerVersion":"0.0.1", //major.minor.revision (server)
	"rtClientVersionList":["0.0.1","0.0.0"], //list of all versions of the client that have written to this tree, latest first
	"rtServerVersionList":["0.0.1","0.0.0"], //as above, but for the server
	//The tree itself
	"nodes":{ //Nodes are identified by a GUID
		"36c86daf-606d-4eca-94b1-2d82f5fa6e38":{ //Example of an AND node (and origin node)
			"type":"and", //Specify that this node uses AND calculations on its children
			"title":"Starting Point",
			"description":"Tree traversal starts here",
			"failureRate":"0.0001234", //Chance of failure in any hour
			"fixedRate":true, //Whether the above is user-specified (true) or calculated (false) (basically, tree traversal either starts or stops here)
			"parent":null, //The parent node (null if this is the tree origin, else if null then the node is disconnected from the tree and ignored)
			"children":["19a7c415-192e-44b2-b7d9-ec2023e4c539","424892c9-0c0a-4b93-8ec0-ec52b2161c9a"] //The child nodes (empty array if no children)
		},
		"19a7c415-192e-44b2-b7d9-ec2023e4c539":{ //Example of an OR node
			"type":"or", //Specify that this node uses OR calculations on its children
			"title":"Middle Node",
			"description":"It has something above and below it",
			"failureRate":"0.0001234",
			"fixedRate":false,
			"parent":"36c86daf-606d-4eca-94b1-2d82f5fa6e38",
			"children":["cbdecc9b-830b-4c9a-a0cd-48bfcea95899","5e599aee-8550-4ee8-bddd-f35184f181fb"]
		},
		"424892c9-0c0a-4b93-8ec0-ec52b2161c9a":{ //Example of an end node
			"type":null, //Type is null if it has no children 
			"title":"End Node",
			"description":"There's nothing below this",
			"failureRate":"0.0001234",
			"fixedRate":false,
			"parent":"36c86daf-606d-4eca-94b1-2d82f5fa6e38",
			"children":[]
		},
		"cbdecc9b-830b-4c9a-a0cd-48bfcea95899":{
			"type":null,
			"title":"Branch Terminus",
			"description":"Reliantree sure is refreshing",
			"failureRate":"0.0001234",
			"fixedRate":false,
			"parent":"19a7c415-192e-44b2-b7d9-ec2023e4c539",
			"children":[]
		},
		"5e599aee-8550-4ee8-bddd-f35184f181fb":{
			"type":null,
			"title":"A Twig",
			"description":"I was a leaf in a previous life, and a card before that.",
			"failureRate":"0.0001234",
			"fixedRate":false,
			"parent":"19a7c415-192e-44b2-b7d9-ec2023e4c539",
			"children":[]
		},
			
	},
	//Tree Data
	"treeOrigin":"36c86daf-606d-4eca-94b1-2d82f5fa6e38", //The entry point for all tree traversal
	"calculationMode":"down" //DOWN calculation starts from the origin node and fills in theoretical failure rates downwards, UP calculation starts from all the end nodes and calculates the total system failure rate.
};
////////////////////////////////////////////////END TEMP BLOCK

//Tell Big.js not to make exponent notation unless the number is *actually* too long to fit in our field
Big.E_NEG = -12;

//From MDN - "Combo" of 'new' keyword and 'apply' method for functions. Used primarily in autoinstantiation.
Function.prototype.construct = function(aArgs) {
  var fConstructor = this, fNewConstr = function() { 
    fConstructor.apply(this, aArgs); 
  };
  fNewConstr.prototype = fConstructor.prototype;
  return new fNewConstr();
};

//From MDN - Math.hypot polyfill for IE compatibility.
Math.hypot = Math.hypot || function() {
  var y = 0;
  var length = arguments.length;

  for (var i = 0; i < length; i++) {
    if (arguments[i] === Infinity || arguments[i] === -Infinity) {
      return Infinity;
    }
    y += arguments[i] * arguments[i];
  }
  return Math.sqrt(y);
};

//This function determines if a value is a positive integer.
function isPosInt(input){
	if(typeof input === "number" && input >=0 && input == Math.ceil(input)){
		return true;
	} else {
		return false;
	}
}

//Check if a value could reasonably be considered a number.
//WHY: The Number() "typecast" function will return NaN for values that are definitely not numbers, but checking for this is verbose.
//This is basic syntactic sugar.
function isLikeNumber(input){
	return !isNaN(Number(input));
}

//Parse number-like values into actual numbers.
//WHY: As above (isLikeNumber).
//If the input is undefined or null, and weak is true, the function will return zero.
function parseNumber(input, weak){
	var inter = Number(input);
	if (isLikeNumber(input)) {
		return inter;
	} else if (weak === true && (typeof input === "undefined" || input === null)) {
		return 0;
	} else {
		throw new Error(input.toString()+" is not a Number or similar");
	}
}

//Check if a value could reasonably be considered a boolean.
//WHY: The Boolean() "typecast" function will return a boolean value for any input.
//This function will reject inputs that are not interperetable as booleans.
//Specifically: Booleans, numbers, and the strings "true" and "false" count as a "Reasonable Boolean" in this function.
//This corresponds to the parsing functionality of parseBoolean(), below.
function isLikeBoolean(input){
	if (typeof input === "boolean") {
		return true;
	} else if (typeof input === "string" && /^true|false$/i.test(input)) {
		return true;
	} else if (typeof input === "number") {
		return true;
	} else {
		return false;
	}
}

//Parse boolean-like values into actual booleans.
//WHY: The Boolean() "typecast" function will return a boolean value for any input.
//However, objects, arrays, and random strings (as well as undefined) do not logically represent boolean values.
//Additionally, "false" does not logically represent boolean true.
//This function parses "reasonable booleans" (as determined by isLikeBoolean) into actual boolean values.
//If the input is undefined or null, and weak is true, the function will return false.
function parseBoolean(input, weak){
	if (typeof input === "boolean") {
		return input;
	} else if (typeof input === "string" && /^true|false$/i.test(input)) {
		return input.toLowerString() == "true" ? true : false;
	} else if (typeof input === "number") {
		return input ? true : false;
	} else if (weak === true && (typeof input === "undefined" || input === null)) {
		return false;
	} else {
		throw new Error(input+" is not a Boolean or similar");
	}
}

//Verifies that an input is plausibly intended as text, and parses that input.
//WHY: The String() "typecast" will return an accurate string for any input.
//However, objects, functions, and other things cannot reasonably be construed as text.
//Additionally, null and undefined typically represent an intentionally skipped parameter, not "null" and "undefined".
//Text is defined as the input being a string, a number, or a boolean.
//If the input is undefined or null, and weak is true, the function will return an empty string.
//If the input is anything else (object, function, strange ES6 types), the function will throw an error.
//Otherwise, the function will return the input as a string.
function parseText(input, weak){
	if (["string","number","boolean"].indexOf(typeof input) !== -1) {
		return input.toString();
	} else if (weak === true && (typeof input === "undefined" || input === null)) {
		return "";
	} else {
		throw new Error(input.toString()+" is not text");
	}
}

//Checks if a value is a RFC 4122 v4 GUID.
function isGUID(input){
	if(/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/.test(input)){
		return true;
	}
	return false;
}

//Verifies that a value is a RFC 4122 v4 GUID and returns that value.
//Otherwise, it throws an error.
function verifyGUID(input){
	if(isGUID(input)){
		return input;
	} else {
		throw new Error(input.toString()+" is not a GUID");
	}
}
	
//Generic typed property definer
function addTypedProp(self, object, prop, type, callback){
	if (prop in object) {
		var props = {
			enumerable: true,
			get : function (){ return object[prop]; }
		};
		if (typeof callback !== "function") {
			callback = function (set){};
		}
		switch (type) {
			case "posint":
				props.set = function (set){
					if (isPosInt(Number(set))) {
						object[prop] = Number(set);
					} else {
						throw new Error(set+" is not a positive integer");
					}
					callback(set);
				}
				break;
			case "int":
				props.set = function (set){
					var inter = parseNumber(set);
					if (inter = parseInt(inter)) {
						object[prop] = parseNumber(set);
					} else {
						throw new Error(set+" is not an integer");
					}
					callback(set);
				}
				break;
			case "number":
				props.set = function (set){
					object[prop] = parseNumber(set);
					callback(set);
				}
				break
			case "boolean":
				props.set = function (set){
					object[prop] = parseBoolean(set);
					callback(set);
				}
				break;
			case "text":
				props.set = function (set){
					object[prop] = parseText(set);
					callback(set);
				}
				break;
			default:
				console.warn("addProp should have a type");
				props.set = function (set){
					object[prop] = set;
					callback(set);
				}
				break;
		}
		callback(object[prop]);
		Object.defineProperty(self, prop, props);
	} else {
		throw new Error(prop+" is not a property of passed object");
	}
}

//Reliantree-compliant version number type with comparison operators
function rtVersionNumber(initial, minor, revision, gold){
	
	//Autoinstantiation
	if (!(this instanceof rtVersionNumber)) {
		return rtVersionNumber.construct(arguments);
	}	
	
	//Internals
	var vn = {};
	var self = this;
	var acceptableVersionNumber = /^(\d+\.){2}(\d+G?)$/;
	
	//Attempts to parse a value as a Reliantree Version Number.
	//Acceptable values are the string format of a Reliantree Version Number or another rtVersionNumber object.
	//If successful, the parsed value is stored as the version number and true is returned.
	//If the value is not a Reliantree Version Number, false is returned.
	function parseVersionNumber(input){
		if (typeof input === "string" && acceptableVersionNumber.test(input)) {
			var split = input.split(".");
			vn.major = parseInt(split[0]);
			vn.minor = parseInt(split[1]);
			vn.revision = parseInt(split[2]);
			vn.gold = input.includes("G");
			return true;
		} else if (typeof input === "object" && input.constructor.name === "rtVersionNumber") {
			vn.major = input.major;
			vn.minor = input.minor;
			vn.revision = input.revision;
			vn.gold = input.gold;
		} else {
			return false;
		}
	}
	
	//Constructor
	if (!parseVersionNumber(initial)) {
		vn.major = Math.max(Number(initial), 0) | 0;
		vn.minor = Math.max(Number(minor), 0) | 0;
		vn.revision = Math.max(Number(revision), 0) | 0;
		vn.gold = isLikeBoolean(gold) ? parseBoolean(gold) : false;
	}
	
	//Basic exposed properties
	addTypedProp(self, vn, "major",		"posint"	);
	addTypedProp(self, vn, "minor",		"posint"	);
	addTypedProp(self, vn, "revision",	"posint"	);
	addTypedProp(self, vn, "gold",		"boolean"	);
	
	//Exports version number as string
	self.toString = function (){
		return vn.major.toString() + "." + vn.minor.toString() + "." + vn.revision.toString() + (vn.gold ? "G" : "");
	}
	
	//Version number string get/set
	//When read, vn returns the version number as a string.
	//When written, vn attempts to parse the input as a version number.
	Object.defineProperty(self, "vn", {
		get: self.toString,
		set: function (set){
				if (!parseVersionNumber(set)) {
					throw "TypeError: "+set+" is not a Reliantree Version Number";
				}
			}
	});
	
	//Check if another version number is equal to this one.
	//If weak is true, the gold property will be ignored.
	self.equals = function (rtvn, weak){
		if (rtvn.constructor.name === "rtVersionNumber") {
			if ( vn.major == rtvn.major && vn.minor == rtvn.minor && vn.revision == rtvn.revision ){
				if( weak === true ) {
					return true;
				} else {
					if ( vn.gold == rtvn.gold ) {
						return true;
					} else {
						return false;
					}
				}
			} else {
				return false;
			}
		} else {
			throw "Input is " + rtvn.constructor.name + ", not rtVersionNumber!";
		}
	};
	
	//Generic comparison of version numbers (not including simple equality).
	//Direction is false for less than, true for greater than. Equal determines if equal values are accepted. Weak determines if gold setting is considered in equality.
	//Gold XOR case (the gold value of this VN is different from that of the input VN) can be triggered by setting equal to false and weak to true.
	function cascadingComparison(rtvn, direction, equal, weak){
		if (rtvn.constructor.name === "rtVersionNumber") {
			if (direction ? (vn.major > rtvn.major) : (vn.major < rtvn.major)) {
				return true;
			} else if ((direction ? (vn.minor > rtvn.minor) : (vn.minor < rtvn.minor)) && vn.major == rtvn.major) {
				return true;
			} else if ((direction ? (vn.revision > rtvn.revision) : (vn.revision < rtvn.revision)) && vn.minor == rtvn.minor) {
				return true;
			} else if (equal === true && self.equals(rtvn, weak)) {
				return true;
			} else if (equal === false && weak === true && vn.gold != rtvn.gold && vn.revision == rtvn.revision) {
				return true;
			} else {
				return false;
			}
		} else {
			throw new Error(rtvn.constructor.name+" is not rtVersionNumber");
		}
	}
		
	//Version number comparison operators
	self.greaterThan		= function (rtvn)		{return cascadingComparison(rtvn,	true,	false,	false	);};
	self.greaterThanOrEqual	= function (rtvn, weak)	{return cascadingComparison(rtvn,	true,	true,	weak	);};
	self.lessThan			= function (rtvn)		{return cascadingComparison(rtvn,	false,	false,	false	);};
	self.lessThanOrEqual	= function (rtvn, weak)	{return cascadingComparison(rtvn,	false,	true,	weak	);};
	self.lessThan_GoldXor	= function (rtvn)		{return cascadingComparison(rtvn,	false,	false,	true	);};
};

//Reliantree node with all applicable fields and (PLANNED) functionality to attach itself to a "node" (copy of rt-node-prototype) in the DOM.
//The node can be detached from the tree and contain no type, parent, children, or depth.
//Or, it can be attached to a tree and contain any of the above.
//It cannot be added to a tree during intialization, but an intended parent can be declared.
//Children are always calculated due to the structure of the tree.
function rtNode(initialOrTitle, idOrDescription, failureRate, fixedRate, id, parent){
	
	//Autoinstantiation
	if (!(this instanceof rtNode)) {
		return rtNode.construct(arguments);
	}
	
	//Internals
	var node = {};
	var tempParent;
	var tree;
	var self = this;
	var skipConversion = false;
	
	//Attempts to parse a value as a Reliantree Node.
	//Acceptable values are a Reliantree Node as a JavaScript Object or a JSON string, or another rtNode object.
	//If successful, the parsed value is stored as the version number and true is returned.
	//If the value is not a Reliantree Node, false is returned.
	function parseNode(input, ID){
		if (typeof input === "undefined") {
			return false;
		}
		if (input.constructor.name === "String") {
			try {
				input = JSON.parse(input);
			} catch (e) {}
		}
		if (typeof input === "Object") {
			try {
				node.title = parseText(input.title);
				node.description = parseText(input.description);
				node.internal.bigFailureRate = new Big(input.failureRate);
				node.failureRate = node.internal.bigFailureRate.toString();
				node.fixedRate = parseBoolean(input.fixedRate);
				tempParent = isGUID(input.parent) ? input.parent : null;
				id = ID;
				return true;
			}
			catch (e) {
				throw new Error(input.toString()+"is not a Reliantree Node");
			}
		}
		return false;
	}
	
	//Constructor
	node.internal={};
	if (!parseNode(initialOrTitle, idOrDescription)) {
		node.title = parseText(initialOrTitle, true);
		node.description = parseText(idOrDescription, true);
		node.internal.bigFailureRate = isLikeNumber(failureRate) ? new Big(failureRate) : new Big(0);
		node.failureRate = node.internal.bigFailureRate.toString();
		node.fixedRate = parseBoolean(fixedRate, true);
		node.internal.id = isGUID(id) ? id : Guid();
		tempParent = isGUID(parent) ? parent : null;
	}
	//General setup items
	node.parent = null;
	node.children = [];
	node.internal.bigFailureRate = new Big(node.failureRate);
	node.internal.depth = -1;
	
	if (rtMap) {
		rtMap.mapNodes[node.internal.id] = this;
		$('#rt-node-prototype').clone(true).attr("id",node.internal.id).show().appendTo("#rt-nodes").offset(rtMap.getNewCoords());
		addTypedProp(this, node, "title", "text", function (val){
			$("#"+node.internal.id+" .rt-node-title").val(val);
		});
		$("#"+node.internal.id+" .rt-node-title").on("input", function (){
			self.title = $(this).val();
		});
		addTypedProp(this, node, "description", "text", function (val){
			$("#"+node.internal.id+" .rt-node-description").val(val);
		});
		$("#"+node.internal.id+" .rt-node-description").on("input", function (){
			self.description = $(this).val();
		});
		//////////////////////////////////////////////////////////////////////////////////////////////////// !!!!!!! UPDATE THIS !!!!!!!!
		addTypedProp(this, node, "failureRate", "number", function (val){
			if (!skipConversion) {
				skipConversion = true;
				node.internal.bigFailureRate = Big(val);
				skipConversion = false;
			}
			$("#"+node.internal.id+" .rt-node-failure-rate").val(val);
		});
		$("#"+node.internal.id+" .rt-node-failure-rate").on("input", function (){
			self.failureRate = $(this).val();
		});
		addTypedProp(this, node, "fixedRate", "boolean", function (val){
			$("#"+node.internal.id+" .rt-node-reliability-fixed").attr("checked",val);
		});
		$("#"+node.internal.id+" .rt-node-reliability-fixed").on("change", function (){
			self.fixedRate = this.checked;
		});
	} else {
		addTypedProp(this, node, "title", "text");
		addTypedProp(this, node, "description", "text");
		addTypedProp(this, node, "failureRate", "number");
		addTypedProp(this, node, "fixedRate", "boolean");
	}
	
	Object.defineProperty(this, "internal", {
		enumerable: false,
		writable: false,
		value: {},
	});
	
	Object.defineProperty(this.internal, "id", {
		enumerable: true,
		get: function (){ return node.internal.id; },
		set: function (){ throw new Error("Node ID cannot be set");}
	});
	
	Object.defineProperty(this.internal, "depth", {
		enumerable: true,
		get: function (){ return node.internal.depth; },
		set: function (){ throw new Error("Node depth cannot be set");}
	});
	
	Object.defineProperty(this.internal, "bigFailureRate", {
		enumerable: true,
		get: function (){ return new Big(node.internal.bigFailureRate); },
		set: function (set){
			if (!(set instanceof Big)) {
				throw new Error(String(set)+" is not a \"Big\" object");
			}
			node.internal.bigFailureRate = Big(set);
			if (!skipConversion) {
				skipConversion = true;
				self.failureRate = node.internal.bigFailureRate.toString();
				skipConversion = false;
			}
		}
	});
	
	//Set what tree the node is attached to
	//Generally this is run by the tree itself
	this.setTree = function (newTree){
		if (newTree.constructor.name === "rtTree") {
			tree = newTree;
			if (!tree.node.inTree(node.internal.id)) {
				//Put the node in the tree
			}
			if (tree.node.inTree(tempParent)) {
				node.parent = tempParent;
				tempParent = null;
			}
		} else {
			throw new Error(newTree.toString()+"is not an rtTree");
		}
	}
	
	//Remove the node
	//Removes it from the map node list and/or its tree, when applicable, and removes the DOM representation
	this.remove = function (){
		if (rtMap) {
			delete rtMap.mapNodes[node.internal.id];
			$("#"+node.internal.id).remove();
		}
		if (tree) {
			//do something
		}
	}
}

function rtTree(json){
	
	//Autoinstantiation
	if (!(this instanceof rtTree)) {
		return rtTree.construct(arguments);
	}
	
	var tree; //The internal tree object
	
	var self = this;
	
	this.util = {}; //All utility functions that can be safely exposed
	
	function isGUID(input){
		return /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/.test(input);
	}
	
	//Basic validation of incoming JSON to see if it uses our data format and therefore is a tree
	this.util.validateRtTree = function (tree){
		var rtAcceptableVersion = /^(\d+\.){2}(\d+G?)$/g;
		var rtAcceptableCalculation = /up|down/g;
		if (
			typeof tree.reliantreeVersion === "string"
		&&	rtAcceptableVersion.test(tree.reliantreeVersion)
		&&	typeof tree.rtServerVersion === "string"
		&&	tree.rtClientVersionList instanceof Array
		&&	tree.rtServerVersionList instanceof Array
		&&	tree.nodes instanceof Object
		&&	typeof tree.treeOrigin === "string"
		&&	typeof tree.calculationMode === "string"
		&&	rtAcceptableCalculation.test(tree.calculationMode)
		) {
			return true;
			//TODO: Validate all object/array members and deeper
			//TODO: Validate the tree as properly linking nodes and not recursing
		} else {
			return false;
		}
	}
	
	//Create a new empty tree
	this.util.emptyRtTree = function (){
		var tree = {};
		tree.reliantreeVersion = rtCurrentVersion;
		tree.rtServerVersion = "";
		tree.rtClientVersionList = [rtCurrentVersion];
		tree.rtServerVersionList = [];
		tree.nodes = {};
		tree.treeOrigin = "";
		tree.calculationMode = "down";
		return tree;
	}
	
	this.util.simpleTraverse = function (tree, ID, callback, depth){
		depth = typeof depth === "number" ? depth : 0;
		if (tree.nodes[ID]) {
			for (child in tree.nodes[ID].children) {
				self.util.simpleTraverse(tree, tree.nodes[ID].children[child], callback, depth+1);
			}
			callback(tree, ID, depth);
		}
	}
	
	//Initialize internal properties and indices from provided tree
	function loadTree(tree){
		var headless = [];
		if (tree.treeOrigin in tree.nodes) {
			var processed = [];
			self.util.simpleTraverse(tree, tree.treeOrigin, function (tree, ID, depth){
				var node = tree.nodes[ID];
				node.internal = {};
				node.internal.level = depth;
				node.internal.bigFailureRate = new Big(node.failureRate);
				processed.push(ID);
			});
			for (ID in tree.nodes) {
				if (processed.indexOf(ID) === -1) {
					headless.push(ID);
				}
			}
		} else {
			for (ID in tree.nodes) {
				headless.push(ID);
			}
		}
		for (node in headless) {
			var node = tree.nodes[headless[node]];
			node.internal = {};
			node.internal.level <= -1;
			node.internal.bigFailureRate = new Big(node.failureRate);
		}
		return tree;
	}
	
	//Initialize the tree, either with an empty tree or the supplied JSON
	if (typeof(json) === "object" && this.util.validateRtTree(json) ) { //If we have been given a valid reliantree, use it
		tree = loadTree(json);
		if (tree.reliantreeVersion != rtCurrentVersion) { //Update version info if not up-to-date
			tree.reliantreeVersion = rtCurrentVersion;
			tree.rtClientVersionList.unshift(rtCurrentVersion);
		}
	} else {
		tree = self.util.emptyRtTree(); //Otherwise, make a new one
	}
	
	//Create a new empty node
	this.util.emptyNode = function (){
		var node = {};
		node.type = null;
		node.title = "";
		node.description = "";
		node.failureRate = "0";
		node.fixedRate = false;
		node.parent = null;
		node.children = [];
		node.internal = {}; //Internal values are stripped before export
		node.internal.bigFailureRate = new Big(0);
		node.internal.level = -1;
		return node;
	}
	
	//Remove node from children of parent
	function removeFromParent (ID){
		tree.nodes[tree.nodes[ID].parent].children.splice(tree.nodes[tree.nodes[ID].parent].children.indexOf(ID),1);
	}
	
	// *** DEPRECATED ***
	this.node = {}; //All node methods
	
	// *** DEPRECATED ***
	//Create a new (empty) node
	this.node.create = function (){
		var newID = Guid(); //Get a new GUID for it
		tree.nodes[newID] = self.util.emptyNode();
		return newID;
	}
	
	// *** DEPRECATED ***
	//Update property (only certain ones) of a node
	this.node.update = function (ID, prop, val){
		var properties = ["type","title","description","failureRate","fixedRate"]; //List of properties allowed to be set directly
		if (tree.nodes[ID] && properties.indexOf(prop) !== -1) { //Verify node exists and property is allowed
			tree.nodes[ID][prop]=val; //Set the property
			return true;
		} else {
			return false;
		}
	}
	
	// *** DEPRECATED ***
	//Retrieve a copy of a node
	this.node.access = function (ID){
		if (tree.nodes[ID]) { //Verify node exists
			return $.extend({}, tree.nodes[ID]); //Copy and return the whole thing
		} else {
			return false;
		}
	}
	
	// *** DEPRECATED ***
	//Set the parent of a node - this is also used for any node moves, as such children are never set directly
	this.node.setParent = function (ID, parentID){
		if (tree.nodes[ID] && tree.nodes[parentID]) { //Verify both nodes exist
			//if (tree.nodes[ID].internal.level >= tree.nodes[parentID].internal.level) { //TODO: implement level calculation elsewhere
				removeFromParent(ID); //Remove node from children of current parent
				tree.nodes[ID].parent = parentID; //Set node's new parent
				tree.nodes[parentID].children.push(ID); //Add node to children of new parent
			//} else {
				//TODO: traversal junk to make sure new parent is not child of node
			//}
		} else {
			return false;
		}
	}
	
	// *** DEPRECATED ***
	//Removes a node, and if explicitly allowed, any child nodes
	this.node.remove = function (ID, verify){
		if (tree.nodes[ID]) { //Verify node exists
			if (tree.nodes[ID].children !== []) { //See if it has children
				if (verify) { //If it does, make sure the intention is to delete them all
					removeFromParent(ID); //Remove node from children of current parent
					var hitList = []; //An array of the GUIDs of all the nodes to be deleted
					self.util.simpleTraverse(tree, ID, function (tree, ID){ //Build list of all children of the node
						hitList.push(ID);
					});
					for(node in hitList){ //Delete all the nodes in the deletion list
						delete tree.nodes[hitList[node]];
					}
					return true;
				} else {
					return false;
				}
			} else { //If it has no children, we can just delete it.
				removeFromParent(ID); //Remove node from children of current parent
				delete tree.nodes[ID];
				return true;
			}
		} else {
			return false;
		}
	}
	
	// *** TRANSITIONAL ***
	//Checks if a node is in the tree (by ID only)
	this.node.inTree = function (ID){
		if (ID in tree.nodes) {
			return true;
		}
		return false;
	}
	
	// *** TRANSITIONAL ***
	//Push a node to the tree
	this.node.push = function (node){
		if (typeof node === "Object" && node.constructor.name === "rtNode") {
			//Do something
		} else {
			throw new Error(node.toString()+" is not an rtNode");
		}
	}
	
	this.tree = {}; //All tree methods
	
	//Set the tree origin
	this.tree.setOrigin = function (ID){
		if (tree.nodes[ID]) {
			var levelDiff = tree.nodes[ID].internal.level;
			self.util.simpleTraverse(tree, ID, function (tree, ID){
				tree.nodes[ID].internal.level -= levelDiff; //Lower the level of everything so that the tree starts at zero
			});
			removeFromParent(ID)
			self.util.simpleTraverse(tree, ID, function (tree, ID){
				tree.nodes[ID].internal.level = tree.nodes[ID].internal.level * -1 - 1; //Change all level data to negative
			});
			tree.treeOrigin = ID;
			tree.nodes[ID].parent = null;
		}
	}
	
	//Return copy of the tree
	this.tree.access = function (){
		return $.extend({}, tree);
	}
	
	//Outputs an object compliant with the Reliantree spec
	this.tree.output = function (){
		var stripped = $.extend({}, tree); //Make a copy to remove internal properties from
		for(node in stripped.nodes){
			delete stripped.nodes[node].internal; //Remove all internal properties from every node
		}
		return stripped;
	}
	
	//Outputs a JSON string compliant with the Reliantree spec
	this.tree.outputJSON = function (){
		var stripped = $.extend({}, tree); //Make a copy to remove internal properties from
		for(node in stripped.nodes){
			delete stripped.nodes[node].internal; //Remove all internal properties from every node
		}
		return JSON.stringify(stripped); //Convert to string and output
	}
}