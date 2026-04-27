const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const clientHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>CAX CORE</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { background: #000; color: #fff; font-family: 'Courier New', monospace; height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
        
        /* HEADER */
        #hdr { padding: 10px 15px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; font-size: 10px; letter-spacing: 1px; }
        #st { color: #0f0; } .off { color: #f00 !important; }

        /* CHAT AREA */
        #ch { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
        .m { max-width: 90%; animation: f 0.1s ease; border-left: 1px solid #333; padding-left: 10px; }
        .m.priv { border-left-color: #fff; background: #111; padding: 5px 10px; }
        .n { font-size: 10px; color: #666; margin-bottom: 2px; display: flex; justify-content: space-between; }
        .t { font-size: 14px; line-height: 1.4; word-wrap: break-word; }
        audio { filter: invert(1); height: 30px; margin-top: 5px; max-width: 100%; }

        /* UI */
        #ui { padding: 10px; border-top: 1px solid #222; display: flex; gap: 8px; align-items: center; background: #000; }
        input { flex: 1; background: #111; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 0; outline: none; font-family: inherit; font-size: 16px; }
        .btn { background: #fff; color: #000; border: none; padding: 12px 15px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 11px; }
        #rec { background: #222; color: #fff; user-select: none; touch-action: none; }
        #rec.active { background: #f00; }

        @keyframes f { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
    </style>
</head>
<body>
    <div id="hdr">
        <div>CAX_CORE.v2</div>
        <div>STATUS: <span id="st">ONLINE</span> | PING: <span id="pg">0</span>ms</div>
    </div>
    <div id="ch"></div>
    <form id="ui">
        <input type="text" id="i" placeholder="CMD OR MSG..." autocomplete="off">
        <div id="rec" class="btn">VOICE</div>
        <button type="submit" class="btn">SEND</button>
    </form>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const ch = document.getElementById('ch'), i = document.getElementById('i'), ui = document.getElementById('ui'), recBtn = document.getElementById('rec');
        let nick = localStorage.getItem('nx') || prompt('NICK:') || 'USER';
        localStorage.setItem('nx', nick);

        // Session Timer
        let lastAct = Date.now();
        setInterval(() => { if (Date.now() - lastAct > 300000) { localStorage.clear(); location.reload(); } }, 10000);
        window.onfocus = () => { lastAct = Date.now(); };

        // Pinger
        setInterval(() => { const start = Date.now(); socket.emit('p', () => { document.getElementById('pg').innerText = Date.now() - start; }); }, 3000);
        socket.on('disconnect', () => document.getElementById('st').classList.add('off'));

        function addM(d, priv = false) {
            const div = document.createElement('div');
            div.className = 'm' + (priv ? ' priv' : '');
            const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let content = d.t ? \`<div class="t">\${d.t}</div>\` : \`<audio src="\${d.a}" controls></audio>\`;
            div.innerHTML = \`<div class="n"><span>\${d.n.toUpperCase()} \${priv ? '[PRIVATE]' : ''}</span> <span>\${time}</span></div>\${content}\`;
            ch.appendChild(div);
            ch.scrollTop = ch.scrollHeight;
        }

        ui.onsubmit = (e) => {
            e.preventDefault();
            const v = i.value.trim();
            if (!v) return;

            if (v.startsWith('/')) {
                const parts = v.split(' ');
                const cmd = parts[0];
                if (cmd === '/clear') ch.innerHTML = '';
                else if (cmd === '/new' && parts[1]) { nick = parts[1]; localStorage.setItem('nx', nick); }
                else if (cmd === '/send' && parts[1]) {
                    const target = parts[1];
                    const msg = parts.slice(2).join(' ');
                    socket.emit('m', { n: nick, t: msg, to: target });
                    addM({ n: \`TO: \${target}\`, t: msg }, true);
                }
                i.value = '';
                return;
            }

            socket.emit('m', { n: nick, t: v });
            i.value = '';
        };

        socket.on('m', (d) => addM(d, d.priv));

        // VOICE REC
        let rc;
        recBtn.onpointerdown = async (e) => {
            e.preventDefault();
            const s = await navigator.mediaDevices.getUserMedia({ audio: true });
            rc = new MediaRecorder(s);
            const chunks = [];
            rc.ondataavailable = e => chunks.push(e.data);
            rc.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
                const reader = new FileReader();
                reader.onloadend = () => socket.emit('m', { n: nick, a: reader.result });
                reader.readAsDataURL(blob);
                s.getTracks().forEach(t => t.stop());
            };
            rc.start();
            recBtn.classList.add('active');
        };
        recBtn.onpointerup = () => { if(rc) rc.stop(); recBtn.classList.remove('active'); };

        // Fix mobile keyboard
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

io.on('connection', (socket) => {
    socket.join(socket.handshake.query.nick || 'anon'); // Fallback
    
    socket.on('p', (cb) => cb());

    socket.on('m', (d) => {
        const clean = { n: d.n.substring(0,15), t: d.t, a: d.a, priv: !!d.to };
        if (d.to) {
            // Личка: ищем по нику (в данном примере упрощено до broadcast с пометкой, 
            // для реального привата нужно хранить мапу ник -> socket.id)
            io.emit('m_priv', { ...clean, target: d.to }); 
        } else {
            io.emit('m', clean);
        }
    });
});

// Фикс лички на бэкенде
io.on('connection', (socket) => {
    socket.on('m', (d) => {
        if (d.to) {
            // Эмит конкретному сокету был бы сложнее, делаем фильтр на клиенте или простую логику:
            socket.broadcast.emit('m', { ...d, priv: true, filter: d.to });
        } else {
            io.emit('m', d);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('CORE READY'));
