////////////////////Initialization
$(function(){
	//////////Handlers - Interface Niceties
	//Grow card description field with contents.
	$('.rt-card-description').on('input', function(){$(this).css({'height':'auto'}).height(this.scrollHeight > 107 ? this.scrollHeight : 107);});
});