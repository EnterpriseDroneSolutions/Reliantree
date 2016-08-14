/*
rt-drag.js - Handles drag and drop logic as well as creation and deletion of nodes in the Reliantree Client.
Copyright (c) 2016 Enterprise Drone Solutions, LLC

This file is part of Reliantree, which is licensed under the GNU Affero General Public License version 3.
You should have received a copy of this license along with Reliantree.  If not, see <http://www.gnu.org/licenses/>.
*/

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

//Pin node to cursor for drag-and-drop action
function dragNode(s,xOffset,yOffset){
	if(typeof xOffset === "number") this.xOffset = xOffset; //Get a new offset from drag start
	if(typeof yOffset === "number") this.yOffset = yOffset; //As above
	if(typeof this.xOffset !== "number") this.xOffset = 0; //Initialize offset with zero
	if(typeof this.yOffset !== "number") this.yOffset = 0; //As above
	if(s && s.data.targetNode){
		s.preventDefault(); //Prevent everything getting selected while dragging
		var x = s.pageX-this.xOffset;
		var y = s.pageY-this.yOffset;
		var pageW = $(window).width();
		var pageH = $(window).height();
		var m = $("#rt-map").position();
		if(s.pageX && s.pageY){
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
		}
		x = x ? x : this.x;
		y = y ? y : this.y;
		$(s.data.targetNode).parent().css({
			left: x,
			top: y
		}); //Move the node
		$("#rt-node-prototype").css(snapNode($(s.data.targetNode).parent())); //Move the preview node
		this.x = x ? x : this.x;
		this.y = y ? y : this.y;
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
		this.xStart = xStart; //Get a new mouse start point from pan start
		this.yStart = yStart; //As above
		this.oStart = $("#rt-map").position(); //Get map start coords
	}
	if(s){
		s.preventDefault(); //Prevent everything getting selected while panning
		$("#rt-map").css({
			left:	s.pageX-this.xStart+this.oStart.left,
			top:	s.pageY-this.yStart+this.oStart.top < 0 ? s.pageY-this.yStart+this.oStart.top : 0
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
		
	//Drag and drop nodes 
	$('.rt-node-handle')
		.on('mousedown',function(e){ //Begin drag on mousedown on node's handle
			e.stopPropagation();
			var offset = $(this).parent().position(); //Get the current location of the node
			dragNode(null,e.pageX-offset.left,e.pageY-offset.top); //Set the drag offset to keep the exact part of the handle clicked, under the cursor
			lastDragNode=$(this).parent();
			lastDragNode.css({"opacity":"0.5"});
			$("#rt-node-prototype").show().offset(lastDragNode.offset());
			$(window).on('mousemove', {targetNode: this}, dragNode); //Move the node any time the mouse moves
			$("#rt-map-grid").css({"opacity":"1"}); //Show levels grid
		});
		
	//Pan map
	$("#rt-map")
		.on('mousedown',"#rt-map-grid",function(e){ //Begin pan on mousedown on background
			dragMap(null,e.pageX,e.pageY); //Set the mouse startpoint
			$(window).on('mousemove', dragMap); //Pan the map any time the mouse moves
		});
	
	//End drag and pan on mouseup anywhere
	$(window)
		.on('mouseup',function(){
			$(window).off('mousemove', dragNode);
			$(window).off('mousemove', dragMap);
			autoPan(0,0); //Stop autopanning
			$("#rt-map-grid").css({"opacity":"0"}); //Hide levels grid
			lastDragNode.css({"opacity":"1"});
			snapNode(lastDragNode, true);
			$("#rt-node-prototype").hide();
		});
	
	//Autopan map
	$("#rt-map").offset({left:$(window).width()*-4.5}); //Get map into center position
	window.setInterval(autoPan,16.666); //Run panner at ~60fps
	
	//Test code for multiple nodes.
	for(var i = 0; i<3; i++){
		$('#rt-node-prototype').clone(true).removeAttr("id").show().offset({top:8,left:160*i+50+$(window).width()*4.5}).appendTo("#rt-nodes");
	}
});