const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const db = new sqlite3.Database('messages.db');

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    text TEXT,
    time TEXT
  )
`);

io.on('connection', (socket) => {
  console.log('✅ Кто-то подключился');

  db.all('SELECT name, text, time FROM messages ORDER BY id LIMIT 50', (err, rows) => {
    if (err) return console.error(err);
    socket.emit('history', rows);
  });

  socket.on('sendMessage', (data) => {
    const { name, text } = data;
    const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    db.run('INSERT INTO messages (name, text, time) VALUES (?, ?, ?)', [name, text, time]);

    io.emit('newMessage', { name, text, time });
  });

  socket.on('disconnect', () => {
    console.log('❌ Кто-то вышел');
  });
});

server.listen(3000, () => {
  console.log('🚀 Сервер запущен на http://localhost:3000');
});
