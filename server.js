const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + '/public'));

const users = new Map(); // Храним socket.id -> id_messenger

io.on('connection', (socket) => {
    // Анти-спам: ограничение частоты сообщений
    let lastMsgTime = 0;

    socket.on('register', (myId) => {
        users.set(myId, socket.id);
        io.emit('userStatus', { id: myId, status: 'online' });
    });

    socket.on('sendMessage', (data) => {
        const now = Date.now();
        if (now - lastMsgTime < 500) return; // Анти-спам 0.5 сек
        lastMsgTime = now;

        const recipientSocket = users.get(data.to);
        if (recipientSocket) {
            io.to(recipientSocket).emit('newMessage', data);
        }
    });

    socket.on('typing', (data) => {
        const recipientSocket = users.get(data.to);
        if (recipientSocket) {
            io.to(recipientSocket).emit('isTyping', { from: data.from });
        }
    });

    socket.on('disconnect', () => {
        users.forEach((socketId, myId) => {
            if (socketId === socket.id) {
                users.delete(myId);
                io.emit('userStatus', { id: myId, status: 'offline' });
            }
        });
    });
});

// Автопингер (Self-ping)
setInterval(() => {
    const url = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}.onrender.com`;
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        http.get(url, (res) => console.log('Self-ping success'));
    }
}, 600000); // каждые 10 минут

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
