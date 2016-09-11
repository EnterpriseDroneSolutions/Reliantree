/*
rt-map.js - Handles drag and drop logic as well as creation and deletion of nodes in the Reliantree Client.
Copyright (c) 2016 Enterprise Drone Solutions, LLC

This file is part of Reliantree, which is licensed under the GNU Affero General Public License version 3.
You should have received a copy of this license along with Reliantree.  If not, see <http://www.gnu.org/licenses/>.
*/

//Functions for other files
var rtMap = {};
rtMap.mapNodes = {}; //List of all nodes on the map.

rtMap.getNewCoords = function (){
	var emitter = $("#rt-new-node");
	return {left:(emitter.position().left + emitter.width()),top:(emitter.position().top + emitter.height())};
};

////////////////////Handlers
//Auto-grow (and shrink) textarea vertically with content, with an optional minimum and maximum height
function growText(s,minHeight,maxHeight){
	$(s).css({'height':'auto'})
		.height(
			typeof minHeight === "number" ?
				s.scrollHeight > minHeight ?
					typeof maxHeight === "number" ?
						s.scrollHeight < maxHeight ?
							s.scrollHeight
							: maxHeight
						: s.scrollHeight
				: minHeight
			: typeof maxHeight === "number" ?
				s.scrollHeight < maxHeight ?
					s.scrollHeight
					: maxHeight
				: s.scrollHeight
		);
}

//Grow node description field - extension of growText
function growNodeDesc(s){growText(s.target,107);}

// !!! TRANSITIONAL !!!
//Determines if the cursor position of the passed event is in the trash zone
//Returns true if it is above the delete widget
//Returns false if it's not
//Returns null if the argument is invalid
//Params: (string selector, object event)
function ifOver(s, e) {
	if (typeof s !== "string") throw new Error(String(s)+" is not a string");
	if (typeof e === "object" && e.pageX && e.pageY) {
		var holdout = $(s);
		var x1 = holdout.position().left;
		var y1 = holdout.position().top;
		var x2 = x1 + holdout.width();
		var y2 = y1 + holdout.height();
		if (e.pageX >= x1 && e.pageX <= x2 && e.pageY >= y1 && e.pageY <= y2) {
			return true;
		} else {
			return false;
		}
	} else {
		return null;
	}
}

//Pin node to cursor for drag-and-drop action
function dragNode(s,xOffset,yOffset){
	var m = $("#rt-map").position();
	if(typeof xOffset === "number") dragNode.xOffset = xOffset - m.left; //Get a new offset from drag start
	if(typeof yOffset === "number") dragNode.yOffset = yOffset - m.top; //As above
	if(typeof dragNode.xOffset !== "number") dragNode.xOffset = 0; //Initialize offset with zero
	if(typeof dragNode.yOffset !== "number") dragNode.yOffset = 0; //As above
	if(s){
		var x = s.pageX - (dragNode.xOffset + m.left);
		var y = s.pageY - (dragNode.yOffset + m.top);
		var pageW = $(window).width();
		var pageH = $(window).height();
		var det = ifOver("#rt-bin-node", s);
		if (det === false) {
			var bound = 50;
			var scale = 18;
			if(s.pageX<bound){
				autoPan((bound-s.pageX)*scale);
			}else if(s.pageX>pageW-bound){
				autoPan((bound-(pageW-s.pageX))*-scale);
			}else{
				autoPan(0);
			}
			if(s.pageY<bound){
				autoPan(null,(bound-s.pageY)*scale);
			}else if(s.pageY>pageH-bound){
				autoPan(null,(bound-(pageH-s.pageY))*-scale);
			}else{
				autoPan(null,0);
			}
		} else if (det === true) {
			autoPan(0, 0);
		}
		ax = x ? x : dragNode.x - (dragNode.xOffset + m.left);
		ay = y ? y : dragNode.y - (dragNode.yOffset + m.top);
		console.log(dragNode.x);
		console.log(ax);
		$(this).parent().css({
			left: ax,
			top: ay
		}); //Move the node
		$("#rt-node-prototype").css(snapNode($(this).parent())); //Move the preview node
		dragNode.x = x ? s.pageX : dragNode.x;
		dragNode.y = y ? s.pageY : dragNode.y;
	}
}

//Return nearest valid position for a node
function snapNode(node, snap){
	var op = node.position();
	var np = {
		left: op.left,
		top: Math.floor((op.top+80)/200)*200+23
	};
	if(snap){
		node.css(np);
	}else{
		return np;
	}
}

//Pin map to cursor for panning action
function dragMap(s,xStart,yStart){
	if(typeof xStart === "number" && typeof xStart === "number"){
		dragMap.xStart = xStart; //Get a new mouse start point from pan start
		dragMap.yStart = yStart; //As above
		dragMap.oStart = $("#rt-map").position(); //Get map start coords
	}
	if(s){
		s.preventDefault(); //Prevent everything getting selected while panning
		$("#rt-map").css({
			left:	s.pageX-dragMap.xStart+dragMap.oStart.left,
			top:	s.pageY-dragMap.yStart+dragMap.oStart.top < 0 ? s.pageY-dragMap.yStart+dragMap.oStart.top : 0
		}); //Pan the map
	}
}

//Auto-pan map at set velocity (triggered by dragging a node to the end of the screen)
function autoPan(vx,vy){
	var max = 800;
	if(typeof vx === "number") this.vx = vx > -max ? vx < max ? vx : max : -max; //Get new velocity (in pixels per second)
	if(typeof vy === "number") this.vy = vy > -max ? vy < max ? vy : max : -max;
	if((this.vx || this.vy ) && ( vx !== this.vx && vy !== this.vy )){
		var now = window.performance.now ? window.performance.now() : Date.now();
		var dt = this.now ? now-this.now : 16;
		this.now = now;
		var m = $("#rt-map");
		var o = m.position();
		var w = -m.width();
		var h = -m.height();
		var fps = 60;
		var x = this.vx*dt*0.001+o.left;
		var y = this.vy*dt*0.001+o.top;
		if(x>0) x=0;
		if(y>0) y=0;
		if(x<w) x=w;
		if(y<h) y=h;
		m.css({left:x,top:y});
		$(window).triggerHandler("mousemove");
	}
	if(!(this.vx || this.vy)){
		this.now = null;
	}
}

//jQuery extension: drag
//Generic drag-and-drop handler
//Captures mouse movements in the entire window for maximum robustness
//Parameters: (function drag(event), [function on(event), [function off(event)]], [boolean single])
//Drag is called on mouse move.
//On is called on mouse down, if undefined, drag is called on mouse down.
//Off is called on mouse up, if undefined, on is called on mouse up, if undefined, drag is called on mouse up.
//Single, if true, prevents the default handlers for these events. e.g. preventing drag selection
$.fn.drag = function (drag, on, off, single){
	//Argument validation
	if (typeof drag !== "function") {
		throw new Error(String(drag)+" is not a function");
	}
	//Pseudo-overloading
	if (typeof single !== "boolean") {
		//console.log("$.drag(): single not passed");
		single = false;
		if (typeof on === "boolean") {
			//console.log("$.drag(): single redefined as on");
			single = on;
			on = undefined;
		}
		if (typeof off === "boolean") {
			//console.log("$.drag(): single redefined as off");
			single = off;
			off = undefined;
		}
	}
	if (typeof on !== "function") {
		//console.log("$.drag(): on redefined as drag");
		on = drag;
	}
	if (typeof off !== "function") {
		//console.log("$.drag(): off redefined as on");
		off = on;
	}
	$(this)
		.on('mousedown',function(e){ //Start drag-and-drop
			//Copy jQuery "this" to pass to handlers
			var self = this;
			on.call(self, e);
			if (single) e.preventDefault();
			//Interposer-function to prevent default handlers on drag
			function move(e){
				drag.call(self, e); //Call actual drag handler with correct this value for jQuery
				if (single) e.preventDefault();
			}
			$(window)
				.on('mousemove', move)
				.on('mouseup', function stop(e){ //Stop drag-and-drop
					off.call(self, e);
					if (single) e.preventDefault();
					$(this) //The window
						.off('mousemove', move) //Remove drag handler
						.off('mouseup', stop); //Remove this handler
				});
		});
	return this; //Required for jQuery
}

////////////////////Initialization
$(function(){
	
	var lastDragNode = $("#rt-node-prototype");
	
	//Grow node description field with contents when and only when focused.
	$('.rt-node-description')
		.on('focus',function(){
			$(this).on('input', growNodeDesc); //Enable autogrow
			growText(this,107); //Grow to current contents
		})
		.on('blur',function(){
			$(this)
				.off('input', growNodeDesc) //Disable autogrow
				.css({'height':'111'}); //Reset to default height
		});
	
	//Truly and completely prevent selection of anything when clicking and dragging elements with 'preventselect' class
	$('.preventselect').drag(function(e){}, true);
	
	//Drag and drop nodes 
	$('.rt-node-handle').drag(
		dragNode, 
		function(e){ //Begin drag on mousedown on node's handle
			var offset = $(this).parent().position(); //Get the current location of the node
			dragNode(null,e.pageX-offset.left,e.pageY-offset.top); //Set the drag offset to keep the exact part of the handle clicked, under the cursor
			lastDragNode=$(this).parent();
			lastDragNode.css({"opacity":"0.5"});
			var protoNode = $("#rt-node-prototype");
			var currNode = rtMap.mapNodes[lastDragNode.attr("id")];
			protoNode.show().offset(lastDragNode.offset());
			//Copy node data to ghost
			protoNode.find(".rt-node-title").val(currNode.title);
			protoNode.find(".rt-node-description").val(currNode.description);
			protoNode.find(".rt-node-failure-rate").val(currNode.internal.bigFailureRate.toString());
			protoNode.find(".rt-node-reliability-fixed").attr("checked", currNode.fixedRate);
			$("#rt-map-grid").css({"opacity":"1"}); //Show levels grid
		},
		function (e){
			if (ifOver("#rt-bin-node", e)) {
				rtMap.mapNodes[$(this).parent().attr("id")].remove(); //Remove the node if dropped on the remove widget
			} else {
				snapNode(lastDragNode, true); //Snap node to ghost (valid position)
			}
			autoPan(0,0); //Stop autopanning
			$("#rt-map-grid").css({"opacity":"0"}); //Hide levels grid
			lastDragNode.css({"opacity":"1"});
			$("#rt-node-prototype").hide();
		}, 
		true
	);
		
	//Pan map
	$("#rt-map-grid").drag(
		dragMap,
		function(e){ //Begin pan on mousedown on background
			dragMap(null,e.pageX,e.pageY); //Set the mouse startpoint
		}, 
		true
	);
	
	//Autopan map
	$("#rt-map").offset({left:$(window).width()*-4.5}); //Get map into center position
	window.setInterval(autoPan,16.666); //Run panner at ~60fps
	
	//Handle the transition between dragging the new node widget and dragging the new node (on mouseout from the widget)
	function newNodeTransition(e){
		$(window).trigger("mouseup"); //Simulate a mouseup to cancel the widget's drag
		var handle = $("#"+rtNode().internal.id+" .rt-node-handle"); //Make a node and select its (handle's) DOM representation
		handle.parent().offset({left: e.pageX, top: e.pageY}); //Move it to the current cursor location
		handle.trigger(jQuery.Event("mousedown", {pageX: e.pageX, pageY: e.pageY})); //Simulate a mousedown (at the current cursor to position) to start the node's drag
	}
	
	//Grab and drag to create node
	$("#rt-new-node").drag(
		function (e){
			var dist = Math.round(Math.hypot(Math.max(1, e.pageX - this.style.left), Math.max(1, e.pageY - this.style.top)));
			var size = Math.max(this.initSize, Math.min(this.initSize * 1.5, dist / this.initDist * this.initSize));
			$(this).width(size).height(size);
		},
		function (e){
			$(this).on("mouseout", newNodeTransition);
			$(this).addClass("notrans");
			this.initDist = Math.round(Math.hypot(Math.max(1, e.pageX - this.style.left), Math.max(1, e.pageY - this.style.top)));
			this.initSize = $(this).width();
		},
		function (e){
			$(this).off("mouseout", newNodeTransition);
			$(this).removeClass("notrans");
			$(this).width(this.initSize).height(this.initSize);
			delete this.initDist;
			delete this.initSize;
		},
		true
	);
	
	//Test code for multiple nodes.
	for(var i = 0; i<3; i++){
		var newnode = new rtNode("Reliantree", "A tool for creating, analyzing and driving Reliability trees.", 0.000000001, false);
		rtMap.mapNodes[newnode.internal.id] = newnode;
		$('#'+newnode.internal.id).offset({top:8,left:160*i+100});
	}
});