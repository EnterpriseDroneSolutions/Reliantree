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
			"failureRate":0.0001234, //Chance of failure in any hour
			"fixedRate":true, //Whether the above is user-specified (true) or calculated (false) (basically, tree traversal either starts or stops here)
			"parent":null, //The parent node (null if this is the tree origin, else if null then the node is disconnected from the tree and ignored)
			"children":["19a7c415-192e-44b2-b7d9-ec2023e4c539","424892c9-0c0a-4b93-8ec0-ec52b2161c9a"] //The child nodes (empty array if no children)
		},
		"19a7c415-192e-44b2-b7d9-ec2023e4c539":{ //Example of an OR node
			"type":"or", //Specify that this node uses OR calculations on its children
			"title":"Middle Node",
			"description":"It has something above and below it",
			"failureRate":0.0001234,
			"fixedRate":false,
			"parent":"36c86daf-606d-4eca-94b1-2d82f5fa6e38",
			"children":["cbdecc9b-830b-4c9a-a0cd-48bfcea95899","5e599aee-8550-4ee8-bddd-f35184f181fb"]
		},
		"424892c9-0c0a-4b93-8ec0-ec52b2161c9a":{ //Example of an end node
			"type":null, //Type is null if it has no children 
			"title":"End Node",
			"description":"There's nothing below this",
			"failureRate":0.0001234,
			"fixedRate":false,
			"parent":"36c86daf-606d-4eca-94b1-2d82f5fa6e38",
			"children":[]
		},
		"cbdecc9b-830b-4c9a-a0cd-48bfcea95899":{
			"type":null,
			"title":"Branch Terminus",
			"description":"Reliantree sure is refreshing",
			"failureRate":0.0001234,
			"fixedRate":false,
			"parent":"19a7c415-192e-44b2-b7d9-ec2023e4c539",
			"children":[]
		},
		"5e599aee-8550-4ee8-bddd-f35184f181fb":{
			"type":null,
			"title":"A Twig",
			"description":"I was a leaf in a previous life, and a card before that.",
			"failureRate":0.0001234,
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

function rtTree(json){
	
	var tree; //The internal tree object
	
	//Basic validation of incoming JSON to see if it uses our data format and therefore is a tree
	function validateRtTree(tree){
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
	function emptyRtTree(){
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
	
	function simpleTraverse(tree, ID, callback, depth){
		depth = typeof depth === "number" ? depth : 0;
		if (tree.nodes[ID]) {
			for (child in tree.nodes[ID].children) {
				simpleTraverse(tree, tree.nodes[ID].children[child], callback, depth+1);
			}
			callback(tree, ID, depth);
		}
	}
			
	
	//Initialize internal properties and indices from provided tree
	function loadTree(tree){
		var headless = [];
		if (tree.treeOrigin in tree.nodes) {
			var processed = [];
			simpleTraverse(tree, tree.treeOrigin, function (tree, ID, depth){
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
			node.internal.level = depth;
			node.internal.bigFailureRate = new Big(node.failureRate);
		}
		return tree;
	}
	
	//Initialize the tree, either with an empty tree or the supplied JSON
	if (typeof(json) === "object" && validateRtTree(json) ) { //If we have been given a valid reliantree, use it
		tree = loadTree(json);
		if (tree.reliantreeVersion != rtCurrentVersion) { //Update version info if not up-to-date
			tree.reliantreeVersion = rtCurrentVersion;
			tree.rtClientVersionList.unshift(rtCurrentVersion);
		}
	} else {
		tree = emptyRtTree(); //Otherwise, make a new one
	}
	
	//Create a new empty node
	function emptyNode(){
		var node = {};
		node.type = null;
		node.title = "";
		node.description = "";
		node.failureRate = "";
		node.fixedRate = false;
		node.parent = null;
		node.children = [];
		node.internal = {}; //Internal values are stripped before export
		node.internal.bigFailureRate = new Big(0);
		node.internal.level = -1;
		return node;
	}
		
	this.node = {}; //All node methods
	
	//Create a new (empty) node
	this.node.create = function (){
		var newID = Guid(); //Get a new GUID for it
		tree.nodes[newID] = emptyNode();
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
				tree.nodes[tree.nodes[ID].parent].children.splice(tree.nodes[tree.nodes[ID].parent].children.indexOf(ID),1); //Remove node from children of current parent
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
					tree.nodes[tree.nodes[ID].parent].children.splice(tree.nodes[tree.nodes[ID].parent].children.indexOf(ID),1); //Remove node from children of current parent
					var hitList = []; //An array of the GUIDs of all the nodes to be deleted
					simpleTraverse(tree, ID, function (tree, ID){ //Build list of all children of the node
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
				tree.nodes[tree.nodes[ID].parent].children.splice(tree.nodes[tree.nodes[ID].parent].children.indexOf(ID),1); //Remove node from children of current parent
				delete tree.nodes[ID];
				return true;
			}
		} else {
			return false;
		}
	}
	
	this.tree = {}; //All tree methods
	
	//Return copy of the tree
	this.tree.access = function (){
		return $.extend({}, tree);
	}
	
	//Outputs a JSON string compliant with the Reliantree spec
	this.tree.output = function (){
		var stripped = $.extend({}, tree); //Make a copy to remove internal properties from
		for(node in stripped.nodes){
			delete stripped.nodes[node].internal; //Remove all internal properties from every node
		}
		return JSON.stringify(stripped); //Convert to string and output
	}
}