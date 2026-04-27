const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const RENDER_URL = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`; // Ссылка на ваш билд

// Раздача статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Защита от спама: лимит сообщений (1 сообщение в секунду на сокет)
const messageLimits = new Map();

io.on('connection', (socket) => {
    socket.on('chat message', (data) => {
        const now = Date.now();
        const lastMessageTime = messageLimits.get(socket.id) || 0;

        if (now - lastMessageTime < 1000) {
            return; // Игнорируем слишком частые сообщения
        }

        messageLimits.set(socket.id, now);

        // Рассылка всем, кроме отправителя (оптимизация трафика)
        if (data.user && data.text) {
            io.emit('chat message', {
                user: data.user.substring(0, 20), // Лимит на длину ника
                text: data.text.substring(0, 500) // Лимит на длину сообщения
            });
        }
    });

    socket.on('disconnect', () => {
        messageLimits.delete(socket.id);
    });
});

// Авто-пингер для Render (чтобы сервер не спал)
setInterval(() => {
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        axios.get(RENDER_URL).catch(() => console.log("Self-pinging..."));
    }
}, 840000); // Каждые 14 минут

server.listen(PORT, () => {
    console.log(`CAX server running on port ${PORT}`);
});