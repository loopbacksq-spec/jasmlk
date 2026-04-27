const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ИНТЕРФЕЙС (HTML/CSS/JS) ---
const clientHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAX</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; color: #fff; font-family: 'Courier New', Courier, monospace; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        
        #chat { flex: 1; overflow-y: auto; padding: 20px; border-bottom: 1px solid #fff; scroll-behavior: smooth; }
        .msg { margin-bottom: 10px; line-height: 1.4; border-left: 2px solid #333; padding-left: 10px; word-break: break-all; }
        .msg .nick { color: #888; font-weight: bold; margin-right: 8px; }
        
        #input-area { display: flex; padding: 15px; background: #000; }
        input { flex: 1; background: #000; border: 1px solid #fff; color: #fff; padding: 10px; font-family: inherit; outline: none; }
        button { background: #fff; color: #000; border: none; padding: 0 20px; cursor: pointer; font-weight: bold; font-family: inherit; margin-left: 10px; }
        button:active { background: #888; }

        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #fff; }
    </style>
</head>
<body>
    <div id="chat"></div>
    <form id="input-area">
        <input type="text" id="m" autocomplete="off" placeholder="СООБЩЕНИЕ..." maxlength="500" />
        <button type="submit">ОТПРАВИТЬ</button>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const chat = document.getElementById('chat');
        const form = document.getElementById('input-area');
        const input = document.getElementById('m');

        // Идентификация
        let nick = localStorage.getItem('cax_nick');
        if (!nick) {
            nick = prompt('ТВОЙ НИК:', 'ANON_' + Math.floor(Math.random() * 1000));
            localStorage.setItem('cax_nick', nick || 'ANON');
        }

        // Анти-спам
        let lastSend = 0;

        form.onsubmit = (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastSend < 800) return; // 0.8s задержка
            
            if (input.value.trim()) {
                socket.emit('chat message', { nick, text: input.value });
                input.value = '';
                lastSend = now;
            }
        };

        socket.on('chat message', (data) => {
            const div = document.createElement('div');
            div.className = 'msg';
            div.innerHTML = \`<span class="nick">\${data.nick}:</span>\${data.text}\`;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        });

        // Системные уведомления
        socket.on('sys', (txt) => {
            const div = document.createElement('div');
            div.style.color = '#555';
            div.style.fontSize = '0.8em';
            div.style.margin = '5px 0';
            div.innerText = '>> ' + txt;
            chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        });
    </script>
</body>
</html>
`;

// --- ЛОГИКА СЕРВЕРА ---

app.get('/', (req, res) => {
    res.send(clientHTML);
});

io.on('connection', (socket) => {
    socket.emit('sys', 'СОЕДИНЕНИЕ УСТАНОВЛЕНО');

    socket.on('chat message', (data) => {
        // Валидация на стороне сервера
        if (data.text && data.text.length <= 500) {
            const cleanData = {
                nick: String(data.nick).substring(0, 20).replace(/<[^>]*>?/gm, ''),
                text: String(data.text).replace(/<[^>]*>?/gm, '')
            };
            io.emit('chat message', cleanData);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`CAX RUNNING ON PORT ${PORT}`);
});
