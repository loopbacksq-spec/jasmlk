const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ГЕНЕРАЦИЯ МОДЕР-КОДА ---
let currentModCode = Math.random().toString(36).substring(2, 8).toUpperCase();
console.log(`[SYSTEM] INITIAL MOD_CODE: ${currentModCode}`);
setInterval(() => {
    currentModCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`[SYSTEM] NEW MOD_CODE: ${currentModCode}`);
}, 3600000); // Раз в час

const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE v3</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { 
            background-color: #0b141a; 
            background-image: radial-gradient(#111b21 1px, transparent 0);
            background-size: 20px 20px;
            color: #e9edef; font-family: 'Inter', sans-serif; height: 100vh; overflow: hidden; display: flex; flex-direction: column; 
        }
        #h { padding: 10px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; font-size: 10px; background: #202c33; z-index: 10; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 8px; position: relative; }
        
        .m { position: relative; padding: 8px 12px; background: #202c33; border-radius: 8px; max-width: 85%; align-self: flex-start; transition: transform 0.2s; touch-action: pan-x; }
        .m.own { align-self: flex-end; background: #005c4b; }
        .m.mod .n { color: #ff4d4d !important; font-weight: bold; }
        .n { font-size: 11px; color: #8696a0; margin-bottom: 4px; display: block; }
        .t { font-size: 14px; word-wrap: break-word; }
        .time { font-size: 9px; opacity: 0.5; float: right; margin-top: 5px; margin-left: 10px; }
        
        .reply-box { background: rgba(0,0,0,0.2); border-left: 3px solid #00a884; padding: 5px; margin-bottom: 5px; font-size: 12px; border-radius: 4px; }
        
        #typing { font-size: 11px; color: #00a884; padding: 5px 15px; height: 20px; }
        
        #u { padding: 10px; background: #202c33; display: flex; flex-direction: column; gap: 5px; }
        .reply-preview { display: none; background: #111b21; padding: 8px; border-left: 3px solid #00a884; font-size: 12px; position: relative; }
        .reply-preview span { position: absolute; right: 5px; top: 5px; cursor: pointer; }
        
        #in-row { display: flex; gap: 8px; align-items: center; }
        input { flex: 1; background: #2a3942; border: none; color: #fff; padding: 12px; border-radius: 8px; outline: none; font-size: 15px; }
        input.error { border: 1px solid #ff4d4d; color: #ff4d4d; }
        .b { background: #00a884; color: #fff; border: none; padding: 12px; border-radius: 50%; width: 45px; height: 45px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #r.a { background: #ff4d4d; }
    </style>
</head>
<body>
    <div id="h"><div>CAX_v3</div><div>PING: <span id="pg">0</span>ms | <span id="s">ONLINE</span></div></div>
    <div id="ch"></div>
    <div id="typing"></div>
    <div id="reply-ui" class="reply-preview">
        <div id="reply-text"></div>
        <span onclick="cancelReply()">✕</span>
    </div>
    <form id="u">
        <div id="in-row">
            <input type="text" id="i" placeholder="Сообщение..." autocomplete="off">
            <div id="r" class="b">🎙️</div>
            <button type="submit" class="b">➜</button>
        </div>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), r = document.getElementById('r');
        let nick = localStorage.getItem('nx') || prompt('НИК:');
        let isMod = false;
        let replyingTo = null;

        if(!nick) location.reload();

        // Регистрация ника
        socket.emit('reg_nick', nick, (res) => {
            if(!res.ok) { alert(res.msg); location.reload(); }
        });

        // Typing logic
        let typeTimer;
        i.oninput = () => {
            i.classList.toggle('error', i.value.length > 300);
            clearTimeout(typeTimer);
            socket.emit('typing', true);
            typeTimer = setTimeout(() => socket.emit('typing', false), 2000);
        };

        function cancelReply() { replyingTo = null; document.getElementById('reply-ui').style.display = 'none'; }

        u.onsubmit = (e) => {
            e.preventDefault();
            const v = i.value.trim();
            if (!v || v.length > 300) return;

            if (v.startsWith('/')) {
                const p = v.split(' ');
                if (p[0] === '/mod') socket.emit('mod_auth', p[1]);
                if (p[0] === '/online' && isMod) socket.emit('get_online');
                if (p[0] === '/clear') ch.innerHTML = '';
                if (p[0] === '/new' && p[1]) location.reload();
                i.value = ''; return;
            }

            socket.emit('m', { n: nick, t: v, r: replyingTo });
            i.value = ''; cancelReply();
        };

        socket.on('m', (d) => {
            const div = document.createElement('div');
            div.className = 'm' + (d.n === nick ? ' own' : '') + (d.mod ? ' mod' : '');
            
            // Свайп логика
            let startX = 0;
            div.ontouchstart = e => startX = e.touches[0].clientX;
            div.ontouchmove = e => {
                let diff = e.touches[0].clientX - startX;
                if (diff > 50) { 
                    replyingTo = { n: d.n, t: d.t || 'Голосовое...' };
                    document.getElementById('reply-text').innerText = 'Ответ: ' + d.n;
                    document.getElementById('reply-ui').style.display = 'block';
                    div.style.transform = 'translateX(0)';
                }
                if (diff > 0 && diff < 100) div.style.transform = \`translateX(\${diff}px)\`;
            };
            div.ontouchend = () => div.style.transform = 'translateX(0)';

            let rHtml = d.r ? \`<div class="reply-box"><b>\${d.r.n}</b>: \${d.r.t}</div>\` : '';
            let c = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`\${rHtml}<span class="n">\${d.n}</span>\${c}<span class="time">\${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        });

        socket.on('mod_ok', () => { isMod = true; alert('MODERATOR ACTIVE'); });
        socket.on('sys', (msg) => { alert(msg); });
        socket.on('type_st', (list) => {
            document.getElementById('typing').innerText = list.length > 0 ? 'Печатают: ' + list.join(', ') : '';
        });

        // Ping & UI Fixes
        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);
    </script>
</body>
</html>
`;

const users = new Map();
const typingUsers = new Set();

io.on('connection', (socket) => {
    let myNick = '';

    socket.on('reg_nick', (n, cb) => {
        const cleanN = String(n).substring(0, 15);
        if (Array.from(users.values()).includes(cleanN)) {
            return cb({ ok: false, msg: 'НИК ЗАНЯТ' });
        }
        myNick = cleanN;
        users.set(socket.id, myNick);
        cb({ ok: true });
    });

    socket.on('mod_auth', (code) => {
        if (code === currentModCode) {
            socket.isMod = true;
            socket.emit('mod_ok');
        }
    });

    socket.on('get_online', () => {
        if (socket.isMod) {
            const list = Array.from(users.values()).join(', ');
            socket.emit('m', { n: 'SYSTEM', t: 'ONLINE (' + users.size + '): ' + list, mod: true });
        }
    });

    socket.on('typing', (st) => {
        if (st) typingUsers.add(myNick); else typingUsers.delete(myNick);
        io.emit('type_st', Array.from(typingUsers).filter(n => n !== myNick));
    });

    socket.on('m', (d) => {
        if (d.t && d.t.length > 300) return;
        io.emit('m', { ...d, mod: socket.isMod });
    });

    socket.on('p', (cb) => cb());
    socket.on('disconnect', () => {
        users.delete(socket.id);
        typingUsers.delete(myNick);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('CORE v3 READY'));
