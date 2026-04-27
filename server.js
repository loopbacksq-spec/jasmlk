const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ИДЕАЛЬНЫЙ МИНИМАЛИСТИЧНЫЙ ИНТЕРФЕЙС ---
const clientHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CAX</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; color: #fff; font-family: 'Inter', sans-serif; height: 100vh; display: flex; flex-direction: column; }
        
        /* Список сообщений */
        #chat { flex: 1; overflow-y: auto; padding: 30px; display: flex; flex-direction: column; gap: 15px; }
        
        .msg { max-width: 80%; animation: fadeIn 0.2s ease; }
        .msg .n { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #444; margin-bottom: 4px; }
        .msg .t { font-size: 1rem; line-height: 1.5; border-left: 1px solid #fff; padding-left: 15px; }

        /* Поле ввода */
        #ui { padding: 30px; border-top: 1px solid #1a1a1a; display: flex; gap: 20px; }
        input { flex: 1; background: transparent; border: none; color: #fff; font-size: 1rem; outline: none; font-family: inherit; }
        button { background: none; border: 1px solid #fff; color: #fff; padding: 10px 25px; cursor: pointer; transition: 0.2s; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
        button:hover { background: #fff; color: #000; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { width: 0px; } /* Скрываем скроллбар для чистоты */
    </style>
</head>
<body>
    <div id="chat"></div>
    <form id="ui">
        <input type="text" id="m" autocomplete="off" placeholder="WRITE..." maxlength="500" />
        <button type="submit">SEND</button>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const chat = document.getElementById('chat');
        const form = document.getElementById('ui');
        const input = document.getElementById('m');

        let nick = localStorage.getItem('cax_n') || prompt('NICKNAME:') || 'USER';
        localStorage.setItem('cax_n', nick);

        form.onsubmit = (e) => {
            e.preventDefault();
            if (input.value.trim()) {
                socket.emit('m', { n: nick, t: input.value });
                input.value = '';
            }
        };

        socket.on('m', (d) => {
            const el = document.createElement('div');
            el.className = 'msg';
            el.innerHTML = \`<div class="n">\${d.n}</div><div class="t">\${d.t}</div>\`;
            chat.appendChild(el);
            chat.scrollTop = chat.scrollHeight;
        });
    </script>
</body>
</html>
`;

// --- ЛОГИКА (БЕЗ ЛИШНЕГО) ---
app.get('/', (req, res) => res.send(clientHTML));

io.on('connection', (socket) => {
    socket.on('m', (data) => {
        if (data.t && data.t.length <= 500) {
            io.emit('m', {
                n: String(data.n).substring(0, 15).replace(/<[^>]*>?/gm, ''),
                t: String(data.t).replace(/<[^>]*>?/gm, '')
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('READY'));
