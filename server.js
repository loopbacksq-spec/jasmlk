const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/'));

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('findMatch', (data) => {
        if (waitingPlayer) {
            // Создаем комнату для игры
            const roomName = `room_${waitingPlayer.id}_${socket.id}`;
            socket.join(roomName);
            waitingPlayer.join(roomName);

            io.to(roomName).emit('matchFound', {
                players: [
                    {id: waitingPlayer.id, nick: waitingPlayer.nick, elo: waitingPlayer.elo},
                    {id: socket.id, nick: data.nick, elo: data.elo}
                ]
            });
            waitingPlayer = null;
        } else {
            socket.nick = data.nick;
            socket.elo = data.elo;
            waitingPlayer = socket;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
