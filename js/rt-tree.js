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


//Reliantree-compliant version number type with comparison operators
//Will fill any non-supplied fields with random data (for use in unit testing).
function rtVersionNumber(initial, minor, revision, gold){
	
	//Autoinstantiation
	if (!(this instanceof rtVersionNumber)) {
		return new rtVersionNumber(arguments, true);
	}	
	
	//Internals
	var vn = {};
	var self = this;
	
	//Reused regex
	var acceptableVersionNumber = /^(\d+\.){2}(\d+G?)$/;
	var acceptableNumber = /^[0-9]+$/g;
	var acceptableBoolean = /^true|false$/i;
	
	//String parser
	function parseVersionNumber(input){
		if (typeof input === "string" && acceptableVersionNumber.test(input)) {
			var split = input.split(".");
			vn.major = parseInt(split[0]);
			vn.minor = parseInt(split[1]);
			vn.revision = parseInt(split[2]);
			vn.gold = input.includes("G");
			return true;
		} else {
			return false;
		}
	}
	
	//Constructor
	if (initial instanceof Object && minor === true) {
		gold = initial[3];
		revision = initial[2];
		minor = initial[1];
		initial = initial[0];
	}
	if (!parseVersionNumber(initial)) {
		if (typeof initial === "number" && initial >= 0) {
			vn.major = initial;
		} else {
			vn.major = Math.floor(Math.random() * 10);
		}
		if (typeof minor === "number" && minor >= 0) {
			vn.minor = minor;
		} else {
			vn.minor = Math.floor(Math.random() * 30);
		}
		if (typeof revision === "number" && revision >= 0) {
			vn.revision = revision;
		} else {
			vn.revision = Math.floor(Math.random() * 50);
		}
		if (typeof gold === "boolean") {
			vn.gold = gold;
		} else {
			vn.gold = Math.round(Math.random()) ? true : false;
		}
	}
	
	//Generic setter for version number numeric property
	function setVnNumericProp(set, prop){
		if (prop in vn) {
			if (typeof set === "number" && set >= 0) {
				vn[prop] = set;
			} else if (typeof set === "string" && acceptableNumber.test(set)) {
				vn[prop] = parseInt(set);
			} else {
				throw "Invalid input!";
			}
		} else {
			throw "Nonexistant property!";
		}
	}
	
	//Generic setter for version number boolean property
	function setVnBooleanProp(set, prop){
		if (prop in vn) {
			if (typeof set === "boolean") {
				vn[prop] = set;
			} else if (typeof set === "string" && acceptableBoolean.test(set)) {
				vn[prop] = set.toLowerString() == "true" ? true : false;
			} else if (typeof set === "number") {
				vn[prop] = set ? true : false;
			} else {
				throw "Invalid input!";
			}
		} else {
			throw "Nonexistant property!";
		}
	}
	
	//Generic external property definer
	function addVnExternalProp(prop, bool){
		if (prop in vn) {
			var props = {
				enumerable: true,
				get : function (){ return vn[prop]; }
			};
			if (bool === true) {
				props.set = function (set){ setVnBooleanProp(set, prop); };
			} else {
				props.set = function (set){ setVnNumericProp(set, prop); };
			}
			Object.defineProperty(self, prop, props);
		} else {
			throw "Nonexistant property!";
		}
	}
	
	//Basic exposed properties
	addVnExternalProp("major",		false	);
	addVnExternalProp("minor",		false	);
	addVnExternalProp("revision",	false	);
	addVnExternalProp("gold",		true	);
	
	//Exports version number as string
	self.toString = function (){
		return vn.major.toString() + "." + vn.minor.toString() + "." + vn.revision.toString() + (vn.gold ? "G" : "");
	}
	
	//Version number string get/set
	Object.defineProperty(self, "vn", {
		get: self.toString,
		set: function (set){
				if (!parseVersionNumber(set)) {
					throw "Invalid input!";
				}
			}
	});
	
	//Check if another version number is equal to this one.
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
			} else if (direction ? (vn.minor > rtvn.minor) : (vn.minor < rtvn.minor)) {
				return true;
			} else if (direction ? (vn.revision > rtvn.revision) : (vn.revision < rtvn.revision)) {
				return true;
			} else if (equal === true && self.equals(rtvn, weak)) {
				return true;
			} else if (equal === false && weak === true && vn.gold != rtvn.gold) {
				return true;
			} else {
				return false;
			}
		} else {
			throw "Input is " + rtvn.constructor.name + ", not rtVersionNumber!";
		}
	}
		
	//Version number comparison operators
	self.greaterThan		= function (rtvn)		{return cascadingComparison(rtvn,	true,	false,	false	);};
	self.greaterThanOrEqual	= function (rtvn, weak)	{return cascadingComparison(rtvn,	true,	true,	weak	);};
	self.lessThan			= function (rtvn)		{return cascadingComparison(rtvn,	false,	false,	false	);};
	self.lessThanOrEqual	= function (rtvn, weak)	{return cascadingComparison(rtvn,	false,	true,	weak	);};
	self.lessThan_GoldXor	= function (rtvn)		{return cascadingComparison(rtvn,	false,	false,	true	);};
};

function rtTree(json){
	
	//Autoinstantiation
	if (!(this instanceof rtTree)) {
		return new rtTree(json);
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
	
	this.node = {}; //All node methods
	
	//Create a new (empty) node
	this.node.create = function (){
		var newID = Guid(); //Get a new GUID for it
		tree.nodes[newID] = self.util.emptyNode();
		return newID;
	}
	
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
	
	//Retrieve a copy of a node
	this.node.access = function (ID){
		if (tree.nodes[ID]) { //Verify node exists
			return $.extend({}, tree.nodes[ID]); //Copy and return the whole thing
		} else {
			return false;
		}
	}
	
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