/*
tests.js - Unit testing for the Reliantree Client, plus some random data generators.
Copyright (c) 2016 Enterprise Drone Solutions, LLC

This file is part of Reliantree, which is licensed under the GNU Affero General Public License version 3.
You should have received a copy of this license along with Reliantree.  If not, see <http://www.gnu.org/licenses/>.
*/

//////////////////////////////////////////////////Testing functions (with other uses)

//Tree traversal with features specific to validation
function validationTraverse (assert, tree, ID, callback, depth, up){
	depth = typeof depth === "number" ? depth : 0;
	up = typeof up === "string" ? up : null;
	if (tree.nodes[ID]) {
		if (callback(assert, tree, ID, depth, up)) {
			for (child in tree.nodes[ID].children) {
				validationTraverse(assert, tree, tree.nodes[ID].children[child], callback, depth+1, ID);
			}
		}
	}
}

//Creates array of decreasing version numbers starting with the current one for unit testing purposes
//Since trees are only allowed to be processed by the last version opening them or newer, each version in the history must be lower than the next.
function decreasingVersionList(start, count){
	var list = [start];
	var outList = [start.vn];
	var maxCount = (start.major + 1) * (start.minor + 1) * (start.revision + 1);
	count = ( count <= maxCount ) ? count : maxCount;
	for (var i = 1; i <= count; i++) {
		list[i] = new rtVersionNumber(list[i-1].vn);
		list[i].major = Math.round(start.major * (count-i) / count);
		list[i].minor = ( list[i].major < list[i-1].major ) ? ( list[i].minor = Math.floor(Math.random() * 30) ) : ( list[i].minor = Math.floor(Math.random() * list[i-1].minor) );
		list[i].revision = ( list[i].minor < list[i-1].minor ) ? ( list[i].revision = Math.floor(Math.random() * 30) ) : ( list[i].revision = Math.floor(Math.random() * list[i-1].revision) );
		if (list[i].major == 0 && list[i].minor == 0 && list[i].revision == 0){
			list[i].revision = 1;
		}
		if (list[i].equals(list[i-1])) {
			list[i].gold = !list[i-1].gold;
		} else {
			list[i].gold = Math.round(Math.random()) ? true : false;
		}
		outList[i] = list[i].vn;
	}
	return outList;
}

//Picks an item at random from an array
function pickItem(array){
	if (array instanceof Array) {
		return array[Math.floor(Math.random() * array.length)];
	} else {
		return false;
	}
}

//Generates a valid node
function generateValidNode(internal, spoof){
	var node = {};
	//really, i'm having too much fun with this
	var descriptors = ["Exciting ","Unusual ","Capitalist ","Communist ","Reliable ","Defective ","Eternal ","Chinese ","Typical ","Paranormal "];
	var colors = ["Red ","Blue ","Green ","Aquamarine ","Glowing ","Red-Hot ","Violet ","Bedazzled ","Hot Pink ","Clear "];
	var things = ["Propeller","Motor","Capacitor","Resistor","Diode","Cable","Théa","Apparatus","Vessel","Lamp"];
	var qualities = ["high-quality","medium-quality","low-quality","variable-quality","quality","acceptable","passable","low-binned","top-binned","previously binned"];
	var origins = ["USA","PRC","UK","DPRK","ROK","Middle East","ocean","Sun","USSR","void"];
	var sure = ["sure","bound","destined","created solely","hand-crafted","guaranteed","desperate","hoping","willing","here"];
	var effects = ["joy","incontinence","$100","a headache","cancer","a promotion","Terminal 7","undying love","pleasure","satisfaction"];
	node.type = null;
	node.title = ( Math.random() > 0.2 ? pickItem(descriptors) : "" )+( Math.random() > 0.2 ? pickItem(colors) : "" )+pickItem(things);
	node.description = "This "+pickItem(qualities)+" "+node.title+", made in the "+pickItem(origins)+", is "+pickItem(sure)+" to give you "+pickItem(effects)+"!";
	node.failureRate = Math.pow(Math.random(), 3).toFixed(Math.floor(Math.random() * 4) + 8);
	node.fixedRate = Math.round(Math.random()) ? true : false;
	if (spoof === true) {
		node.parent = Math.random() > 0.08 ? Guid() : null;
		node.children = [];
		var choice = Math.floor(Math.random() * 3);
		if (choice == 0) {
			node.type = "and";
		} else if (choice == 1) {
			node.type = "or";
		} else {
			node.type = null;
		}
		if (node.type !== null) {
			var childCount = Math.round(Math.random() * 6);
			for (var i = 0; i < childCount; i++) {
				node.children[i] = Guid();
			}
		}
	} else {
		node.parent = null;
		node.children = [];
	}
	if (internal === true) {
		node.internal = {};
		if (spoof === true) {
			node.internal.level = Math.floor(Math.random() * 21) - 10;
		} else {
			node.internal.level = -1;
		}
		node.internal.bigFailureRate = new Big(node.failureRate);
	}
	return node;
}

//Generates (read: will generate) a valid tree
function generateValidTree(internal){
	internal = typeof internal !== "undefined" ? internal : false;
	var tree = {};
	var majorVersion = Math.floor(Math.random() * 10);
	var reliantreeVersion = new rtVersionNumber(majorVersion);
	tree.reliantreeVersion = reliantreeVersion.vn;
	var rtServerVersion = new rtVersionNumber(majorVersion);
	tree.rtServerVersion = rtServerVersion.vn;
	tree.rtClientVersionList = decreasingVersionList(reliantreeVersion, Math.ceil(Math.random() * 9));
	tree.rtServerVersionList = decreasingVersionList(rtServerVersion, Math.ceil(Math.random() * 9));
	tree.calculationMode = Math.round(Math.random()) ? "up" : "down";
	tree.nodes = {};
	var nodeCount = Math.ceil(Math.random() * 100);
	for (var i = 0; i < nodeCount; i++) {
		tree.nodes[Guid()] = generateValidNode(internal, false);
	}
	var nodeList = Object.keys(tree.nodes);
	tree.treeOrigin = pickItem(nodeList);
	var usedNodes = [tree.treeOrigin];
	validationTraverse(null, tree, tree.treeOrigin, function (assert, tree, ID, depth, up){
		tree.nodes[ID].parent = up;
		//Build unused node list
		var availableNodes = [];
		for (var i = 0; i < nodeList.length; i++) {
			if (usedNodes.indexOf(nodeList[i]) === -1) {
				availableNodes.push(nodeList[i]);
			}
		}
		var childCount = Math.floor(Math.random() * 6);
		if (depth<2) {
			childCount++;
		}
		for (var i = 0; i < childCount; i++) {
			if (availableNodes.length > 0) {
				var pos = Math.floor(Math.random() * availableNodes.length);
				tree.nodes[ID].children[i] = availableNodes[pos];
				usedNodes.push(availableNodes[pos]);
				availableNodes.splice(pos,1);
			}
		}
		if (tree.nodes[ID].children.length == 0) {
			tree.nodes[ID].type = null;
		} else {
			tree.nodes[ID].type = Math.round(Math.random()) ? "and" : "or";
		}
		if (internal === true) {
			tree.nodes[ID].internal.level = depth;
		}
		return true;
	});
	return tree;
}

//////////////////////////////////////////////////QUnit Part

if (typeof QUnit === "object") {
	//////////Custom assertions to reduce reptition throughout the code
	
	//Regex to match GUID
	var acceptableGUIDs = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/;
	
	//See if the input is a GUID
	QUnit.assert.isGUID = function (input, message){
		this.pushResult({
			result: acceptableGUIDs.test(input),
			actual: input,
			expected: "RFC 4122 v4 GUID",
			message: message
		});
	};
	
	//Verify input has a certain constructor
	QUnit.assert.construct = function (input, construct, message){
		this.pushResult({
			result: input.constructor.name === construct,
			actual: input.constructor.name,
			expected: construct,
			message: message
		});
	};
	
	//Verify the input is a certain type
	QUnit.assert.type = function (input, type, message){
		this.pushResult({
			result: typeof input === type,
			actual: typeof input,
			expected: type,
			message: message
		});
	};
	
	//Verify the input is an array
	QUnit.assert.isArray = function (input, message){
		this.construct(input, "Array", message);
	};
	
	//Verify a value is in an array
	QUnit.assert.inArray = function (array, value, message){
		this.pushResult({
			result: array.indexOf(value) !== -1,
			actual: array.indexOf(value),
			expected: "Zero or higher",
			message: message
		});
	};
	
	//Verify the input is an object
	QUnit.assert.isObject = function (input, message){
		this.construct(input, "Object", message);
	};
	
	//Verify an object has a certain key
	QUnit.assert.keyInObject = function (object, key, message){
		this.pushResult({
			result: key in object,
			actual: key in object,
			expected: true,
			message: message
		});
	};
	
	//Verify the input is a string
	QUnit.assert.isString = function (input, message){
		this.type(input, "string", message);
	};
	
	//Verify the input is a number
	QUnit.assert.isNumber = function (input, message){
		this.type(input, "number", message);
	};
	
	//Verify the input is a boolean
	QUnit.assert.isBoolean = function (input, message){
		this.type(input, "boolean", message);
	};
	
	//Verify the input is undefined
	QUnit.assert.isUndefined = function (input, message){
		this.type(input, "undefined", message);
	};
	
	//Verify a Reliantree node is valid
	QUnit.assert.isValidNode = function (node, message, internal, tree){
		if (typeof tree === "object" && /^(\d+\.){2}(\d+G?)$/g.test(tree.reliantreeVersion) && typeof node === "string") { //Verify we are in tree mode and tree is valid
			this.isGUID(node, message+": Valid node reference");
			if (tree.nodes[node]) {
				this.pushResult({
					result: true,
					actual: node,
					expected: "Node in tree",
					message: message+": Node in tree"
				});
				node = tree.nodes[node];
				this.pushResult({
					result: node.parent in tree.nodes || node.parent === null,
					actual: node.parent,
					expected: "Parent in tree or null",
					message: message+": Valid parent reference"
				});
				this.isArray(node.children, message+": Has child array");
				if (node.type === null) {
					this.equal(node.children.length, 0, message+": Has no children if end node");
				}
				for (child in node.children) {
					this.pushResult({
						result: node.children[child] in tree.nodes,
						actual: node.children[child],
						expected: "Child in tree",
						message: message+": Valid child reference"
					});
				}
			} else {
				this.pushResult({
					result: false,
					actual: node,
					expected: "Node in tree",
					message: message+": Node NOT in tree"
				});
				return;
			}
		} else if (typeof node === "object") {
			this.pushResult({
				result: acceptableGUIDs.test(input) || input === null,
				actual: input,
				expected: "RFC 4122 v4 GUID or null",
				message: message+": Valid parent"
			});
			this.isArray(node.children, message+": Has child array");
			for (child in node.children) {
				this.isGUID(node.children[child], message+": Valid child");
			}
		} else {
			this.pushResult({
				result: false,
				actual: node,
				expected: "A node object",
				message: message+": Not passed valid node or node reference!"
			});
		}
		this.pushResult({
			result: node.type === "and" || node.type === "or" || node.type === null,
			actual: node.type,
			expected: "'and', 'or' or null",
			message: message+": Valid node type"
		});
		this.isString(node.title, message+": Has string title");
		this.isString(node.description, message+": Has string description");
		this.isString(node.failureRate, message+": Has failure rate");
		this.isBoolean(node.fixedRate, message+": Has fixedRate flag");
		if (internal === true) {
			this.isObject(node.internal, message+": Has internal object");
			this.isNumber(node.internal.level, message+": Has level index");
			var validBig = node.internal.bigFailureRate.constructor.name === "Big";
			this.pushResult({
				result: validBig,
				actual: node.internal.bigFailureRate.constructor.name,
				expected: "Big",
				message: message+": Has Big bigFailureRate"
			});
			if (validBig) {
				this.pushResult({
					result: node.internal.bigFailureRate.toString() === node.failureRate,
					actual: node.internal.bigFailureRate.toString(),
					expected: node.failureRate,
					message: message+": bigFailureRate equivalent to failureRate"
				});
			}
		} else {
			this.isUndefined(node.internal, message+": Has no internal object");
		}
	};
	
	//Verify a Reliantree version is valid
	QUnit.assert.isValidVersion = function (version, message){
		this.pushResult({
			result: /^(\d+\.){2}(\d+G?)$/g.test(version),
			actual: version,
			expected: "Reliantree version number",
			message: message
		});
	}
	
	//Verify a Reliantree tree is valid
	QUnit.assert.isValidTree = function (tree, message, internal, strict){
		this.isObject(tree, message+": Tree is object");
		if(tree instanceof Object){
			this.isValidVersion(tree.reliantreeVersion, message+": Valid current version number");
			this.isArray(tree.rtClientVersionList, message+": Has client version array");
			this.equal(tree.reliantreeVersion, tree.rtClientVersionList[0], message+": Latest client is current client");
			for (var version = 1; version < tree.rtClientVersionList.length; version++) {
				this.isValidVersion(tree.rtClientVersionList[version], message+": In client version list: Valid version number");
				this.pushResult({
					result: rtVersionNumber(tree.rtClientVersionList[version]).lessThan_GoldXor(rtVersionNumber(tree.rtClientVersionList[version-1])),
					actual: tree.rtClientVersionList[version],
					expected: "Lower version number than "+tree.rtClientVersionList[version-1],
					message: message+": In client version list: Version number lower than previous"
				});
			}
			this.pushResult({
				result: /^(\d+\.){2}(\d+G?)$/g.test(tree.rtServerVersion) || tree.rtServerVersion === "",
				actual: tree.rtServerVersion,
				expected: "Reliantree version number or empty string",
				message: message+": Valid server version number"
			});
			this.isArray(tree.rtServerVersionList, message+": Has server version array");
			this.pushResult({
				result: tree.rtServerVersion === tree.rtServerVersionList[0] || (tree.rtServerVersionList.length === 0 && tree.rtServerVersion === ""),
				actual: tree.rtServerVersionList[0],
				expected: "Same version number or no server version records",
				message: message+": Latest server is current server"
			});
			for (var version = 1; version < tree.rtServerVersionList.length; version++) {
				this.isValidVersion(tree.rtServerVersionList[version], message+": In server version list: Valid version number");
				this.pushResult({
					result: rtVersionNumber(tree.rtServerVersionList[version]).lessThan_GoldXor(rtVersionNumber(tree.rtServerVersionList[version-1])),
					actual: tree.rtServerVersionList[version],
					expected: "Lower version number than "+tree.rtServerVersionList[version-1],
					message: message+": In server version list: Version number lower than previous"
				});
			}
			this.isObject(tree.nodes, message+": Has node object");
			for(node in tree.nodes){
				this.isValidNode(node, message+": Validating node "+node, internal, tree);
			}
			if (strict === true) {
				this.pushResult({
					result: Object.keys(tree.nodes).length > 0,
					actual: Object.keys(tree.nodes).length,
					expected: "One or more nodes",
					message: message+": Has nodes"
				});
				this.keyInObject(tree.nodes,tree.treeOrigin, message+": Valid tree origin");
				var touchedNodes = [];
				validationTraverse(this, tree, tree.treeOrigin, function (assert, tree, ID, depth, up){
					assert.equal(tree.nodes[ID].parent, up, message+": Traversing Tree: Node "+ID+": Parent correct");
					if (internal === true) {
						assert.equal(tree.nodes[ID].internal.level, depth, message+": Traversing Tree: Node "+ID+": Level correct");
					}
					if (touchedNodes.indexOf(ID) === -1) {
						touchedNodes.push(ID);
						assert.pushResult({
							result: true,
							actual: "Node not already visited",
							expected: "Node not already visited",
							message: message+": Traversing Tree: Node "+ID+": Tree not recursing"
						});
						return true;
					} else {
						assert.pushResult({
							result: false,
							actual: "Node already visited",
							expected: "Node not already visited",
							message: message+": Traversing Tree: Node "+ID+": Tree recursion encountered! Invalid Tree!"
						});
						return false;
					}
				});
			} else {
				this.pushResult({
					result: acceptableGUIDs.test(tree.treeOrigin) || tree.treeOrigin === "",
					actual: tree.treeOrigin,
					expected: "RFC 4122 v4 GUID or empty string",
					message: message+": Valid or no tree origin"
				});
			}
		}
	};
	
	//////////GUID.js Unit Test, Tests to RFC 4122 version 4 with caps or lowercase
	QUnit.module("guid.js");
	
	QUnit.test( "GUID Test", function( assert ) {
	for (var i = 0; i < 10; i++) { 
		var testGuid = Guid()
		assert.isGUID(testGuid, "Test GUID: "+testGuid );
	}
	});
	
	//////////rt-tree.js Unit Test, verifies all functionality of the constructors within
	QUnit.module("rt-tree.js");
	
	QUnit.test("rtTree Constructor Empty", function (assert){
		var rtTest = new rtTree();
		assert.isValidTree(rtTest.tree.access(), "Validating resultant tree", true);
	});
	
	QUnit.test("rtTree Constructor Sample", function (assert){
		var rtTest = new rtTree(sampleTree);
		assert.isValidTree(rtTest.tree.access(), "Validating resultant tree", true, true);
	});
	
	QUnit.test("New node check", function (assert){
		var rtTest = new rtTree(sampleTree);
		var ID = rtTest.node.create();
		var tree = rtTest.tree.access();
		assert.isValidNode(ID, "Node is valid", true, tree);
	});
	
	QUnit.test("Export sample tree", function (assert){
		var rtTest = new rtTree(sampleTree);
		var output = rtTest.tree.output();
		assert.isValidTree(rtTest.tree.output(), "Validating resultant tree", false, true);
		assert.deepEqual(output, sampleTree, "rtTree output equivalent to constructor input");
	});
	
	QUnit.test("Validate sample tree", function (assert){
		assert.isValidTree(sampleTree, "Validating sample tree", false, true);
	});
	
	QUnit.test("generateValidTree 25X Test", function (assert){
		for (i = 0; i < 25; i++) {
			assert.isValidTree(generateValidTree(), "Validating resultant tree", false, true);
		}
	});
}