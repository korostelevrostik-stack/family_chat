const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { LowSync } = require('lowdb');
const { JSONFileSync } = require('lowdb');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Подключаем базу данных (файл db.json)
const adapter = new JSONFileSync('db.json');
const db = new LowSync(adapter);

// Инициализация базы
db.read();
db.data ||= { accounts: {}, messages: {} };
db.write();

io.on('connection', (socket) => {
  console.log('✅ Новое подключение');

  // Регистрация
  socket.on('register', ({ login, password, name }) => {
    db.read();
    if (db.data.accounts[login]) {
      socket.emit('registerError', 'Логин уже занят!');
      return;
    }
    db.data.accounts[login] = { name, password, online: true };
    db.write();
    socket.login = login;
    socket.name = name;
    socket.emit('registerSuccess', { login, name });
    broadcastUsers();
  });

  // Вход
  socket.on('login', ({ login, password }) => {
    db.read();
    if (!db.data.accounts[login]) {
      socket.emit('loginError', 'Аккаунт не найден!');
      return;
    }
    if (db.data.accounts[login].password !== password) {
      socket.emit('loginError', 'Неверный пароль!');
      return;
    }
    socket.login = login;
    socket.name = db.data.accounts[login].name;
    db.data.accounts[login].online = true;
    db.write();
    socket.emit('loginSuccess', { login, name: db.data.accounts[login].name });
    broadcastUsers();
  });

  // Сменить имя
  socket.on('changeName', ({ newName }) => {
    if (!socket.login) return;
    db.read();
    db.data.accounts[socket.login].name = newName;
    socket.name = newName;
    db.write();
    broadcastUsers();
  });

  // Получить список пользователей
  socket.on('getUsers', () => {
    db.read();
    const users = Object.keys(db.data.accounts).map(login => ({
      login,
      name: db.data.accounts[login].name,
      online: db.data.accounts[login].online
    }));
    socket.emit('userList', users);
  });

  // Получить историю диалога
  socket.on('getHistory', ({ withLogin }) => {
    if (!socket.login) return;
    db.read();
    const key = [socket.login, withLogin].sort().join('-');
    const history = db.data.messages[key] || [];
    socket.emit('history', { withLogin, messages: history });
  });

  // Отправить личное сообщение
  socket.on('sendPrivate', ({ toLogin, text }) => {
    if (!socket.login) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const key = [socket.login, toLogin].sort().join('-');
    
    db.read();
    if (!db.data.messages[key]) db.data.messages[key] = [];
    db.data.messages[key].push({ from: socket.login, text, time });
    db.write();

    // Отправляем получателю
    const recipient = Object.keys(io.sockets.sockets).find(id => {
      return io.sockets.sockets[id].login === toLogin;
    });
    if (recipient) {
      io.to(recipient).emit('newPrivateMessage', { 
        from: socket.login, 
        fromName: socket.name, 
        text, 
        time 
      });
    }
    socket.emit('newPrivateMessage', { 
      from: socket.login, 
      fromName: socket.name, 
      text, 
      time 
    });
  });

  // Отключение
  socket.on('disconnect', () => {
    if (socket.login) {
      db.read();
      db.data.accounts[socket.login].online = false;
      db.write();
      broadcastUsers();
    }
  });

  function broadcastUsers() {
    db.read();
    const users = Object.keys(db.data.accounts).map(login => ({
      login,
      name: db.data.accounts[login].name,
      online: db.data.accounts[login].online
    }));
    io.emit('userList', users);
  }
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
