//rt-drag.js - handles the drag and drop logic as well as creation and deletion of nodes.

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
		$(s.data.targetNode).parent().offset({left:s.pageX-this.xOffset,top:s.pageY-this.yOffset}) //Move the node
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
	//Drag and drop nodes
	$('.rt-node-handle')
		.on('mousedown',function(e){ //Begin drag on mousedown on node's handle
			var offset = $(this).offset(); //Get the current location of the node
			dragNode(null,e.pageX-offset.left,e.pageY-offset.top); //Set the drag offset to keep the exact part of the handle clicked, under the cursor
			$(window).on('mousemove', {targetNode: this}, dragNode); //Move the node any time the mouse moves
		})
	$(window)
		.on('mouseup',function(){ //End drag on mouseup anywhere
			$(window).off('mousemove', dragNode);
		});
	$('#rt-node-prototype').clone(true).offset({top:8,left:200}).appendTo("body"); //Test code for multiple nodes.
});