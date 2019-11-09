const http = require('http');
const path = require('path');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom } = require('./utils/users')

/*
Refactoring because express creates own server behind the scenes
Socket io expects to be called with the raw http server.
*/
const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

//server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

io.on('connection', (socket) => {
  console.log('New Websocket connection');




  socket.on('join', ({ username, room }, callback) => {

    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room)

    socket.emit('message', generateMessage('Admin', 'Hi, This is a chat app created by Brian Bawuah. Share your room name with your friends!'));
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`));
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    })

    callback()
  })

  socket.on('sendMessage', (msg, callback) => {
 
    const user = getUser(socket.id);


    const filter = new Filter();

    if (filter.isProfane(msg)) {
      return callback('Profanity is not allowed!');
    }

    io.to(user.room).emit('message', generateMessage(user.username, msg));
    callback();
  });

  socket.on('disconnect', () => {

    const user = removeUser(socket.id);


    if (user) {
      io.to(user.room).emit('message', generateMessage('Admin',`${user.username} has left.`));
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }

  });

  socket.on('sendLocation', (data, callback) => {

    const user = getUser(socket.id);


    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${data.lat},${data.long}`));
    callback();
  });
});


server.listen(port, () => {
  console.log('App is listening to port 3000');
});
