const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Главное: говорим серверу отдавать index.html из корня или папки public
app.use(express.static(path.join(__dirname, 'public')));

// Если файла нет в public, отдаем index.html из корня (защита от Cannot GET)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const users = new Map();

io.on('connection', (socket) => {
    socket.on('register', (myId) => {
        users.set(myId, socket.id);
        io.emit('userStatus', { id: myId, status: 'online' });
    });

    socket.on('sendMessage', (data) => {
        const recipientSocket = users.get(data.to);
        if (recipientSocket) {
            io.to(recipientSocket).emit('newMessage', data);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
