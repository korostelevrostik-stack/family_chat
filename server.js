const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Храним пользователей и их сообщения
const users = {}; // { socketId: { name, contacts: [names] } }
const messages = {}; // { "Папа-Мама": [ { from, text, time } ] }

io.on('connection', (socket) => {
  console.log('✅ Кто-то подключился');

  // Регистрация пользователя
  socket.on('register', (name) => {
    users[socket.id] = { name, contacts: [] };
    socket.broadcast.emit('userJoined', name);
    // Отправляем новому пользователю список всех уже зарегистрированных
    const allUsers = Object.values(users).map(u => u.name);
    socket.emit('userList', allUsers);
  });

  // Получить историю диалога с конкретным пользователем
  socket.on('getHistory', ({ withUser }) => {
    const myName = users[socket.id]?.name;
    if (!myName) return;
    const key = [myName, withUser].sort().join('-');
    const history = messages[key] || [];
    socket.emit('history', { withUser, messages: history });
  });

  // Отправить личное сообщение
  socket.on('sendPrivate', ({ to, text }) => {
    const myName = users[socket.id]?.name;
    if (!myName || !to) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const key = [myName, to].sort().join('-');
    if (!messages[key]) messages[key] = [];
    messages[key].push({ from: myName, text, time });

    // Отправляем получателю
    const recipientSocket = Object.keys(users).find(id => users[id].name === to);
    if (recipientSocket) {
      io.to(recipientSocket).emit('newPrivateMessage', { from: myName, text, time });
    }
    // Отправляем отправителю (для обновления его чата)
    socket.emit('newPrivateMessage', { from: myName, text, time });
  });

  // Отключение
  socket.on('disconnect', () => {
    const name = users[socket.id]?.name;
    if (name) {
      socket.broadcast.emit('userLeft', name);
      delete users[socket.id];
    }
  });
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
