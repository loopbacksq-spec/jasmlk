const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const RENDER_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;

// ОТДАЕМ ФАЙЛЫ ИЗ КОРНЯ
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const messageLimits = new Map();

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    socket.on('chat message', (data) => {
        const now = Date.now();
        const lastMessageTime = messageLimits.get(socket.id) || 0;

        if (now - lastMessageTime < 800) return; // Анти-спам

        messageLimits.set(socket.id, now);

        if (data.user && data.text) {
            io.emit('chat message', {
                user: String(data.user).substring(0, 20),
                text: String(data.text).substring(0, 500)
            });
        }
    });

    socket.on('disconnect', () => {
        messageLimits.delete(socket.id);
    });
});

// Авто-пингер
setInterval(() => {
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        axios.get(RENDER_URL).catch(() => {});
    }
}, 800000);

server.listen(PORT, () => {
    console.log(`CAX ONLINE ON PORT ${PORT}`);
});
