//GUID.js Unit Test, Tests to RFC 4122 version 4 with caps or lowercase
QUnit.module("guid.js");

var acceptableGUIDs = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/;

QUnit.assert.isGUID = function (input, message){
	this.pushResult({
		result: acceptableGUIDs.test(input),
		actual: input,
		expected: "RFC 4122 v4 GUID",
		message: message
	});
};

QUnit.test( "GUID Test", function( assert ) {
  for (i = 0; i < 10; i++) { 
    var testGuid = Guid()
    assert.isGUID(testGuid, "Test GUID: "+testGuid );
  }
});

QUnit.assert.construct = function (input, construct, message){
	this.pushResult({
		result: input.constructor.name === construct,
		actual: input.constructor.name,
		expected: construct,
		message: message
	});
};

QUnit.assert.type = function (input, type, message){
	this.pushResult({
		result: typeof input === type,
		actual: typeof input,
		expected: type,
		message: message
	});
};
	
QUnit.assert.isArray = function (input, message){
	this.construct(input, "Array", message);
};

QUnit.assert.isObject = function (input, message){
	this.construct(input, "Object", message);
};

QUnit.assert.isString = function (input, message){
	this.type(input, "string", message);
};

QUnit.assert.isNumber = function (input, message){
	this.type(input, "number", message);
};

QUnit.assert.isBoolean = function (input, message){
	this.type(input, "boolean", message);
};

QUnit.assert.isUndefined = function (input, message){
	this.type(input, "undefined", message);
};

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

QUnit.assert.isValidVersion = function (version, message){
	this.pushResult({
		result: /^(\d+\.){2}(\d+G?)$/g.test(version),
		actual: version,
		expected: "Reliantree version number",
		message: message
	});
}

QUnit.assert.isValidTree = function (tree, message, internal, strict){
	this.isObject(tree, message+": Tree is object");
	if(tree instanceof Object){
		this.isValidVersion(tree.reliantreeVersion, message+": Valid current version number");
		this.isArray(tree.rtClientVersionList, message+": Has client version array");
		this.equal(tree.reliantreeVersion, tree.rtClientVersionList[0], message+": Latest client is current client");
		for (version in tree.rtClientVersionList) {
			this.isValidVersion(tree.rtClientVersionList[version], message+": In client version list: Valid version number");
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
		for (version in tree.rtServerVersionList) {
			this.isValidVersion(tree.rtServerVersionList[version], message+": In server version list: Valid version number");
		}
		this.isObject(tree.nodes, message+": Has node object");
		if (strict === true) {
			this.pushResult({
				result: Object.keys(tree.nodes).length > 0,
				actual: Object.keys(tree.nodes).length,
				expected: "One or more nodes",
				message: message+": Has nodes"
			});
			this.isGUID(tree.treeOrigin, message+": Valid tree origin");
		} else {
			this.pushResult({
				result: acceptableGUIDs.test(tree.treeOrigin) || tree.treeOrigin === "",
				actual: tree.treeOrigin,
				expected: "RFC 4122 v4 GUID or empty string",
				message: message+": Valid or no tree origin"
			});
		}
		for(node in tree.nodes){
			this.isValidNode(node, message+": Validating node "+node, internal, tree);
		}
	}
};

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
	
//Creates array of decreasing version numbers starting with the current one for unit testing purposes
//Since trees are only allowed to be processed by the last version opening them or newer, each version in the history must be lower than the next.
function decreasingVersionList(start, count){
	var list = [start];
	var outList = [start.vn];
	var maxCount = (start.major + 1) * (start.minor + 1) * (start.revision + 1);
	count = ( count <= maxCount ) ? count : maxCount;
	for (i = 1; i <= count; i++) {
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

//Generates (read: will generate) a valid tree
function generateValidTree(){
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
	tree.treeOrigin = "";
	return tree;
}

QUnit.test("generateValidTree intial test", function (assert){
	assert.isValidTree(generateValidTree(), "Validating resultant tree", false, false);
});