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
};

//Grow node description field - extension of growText
function growNodeDesc(s){growText(s.target,107);}

//Pin node to cursor for drag-and-drop action
function dragNode(s,xOffset,yOffset){
	if(typeof xOffset === "number") this.xOffset = xOffset; //Get a new offset from drag start
	if(typeof yOffset === "number") this.yOffset = yOffset; //As above
	if(typeof this.xOffset !== "number") this.xOffset = 0; //Initialize offset with zero
	if(typeof this.yOffset !== "number") this.yOffset = 0; //As above
	if(s){
		s.preventDefault(); //Prevent everything getting selected while dragging
		$(s.data.targetNode).parent().offset({
			left:	s.pageX-this.xOffset > 0 ? s.pageX-this.xOffset : 0,
			top:	s.pageY-this.yOffset > 0 ? s.pageY-this.yOffset : 0
		}); //Move the node
	}
}

//Pin map to cursor for panning action
function dragMap(s,xStart,yStart){
	if(typeof xStart === "number" && typeof xStart === "number"){
		this.xStart = xStart; //Get a new mouse start point from pan start
		this.yStart = yStart; //As above
		this.oStart = $("#rt-map").offset(); //Get map start coords
	}
	if(s){
		s.preventDefault(); //Prevent everything getting selected while panning
		$("#rt-map").offset({
			left:	s.pageX-this.xStart+this.oStart.left,
			top:	s.pageY-this.yStart+this.oStart.top < 0 ? s.pageY-this.yStart+this.oStart.top : 0
		}); //Pan the map
	}
}


////////////////////Initialization
$(function(){
	
	//////////Handlers - Interface Niceties
	
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
		
	//Drag and drop nodes (copypast 
	$('.rt-node-handle')
		.on('mousedown',function(e){ //Begin drag on mousedown on node's handle
			e.stopPropagation();
			var offset = $(this).offset(); //Get the current location of the node
			dragNode(null,e.pageX-offset.left,e.pageY-offset.top); //Set the drag offset to keep the exact part of the handle clicked, under the cursor
			$(window).on('mousemove', {targetNode: this}, dragNode); //Move the node any time the mouse moves
			$("#rt-map-grid").css({"opacity":"1"}); //Show levels grid
		});
		
	//Pan map
	$("body")
		.on('mousedown',function(e){ //Begin pan on mousedown on background
			dragMap(null,e.pageX,e.pageY); //Set the mouse startpoint
			$(window).on('mousemove', dragMap); //Pan the map any time the mouse moves
		});//*/
	
	//End drag and pan on mouseup anywhere
	$(window)
		.on('mouseup',function(){
			$(window).off('mousemove', dragNode);
			$(window).off('mousemove', dragMap);
			$("#rt-map-grid").css({"opacity":"0"}); //Hide levels grid
		});
	
	//Test code for multiple nodes.
	for(var i = 0; i<3; i++){
		$('#rt-node-prototype').clone(true).show().offset({top:8,left:160*i+50+$(window).width()*5}).appendTo("#rt-nodes");
	}
});