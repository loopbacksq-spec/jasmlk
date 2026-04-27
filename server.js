const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- ИНТЕРФЕЙС (ВШИТ В ПАМЯТЬ) ---
const UI = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #000; color: #fff; font-family: 'Courier New', monospace; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        #h { padding: 10px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; font-size: 10px; opacity: 0.6; }
        #s { color: #0f0; }
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
        .m { border-left: 1px solid #444; padding-left: 10px; animation: f 0.1s ease; }
        .m.p { border-left-color: #fff; background: #111; }
        .n { font-size: 10px; color: #666; margin-bottom: 2px; text-transform: uppercase; }
        .t { font-size: 15px; line-height: 1.4; }
        audio { filter: invert(1); height: 30px; margin-top: 5px; width: 100%; }
        #u { padding: 10px; border-top: 1px solid #222; display: flex; gap: 5px; background: #000; }
        input { flex: 1; background: #111; border: 1px solid #333; color: #fff; padding: 12px; outline: none; font-family: inherit; font-size: 16px; }
        .b { background: #fff; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; font-size: 12px; }
        #r.a { background: #f00; color: #fff; }
        @keyframes f { from { opacity: 0; } to { opacity: 1; } }
    </style>
</head>
<body>
    <div id="h"><div>CAX_v2</div><div>PING: <span id="pg">0</span>ms | <span id="s">ONLINE</span></div></div>
    <div id="ch"></div>
    <form id="u">
        <input type="text" id="i" placeholder="CMD / MSG..." autocomplete="off">
        <div id="r" class="b">VOICE</div>
        <button type="submit" class="b">SEND</button>
    </form>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io(), ch = document.getElementById('ch'), i = document.getElementById('i'), u = document.getElementById('u'), r = document.getElementById('r');
        let nick = localStorage.getItem('nx') || prompt('NICK:') || 'USER';
        localStorage.setItem('nx', nick);

        // Session
        let lt = Date.now();
        setInterval(() => { if (Date.now() - lt > 300000) { localStorage.clear(); location.reload(); } }, 10000);
        window.onfocus = () => lt = Date.now();

        // Ping
        setInterval(() => { const s = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - s; }); }, 2000);

        function add(d, p = false) {
            const div = document.createElement('div');
            div.className = 'm' + (p ? ' p' : '');
            const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            let c = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`<div class="n">\${d.n} \${p ? '[PRIV]' : ''} | \${time}</div>\${c}\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        }

        u.onsubmit = (e) => {
            e.preventDefault();
            const v = i.value.trim();
            if (!v) return;
            if (v.startsWith('/')) {
                const p = v.split(' ');
                if (p[0] === '/clear') ch.innerHTML = '';
                if (p[0] === '/new' && p[1]) { nick = p[1]; localStorage.setItem('nx', nick); }
                if (p[0] === '/send' && p[1]) {
                    const msg = p.slice(2).join(' ');
                    socket.emit('m', { n: nick, t: msg, to: p[1] });
                    add({ n: 'TO: ' + p[1], t: msg }, true);
                }
                i.value = ''; return;
            }
            socket.emit('m', { n: nick, t: v });
            i.value = '';
        };

        socket.on('m', (d) => {
            if (d.to && d.to !== nick) return; // Простой фильтр лички
            add(d, !!d.to);
        });

        let rc;
        r.onpointerdown = async (e) => {
            e.preventDefault();
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rc = new MediaRecorder(s); const ck = [];
            rc.ondataavailable = e => ck.push(e.data);
            rc.onstop = () => {
                const b = new Blob(ck, { type: 'audio/ogg' });
                const rd = new FileReader();
                rd.onloadend = () => socket.emit('m', { n: nick, a: rd.result });
                rd.readAsDataURL(b);
                s.getTracks().forEach(t => t.stop());
            };
            rc.start(); r.classList.add('a');
        };
        r.onpointerup = () => { if(rc) rc.stop(); r.classList.remove('a'); };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                document.body.style.height = window.visualViewport.height + 'px';
                ch.scrollTop = ch.scrollHeight;
            });
        }
    </script>
</body>
</html>
`;

// --- ЛОГИКА СЕРВЕРА (БЕЗ CANNOT GET /) ---

app.get('/', (req, res) => {
    res.send(UI); // Отдаем интерфейс на главном маршруте
});

io.on('connection', (socket) => {
    socket.on('p', (cb) => { if(typeof cb === 'function') cb(); });
    
    socket.on('m', (d) => {
        // Очистка и рассылка
        const payload = {
            n: String(d.n || 'USER').substring(0, 15),
            t: d.t ? String(d.t).replace(/<[^>]*>?/gm, '') : null,
            a: d.a || null,
            to: d.to || null
        };
        io.emit('m', payload);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`CORE READY ON PORT ${PORT}`);
});
