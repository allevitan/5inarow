$(document).ready(function(){
    
    socket = io();
    
    setupBoard();
    setupInput();
    setupResponse();

    socket.emit('join',$('#gamename').attr('name'));
    
});

function setupBoard(){
    var grid = $('#grid');
    for (var i = 0; i < 18; i++){
	var row = $('<tr row="' + i + '"></tr>').appendTo(grid)
	for (var j = 0; j < 18; j++) {
	    $('<td class="tile" row="' + i + '" col="' + j + '"></td>').appendTo(row)
	}
    }
}

function setupInput(){
   $('#board').on('click', function(e){
       var x = e.pageX - $('#grid').offset().left;
       var y = e.pageY - $('#grid').offset().top;
       x = Math.round(x / $('#grid').width() * 18);
       y = Math.round(y / $('#grid').height() * 18);
       color = $('#color').attr('color');
       game = $('#gamename').attr('name');
       socket.emit('move', {game:game,
			    color:color,
			    x:x, y:y});
   });
}

function setupResponse(){ 
    socket.on('move', function(msg){
	myColor = $('#color').attr('color');
	if (msg.color == 'black' && myColor == 'black'){
	    $('#statusbar').text('you are black - white to move');	    
	} else if (msg.color == 'black' && myColor == 'white'){
	    $('#statusbar').text('you are white - your move');	    
	} else if (msg.color == 'white' && myColor == 'black'){
	    $('#statusbar').text('you are black - your move');	    
	} else {
	    $('#statusbar').text('you are white - black to move');	    
	}
	var newStone = $(makeStone(msg.color));
	x = msg.x * $('#grid').width() / 18 + 4;
	y = msg.y * $('#grid').height() / 18 + 4;
	newStone.css('top',y).css('left',x).appendTo('#board');
    });
    socket.on('win', function(who){
	$('#statusbar').text(who + ' won!');
    });
}

function makeStone(color){
    return '<svg class="stone" height="40" width="40"><circle cx="20" cy="20" r="15" stroke="black" fill="' + color + '"/></svg>'
}
    