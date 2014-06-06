mongo = require 'mongodb'
express = require 'express'
app = express()
http = require('http').Server(app)
io = require('socket.io')(http)
logger = require 'morgan'


mongoURI =  process.env.MONGOLAB_URI ? process.env.MONGOHQ_URL ? 'mongodb://localhost/games'


app.engine 'jade', require('jade').__express

app.set 'views', __dirname + '/views'

app.use logger()
app.use '/s', express.static(__dirname + '/static')

app.get '/', (req, res) ->
  res.send('Home Page');

app.get '/:color(b|w)/:game', (req, res) ->
  black = req.params['color'] == 'b'
  game = req.params['game']
  res.render 'hello.jade',
    {
      game: game,
      black: black
    },
    (err, html) ->		   
      if err 
        console.log err
      res.send(html);


loadGame = (gameName, callback) ->
  mongo.Db.connect mongoURI, (err, db) ->
    db.collection 'games', (err, collection) ->
	    collection.find({name:gameName}).toArray (err,games)->
    		if games.length > 0
          callback games[0].status
    		else
  		    collection.insert {
      			name: gameName,
      			status: {won: false, black: [], white: []}
    		    },
            {safe:true}, (er,res) ->
            callback {won: false, black: [], white: []}


updateGame = (gameName, status) ->
  mongo.Db.connect mongoURI, (err, db) ->
  	db.collection 'games', (er, collection) ->
      collection.update {name:gameName}, {$set: {status: status}}, {w:1}, (err) ->


io.on 'connection', (socket) ->

  console.log 'a user connected'
  
  socket.on 'join', (game)->
    socket.join game
    loadGame game, (status) ->
      blackToMove = status['black'].length <= status['white'].length
      colors
      
      if blackToMove
        colors = ['black', 'white']
      else
        colors = ['white', 'black']

      for color in colors
        for loc in status[color]
          socket.emit 'move',
            {
              game: game,
              color: color,
              x: loc.x,
              y: loc.y
            }

      if status['won']
        socket.emit 'win', status['won']

  socket.on 'move', (msg) ->
    loadGame msg.game, (status) ->
      won = status['won']
      turn = status['black'].length <= status['white'].length
      turn = not turn if msg.color == 'white'
    		
      free = true;
      for color in ['black', 'white']
        for loc in status[color]
          do (loc, color) ->
            free = false if loc.x == msg.x and loc.y == msg.y

      if not won and turn and free
        status[msg.color].push {x: msg.x, y: msg.y}
        io.to(msg.game).emit 'move', msg

      won = gameWon status
      if won
        io.to(msg.game).emit 'win', won
        status['won'] = won

      updateGame msg.game, status
    
  socket.on 'disconnect', () ->
    console.log 'user disconnected'


inArray = (array, value) ->
  array.indexOf(value) > -1


gameWon = (status) ->
  b = status['black']
  w = status['white']
  if not b.length
  	return false #if there haven't been any moves yet
    
  last
  stones
  color
  if b.length <= w.length
    color = 'white'
    last = w[w.length-1]
    stones = w.slice(0)
  else
    color = 'black'
    last = b[b.length-1]
    stones = b.slice(0)

  stones = (JSON.stringify(stone) for stone in stones)
    
  dirs = [{x:0, y:1}, {x:1, y:0}, {x:1, y:1}, {x:-1,y:1}]
  longest = 1
  for dir in dirs
    len = 1
    for sign in [-1,1]
      j = 0
      while ++j
        loc = {x: last.x + sign*j*dir.x, y: last.y + sign*j*dir.y}
        placed = inArray(stones, JSON.stringify(loc))
        if not placed
          len += j - 1
          break
    if len > longest
      longest = len
  if longest >= 5
    return color
  else
    return false

port = Number(process.env.PORT ? 8888)

http.listen port, () ->
  console.log("Listening on " + port)
