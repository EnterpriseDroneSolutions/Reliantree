////////////////////Initialization
$(function(){
	//////////Handlers - Interface Niceties
	//Grow leaf node description field with contents.
	$('.rt-leaf-description').on('input', function(){$(this).css({'height':'auto'}).height(this.scrollHeight > 107 ? this.scrollHeight : 107);});
});
