const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {genearteMessage,  generateLocation} = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath));

//let count = 0;
var message = "Welcome! as the event data";

//server (emit) -> client (receive) -- acknowledgement --> server
//client (emit) -> server (receive) -- acknowledgement --> client

io.on('connection', (socket) => {
    console.log("New Websocket connection")

    socket.on('join', ({username, room}, callback) => {
      const {error, user} = addUser({ id: socket.id, username, room})

      if(error) {
        return callback(error)
      }

      socket.join(user.room)

      socket.emit('message', genearteMessage('Admin', 'Welcome!'));
      socket.broadcast.to(user.room).emit('message', genearteMessage('Admin', `${user.username} has joined!`))
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })

      callback()
    })

    socket.on('sendMessage', (message, callback) => {
      const user = getUser(socket.id)
      const filter = new Filter()

      if(filter.isProfane(message)){
        return callback('Profanity is not allowed')
      }

      io.to(user.room).emit('message', genearteMessage(user.username, message))
      callback()
    })

    socket.on('sendLocation', (coords, callback) => {
      const user = getUser(socket.id)
      io.to(user.room).emit('locationMessage', generateLocation(user.username, `https://google.com/maps?q=${coords.latitude},${coords.latitude}`))
      callback()
    })

    socket.on('disconnect', () => {
      const user = removeUser(socket.id)

      if(user) {
        io.to(user.room).emit('message', genearteMessage('Admin',`${user.username} has left`))
        io.to(user.room).emit('roomData', {
          room: user.room,
          users: getUsersInRoom(user.room)
        })
      }

    //io.emit('message', genearteMessage('A user has left'))
    })    
})

server.listen(port, () => {
    console.log('Server started')
})