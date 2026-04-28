// Добавь это в существующий server.js в блок io.on('connection')
socket.on('callUser', (data) => {
    const target = users.get(data.userToCall.toString());
    if (target) {
        io.to(target).emit('incomingCall', { signal: data.signalData, from: data.from });
    }
});

socket.on('acceptCall', (data) => {
    const target = users.get(data.to.toString());
    if (target) {
        io.to(target).emit('callAccepted', data.signal);
    }
});

socket.on('endCall', (data) => {
    const target = users.get(data.to.toString());
    if (target) io.to(target).emit('callEnded');
});
