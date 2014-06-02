$(document).ready(function(){
    
    socket = io();
    
    setupBoard();
    setupInput();
    setupResponse();

    socket.emit('join',$('#gamename').attr('name'));
    
});

function setupBoard(){
    var grid = $('#grid');
    w = grid.attr('width') - 2
    h = grid.attr('height') - 2;
    winc = w / 18;
    hinc = h / 18;
    for (var i = 0; i < 19; i++){
	var row = document.createElementNS("http://www.w3.org/2000/svg", "line");
	var col = document.createElementNS("http://www.w3.org/2000/svg", "line");
	col.setAttribute("stroke", "black");
	row.setAttribute("stroke", "black");
	row.setAttribute("x1", 0);
	row.setAttribute("x2", w);
	row.setAttribute("y1", 1 + i*hinc);
	row.setAttribute("y2", 1 + i*hinc);
	col.setAttribute("x1", 1 + i*winc);
	col.setAttribute("x2", 1 + i*winc);
	col.setAttribute("y1", 0);
	col.setAttribute("y2", h);
	grid[0].appendChild(row);	
	grid[0].appendChild(col);	
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
	$('.O').remove();
	var newO = $(makeO());
	x = msg.x * $('#grid').width() / 18 + 4;
	y = msg.y * $('#grid').height() / 18 + 4;
	newStone.css('top',y).css('left',x).appendTo('#board');
	newO.css('top',y).css('left',x).appendTo('#board');
    });
    socket.on('win', function(who){
	$('#statusbar').text(who + ' won!');
    });
}

function makeStone(color){
    return '<svg class="stone" height="40" width="40"><circle cx="20" cy="20" r="15" stroke="black" fill="' + color + '"></circle></svg>'
}
    

function makeO(){
    return '<svg class="O" height="40" width="40"><circle cx="20" cy="20" r="8" stroke="red"></circle></svg>'
}
