const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// База данных в памяти
const accounts = {}; // { login: { name, password, online } }
const messages = {}; // { "login1-login2": [ { from, text, time } ] }

io.on('connection', (socket) => {
  console.log('✅ Новое подключение');

  // Регистрация
  socket.on('register', ({ login, password, name }) => {
    if (accounts[login]) {
      socket.emit('registerError', 'Логин уже занят!');
      return;
    }
    accounts[login] = { name, password, online: true };
    socket.login = login;
    socket.name = name;
    socket.emit('registerSuccess', { login, name });
    broadcastUsers();
  });

  // Вход
  socket.on('login', ({ login, password }) => {
    if (!accounts[login]) {
      socket.emit('loginError', 'Аккаунт не найден!');
      return;
    }
    if (accounts[login].password !== password) {
      socket.emit('loginError', 'Неверный пароль!');
      return;
    }
    socket.login = login;
    socket.name = accounts[login].name;
    accounts[login].online = true;
    socket.emit('loginSuccess', { login, name: accounts[login].name });
    broadcastUsers();
  });

  // Сменить отображаемое имя
  socket.on('changeName', ({ newName }) => {
    if (!socket.login) return;
    accounts[socket.login].name = newName;
    socket.name = newName;
    broadcastUsers();
  });

  // Получить список пользователей
  socket.on('getUsers', () => {
    const users = Object.keys(accounts).map(login => ({
      login,
      name: accounts[login].name,
      online: accounts[login].online
    }));
    socket.emit('userList', users);
  });

  // Получить историю диалога
  socket.on('getHistory', ({ withLogin }) => {
    if (!socket.login) return;
    const key = [socket.login, withLogin].sort().join('-');
    const history = messages[key] || [];
    socket.emit('history', { withLogin, messages: history });
  });

  // Отправить личное сообщение
  socket.on('sendPrivate', ({ toLogin, text }) => {
    if (!socket.login) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const key = [socket.login, toLogin].sort().join('-');
    if (!messages[key]) messages[key] = [];
    messages[key].push({ from: socket.login, text, time });

    // Отправляем получателю, если он онлайн
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
    // Отправляем отправителю
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
      accounts[socket.login].online = false;
      broadcastUsers();
    }
  });

  // Рассылка списка пользователей всем
  function broadcastUsers() {
    const users = Object.keys(accounts).map(login => ({
      login,
      name: accounts[login].name,
      online: accounts[login].online
    }));
    io.emit('userList', users);
  }
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
