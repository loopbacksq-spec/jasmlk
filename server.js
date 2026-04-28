const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

let waitingPlayer = null;

io.on('connection', (socket) => {
    // Глобальный чат
    socket.on('send_msg', (data) => {
        // Рассылаем всем, клиент сам оставит только 5 последних
        io.emit('broadcast_msg', data);
    });

    // Поиск матча
    socket.on('find_match', (userData) => {
        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const opponent = waitingPlayer;
            waitingPlayer = null;
            
            const roomId = `room_${socket.id}_${opponent.id}`;
            socket.join(roomId);
            opponent.join(roomId);

            io.to(roomId).emit('match_start', {
                room: roomId,
                opp: { nick: opponent.nick, elo: opponent.elo },
                you: { nick: socket.nick, elo: socket.elo }
            });
        } else {
            socket.nick = userData.nick;
            socket.elo = userData.elo;
            waitingPlayer = socket;
        }
    });

    socket.on('update_score', (data) => {
        socket.to(data.room).emit('opp_score', data.score);
    });

    socket.on('disconnect', () => {
        if (waitingPlayer && waitingPlayer.id === socket.id) waitingPlayer = null;
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
