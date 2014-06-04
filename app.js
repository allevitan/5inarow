var mongo = require('mongodb');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var logger = require('morgan');


var mongoURI =  process.env.MONGOLAB_URI ||
    process.env.MONGOHQ_URL ||
    'mongodb://localhost/games';


app.engine('jade', require('jade').__express);

app.set('views', __dirname + '/views');

app.use(logger());
app.use('/s', express.static(__dirname + '/static'));

app.get('/', function(req, res){
    res.send('Home Page');
});

app.get('/:color(b|w)/:game', function(req, res){
    var black = req.params['color'] == 'b';
    var game = req.params['game'];
    res.render('hello.jade',
	       {
		   game: game,
		   black: black
	       },
	       function(err, html){
		   
		   if (err){ 
		       console.log(err);
		   }
		   res.send(html);
	       });
});

function loadGame(gameName, callback){
    mongo.Db.connect(mongoURI, function(err, db){
	db.collection('games', function(er, collection){
	    collection.find({name:gameName}).toArray(function(err,games){
		if (games.length > 0){
		    callback(games[0].status);
		} else {
		    collection.insert({
			name: gameName,
			status: {won: false, black: [], white: []}
		    }, {safe:true}, function(er,res){});
		    callback({won: false, black: [], white: []});
		}
	    });
	});
    });
}

function updateGame(gameName, status){
    mongo.Db.connect(mongoURI, function(err, db){
	db.collection('games', function(er, collection){
	    collection.update({name:gameName}, {$set: {status: status}}, {w:1}, function(err){
	    });
	});
    });
}

io.on('connection', function(socket){

    console.log('a user connected');

    socket.on('join', function(game){
	socket.join(game);
	loadGame(game, function(status){
	    var blackToMove = status['black'].length <= status['white'].length;
	    var colors
	    if (blackToMove){
		colors = {black:'',white:''};
	    } else {
		colors = {white: '', black: ''};
	    }
	    for (var color in colors){
		for (var loc in status[color]){
		    move = {
			game: game,
			color: color,
			x: status[color][loc].x,
			y: status[color][loc].y
		    };
		    socket.emit('move', move);
		}
	    }
	    if (status['won']){
		socket.emit('win', status['won']);
	    }
	});	
    });

    socket.on('move', function(msg){
	loadGame(msg.game, function(status){
	    var won = status['won'];
	    var turn = status['black'].length <= status['white'].length;
	    if (msg.color == 'white'){
		turn = !turn;
	    }
	    var free = true;
	    for (var color in {black:'',white:''}){
		for (var loc in status[color]){
		    if (status[color][loc].x == msg.x &&
			status[color][loc].y == msg.y){
			free = false;
		    }
		}
	    }
	    if (!won && turn && free) {
		status[msg.color].push({x: msg.x, y: msg.y});
		io.to(msg.game).emit('move', msg); 
	    }
	    won = gameWon(status);
	    if (won){
		io.to(msg.game).emit('win',won);
		status['won'] = won;
	    }
	    updateGame(msg.game, status);
	});
    });
    
    socket.on('disconnect', function(){
	console.log('user disconnected');
    });
});

function inArray(array, value) {
  return array.indexOf(value) > -1;
}

function gameWon(status){
    var b = status['black']
    var w = status['white']
    if (! b.length){
	return false;//if there haven't been any moves
    }
    
    var last;
    var stones;
    var color;
    if (b.length <= w.length){
	color = 'white';
	last = w[w.length-1];
	stones = w.slice(0);
    } else {
	color = 'black';
	last = b[b.length-1];
	stones = b.slice(0);
    }
    for (var i in stones){
	stones[i] = JSON.stringify(stones[i]);
    }
    
    var dirs = [{x:0, y:1}, {x:1, y:0}, {x:1, y:1}, {x:-1,y:1}]
    var longest = 1;
    for (var i in dirs){
	var len = 1;
	for (var sign = -1; sign <= 1; sign+=2){
	    for (var j = 1 ;; j++){
		var loc = {x: last.x + sign*j*dirs[i].x, y: last.y + sign*j*dirs[i].y}
		var placed = inArray(stones, JSON.stringify(loc))
		if (!placed){
		    len += j - 1;
		    break;
		}
	    }
	}
	if (len > longest){
	    longest = len;
	}
    }
    if (longest >= 5){
	return color;
    } else {
	return false;
    }
}

var port = Number(process.env.PORT || 8888);
http.listen(port, function() {
  console.log("Listening on " + port);
});
