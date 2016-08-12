////////////////////Initialization
$(function(){
	//////////Handlers - Interface Niceties
	//Grow node description field with contents.
	$('.rt-node-description').on('input', function(){$(this).css({'height':'auto'}).height(this.scrollHeight > 107 ? this.scrollHeight : 107);});
});