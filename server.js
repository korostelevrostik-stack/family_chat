const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// === РАБОТА С ФАЙЛОМ db.json (без библиотек) ===
function readDB() {
  try {
    const data = fs.readFileSync('db.json', 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { accounts: {}, messages: {} };
  }
}

function writeDB(data) {
  fs.writeFileSync('db.json', JSON.stringify(data, null, 2));
}

io.on('connection', (socket) => {
  console.log('✅ Новое подключение');

  // Регистрация
  socket.on('register', ({ login, password, name }) => {
    const db = readDB();
    if (db.accounts[login]) {
      socket.emit('registerError', 'Логин уже занят!');
      return;
    }
    db.accounts[login] = { name, password, online: true };
    writeDB(db);
    socket.login = login;
    socket.name = name;
    socket.emit('registerSuccess', { login, name });
    broadcastUsers();
  });

  // Вход
  socket.on('login', ({ login, password }) => {
    const db = readDB();
    if (!db.accounts[login]) {
      socket.emit('loginError', 'Аккаунт не найден!');
      return;
    }
    if (db.accounts[login].password !== password) {
      socket.emit('loginError', 'Неверный пароль!');
      return;
    }
    socket.login = login;
    socket.name = db.accounts[login].name;
    db.accounts[login].online = true;
    writeDB(db);
    socket.emit('loginSuccess', { login, name: db.accounts[login].name });
    broadcastUsers();
  });

  // Сменить имя
  socket.on('changeName', ({ newName }) => {
    if (!socket.login) return;
    const db = readDB();
    db.accounts[socket.login].name = newName;
    socket.name = newName;
    writeDB(db);
    broadcastUsers();
  });

  // Получить список пользователей
  socket.on('getUsers', () => {
    const db = readDB();
    const users = Object.keys(db.accounts).map(login => ({
      login,
      name: db.accounts[login].name,
      online: db.accounts[login].online
    }));
    socket.emit('userList', users);
  });

  // Получить историю диалога
  socket.on('getHistory', ({ withLogin }) => {
    if (!socket.login) return;
    const db = readDB();
    const key = [socket.login, withLogin].sort().join('-');
    const history = db.messages[key] || [];
    socket.emit('history', { withLogin, messages: history });
  });

  // Отправить личное сообщение
  socket.on('sendPrivate', ({ toLogin, text }) => {
    if (!socket.login) return;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const key = [socket.login, toLogin].sort().join('-');
    
    const db = readDB();
    if (!db.messages[key]) db.messages[key] = [];
    db.messages[key].push({ from: socket.login, text, time });
    writeDB(db);

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
      const db = readDB();
      if (db.accounts[socket.login]) {
        db.accounts[socket.login].online = false;
        writeDB(db);
      }
      broadcastUsers();
    }
  });

  function broadcastUsers() {
    const db = readDB();
    const users = Object.keys(db.accounts).map(login => ({
      login,
      name: db.accounts[login].name,
      online: db.accounts[login].online
    }));
    io.emit('userList', users);
  }
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
