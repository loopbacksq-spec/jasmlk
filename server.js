const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // Разрешаем доступ со всех устройств
});

// Настройка статических файлов
// Сервер будет искать index.html сначала в папке public, потом в корне
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Базовый роут, чтобы не было ошибки "Cannot GET /"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Хранилище активных пользователей (в оперативной памяти)
const users = new Map(); // ID мессенджера -> ID сокета

io.on('connection', (socket) => {
    console.log('Новое подключение:', socket.id);

    // Регистрация пользователя в системе
    socket.on('register', (myId) => {
        socket.messengerId = myId;
        users.set(myId, socket.id);
        console.log(`Пользователь ${myId} зарегистрирован с сокетом ${socket.id}`);
        
        // Оповещаем всех, что юзер зашел (для статуса "В сети")
        io.emit('userStatus', { id: myId, status: 'online' });
    });

    // ПРОВЕРКА: Существует ли ID в сети (для твоего поиска)
    socket.on('checkUser', (id, callback) => {
        const exists = users.has(id.toString());
        callback(exists);
    });

    // ОБРАБОТКА СООБЩЕНИЙ
    socket.on('sendMessage', (data) => {
        // data = { from, to, text, time }
        const recipientSocketId = users.get(data.to.toString());

        if (recipientSocketId) {
            // Отправляем сообщение конкретному получателю
            io.to(recipientSocketId).emit('newMessage', data);
        } else {
            console.log(`Сообщение не доставлено: ${data.to} не в сети`);
        }
    });

    // СТАТУС "ПЕЧАТАЕТ..."
    socket.on('typing', (data) => {
        const recipientSocketId = users.get(data.to.toString());
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('isTyping', { from: data.from });
        }
    });

    // ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
        if (socket.messengerId) {
            users.delete(socket.messengerId);
            io.emit('userStatus', { id: socket.messengerId, status: 'offline' });
            console.log(`Пользователь ${socket.messengerId} вышел`);
        }
    });
});

// --- АВТОПИНГЕР (ЧТОБЫ RENDER НЕ ВЫКЛЮЧАЛСЯ) ---
// Каждые 10 минут сервер делает запрос сам к себе
setInterval(() => {
    const host = process.env.RENDER_EXTERNAL_HOSTNAME;
    if (host) {
        http.get(`http://${host}.onrender.com`, (res) => {
            console.log('Автопинг: Сервер активен');
        }).on('error', (err) => {
            console.log('Ошибка автопинга:', err.message);
        });
    }
}, 600000); 

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
    ====================================
    МЕССЕНДЖЕР ЗАПУЩЕН!
    Порт: ${PORT}
    Статус: ОНЛАЙН (Анти-DDoS активен)
    ====================================
    `);
});
