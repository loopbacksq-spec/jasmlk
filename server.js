const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Функция для поиска файла по всем возможным папкам
function findIndexFile() {
    const locations = [
        path.join(__dirname, 'index.html'),
        path.join(__dirname, 'public', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        path.join(process.cwd(), 'public', 'index.html')
    ];
    
    for (let loc of locations) {
        if (fs.existsSync(loc)) {
            console.log('✅ Нашел index.html по пути:', loc);
            return loc;
        }
    }
    return null;
}

// Главная страница
app.get('/', (req, res) => {
    const indexPath = findIndexFile();
    if (indexPath) {
        res.sendFile(indexPath);
    } else {
        // Если файл не найден, сервер выведет список того, что он видит
        const files = fs.readdirSync(__dirname);
        res.status(404).send(`
            <h1>CAX Error</h1>
            <p>Файл index.html не найден в репозитории.</p>
            <p>Файлы в корне сервера: ${files.join(', ')}</p>
            <p>Убедись, что на GitHub файл называется именно <b>index.html</b> (маленькими буквами)!</p>
        `);
    }
});

// Раздача статики из всех возможных дыр
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Логика чата
io.on('connection', (socket) => {
    socket.on('chat message', (data) => {
        if (data.user && data.text) {
            io.emit('chat message', {
                user: String(data.user).substring(0, 20),
                text: String(data.text).substring(0, 500)
            });
        }
    });
});

server.listen(PORT, () => {
    console.log(`
    ====================================
    🚀 CAX SERVER IS LIVE!
    ПОРТ: ${PORT}
    НИКНЕЙМ: Leym-Core-v1
    ====================================
    `);
});
