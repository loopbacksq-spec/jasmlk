const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const users = new Map(); // messengerId -> socketId
let rouletteBets = [];
let rouletteTimer = 15;

// Цикл рулетки
setInterval(() => {
    rouletteTimer--;
    if (rouletteTimer <= 0) {
        const result = Math.random() > 0.7 ? 'green' : 'gray'; // 30% шанс на победу
        io.emit('rouletteResult', { result, bets: rouletteBets });
        rouletteBets = [];
        rouletteTimer = 15;
    }
    io.emit('rouletteTick', rouletteTimer);
}, 1000);

io.on('connection', (socket) => {
    // Настоящий пинг
    socket.on('heartbeat', () => socket.emit('heartbeat_reply'));

    socket.on('register', (myId) => {
        socket.messengerId = myId;
        users.set(myId, socket.id);
        io.emit('userStatus', { id: myId, status: 'online' });
    });

    socket.on('checkUser', (id, callback) => callback(users.has(id.toString())));

    socket.on('sendMessage', (data) => {
        const target = users.get(data.to.toString());
        if (target) io.to(target).emit('newMessage', data);
    });

    // Удаление чата у обоих
    socket.on('deleteChatGlobal', (data) => {
        const target = users.get(data.to.toString());
        if (target) io.to(target).emit('chatDeleted', { from: data.from });
    });

    // Перевод денег
    socket.on('sendMoney', (data) => {
        // Ищем пользователя по номеру карты (эмуляция: шлем всем, клиент сам поймет, его ли карта)
        io.emit('receiveMoney', data);
    });

    // Ставки в рулетке
    socket.on('placeBet', (data) => {
        rouletteBets.push(data);
        io.emit('newBet', data);
    });

    socket.on('disconnect', () => {
        if (socket.messengerId) {
            users.delete(socket.messengerId);
            io.emit('userStatus', { id: socket.messengerId, status: 'offline' });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on ${PORT}`));
