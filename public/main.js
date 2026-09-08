// ============================================
// main.js — Основная логика чата
// ============================================

// ===== СОСТОЯНИЕ =====
let myLogin = '';
let myName = '';
let currentChatLogin = '';
let allUsers = [];

// ===== DOM-ЭЛЕМЕНТЫ =====
const loginScreen = document.getElementById('loginScreen');
const contactsScreen = document.getElementById('contactsScreen');
const chatScreen = document.getElementById('chatScreen');
const contactsList = document.getElementById('contactsList');
const messagesContainer = document.getElementById('messagesContainer');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const backBtn = document.getElementById('backBtn');
const menuBtn = document.getElementById('menuBtn');
const headerName = document.getElementById('headerName');
const headerStatus = document.getElementById('headerStatus');
const headerAvatar = document.getElementById('headerAvatar');

// ===== ПОДКЛЮЧЕНИЕ К СЕРВЕРУ =====
const socket = io();

// ===== АВТОРИЗАЦИЯ (СОБЫТИЯ ИЗ auth.js) =====

// Регистрация
window.addEventListener('authRegister', (e) => {
  socket.emit('register', e.detail);
});

// Логин
window.addEventListener('authLogin', (e) => {
  socket.emit('login', e.detail);
});

// Успешный вход
socket.on('registerSuccess', (data) => {
  myLogin = data.login;
  myName = data.name;
  window.dispatchEvent(new CustomEvent('authSuccess', { detail: { login: data.login, password: '***' } }));
});

socket.on('loginSuccess', (data) => {
  myLogin = data.login;
  myName = data.name;
  window.dispatchEvent(new CustomEvent('authSuccess', { detail: { login: data.login, password: '***' } }));
});

// Ошибки авторизации
socket.on('registerError', (msg) => {
  window.dispatchEvent(new CustomEvent('authError', { detail: { message: msg } }));
});
socket.on('loginError', (msg) => {
  window.dispatchEvent(new CustomEvent('authError', { detail: { message: msg } }));
});

// ===== ВХОД В ПРИЛОЖЕНИЕ =====
window.addEventListener('enterApp', () => {
  loginScreen.classList.remove('active');
  contactsScreen.classList.add('active');
  chatScreen.classList.remove('active');
  headerName.textContent = 'Контакты';
  headerStatus.textContent = '';
  headerAvatar.textContent = '👤';
  backBtn.style.display = 'none';
  socket.emit('getUsers');
});

// ===== АВТОВХОД ПРИ ЗАГРУЗКЕ =====
document.addEventListener('DOMContentLoaded', () => {
  const saved = window.Auth ? window.Auth.load() : null;
  if (saved && saved.login && saved.password) {
    // Автоматически отправляем логин
    setTimeout(() => {
      socket.emit('login', { login: saved.login, password: saved.password });
    }, 500);
  }
});

// ===== СПИСОК ПОЛЬЗОВАТЕЛЕЙ =====
socket.on('userList', (users) => {
  allUsers = users.filter(u => u.login !== myLogin);
  renderContacts();
});

socket.on('userJoined', (login) => {
  const user = allUsers.find(u => u.login === login);
  if (!user && login !== myLogin) {
    allUsers.push({ login, name: login, online: true });
    renderContacts();
  }
});

socket.on('userLeft', (login) => {
  const user = allUsers.find(u => u.login === login);
  if (user) user.online = false;
  renderContacts();
});

function renderContacts() {
  if (!contactsList) return;
  contactsList.innerHTML = '';
  if (allUsers.length === 0) {
    contactsList.innerHTML = `<div style="color:#6b8c9e;text-align:center;padding:40px 20px;">Нет контактов.<br>Пригласите родных!</div>`;
    return;
  }
  allUsers.forEach(user => {
    const div = document.createElement('div');
    div.className = 'contact-item';
    const avatarLetter = user.name.charAt(0).toUpperCase();
    const onlineClass = user.online ? 'on' : 'off';
    div.innerHTML = `
      <div class="avatar">
        ${avatarLetter}
        <div class="online ${onlineClass}"></div>
      </div>
      <div class="info">
        <div class="name">${user.name}</div>
        <div class="last-msg">${user.online ? '🟢 онлайн' : '⚪ не в сети'}</div>
      </div>
    `;
    div.addEventListener('click', () => openChat(user.login));
    contactsList.appendChild(div);
  });
}

// ===== ОТКРЫТЬ ЧАТ =====
function openChat(login) {
  currentChatLogin = login;
  const user = allUsers.find(u => u.login === login);
  contactsScreen.classList.remove('active');
  chatScreen.classList.add('active');
  backBtn.style.display = 'block';
  headerName.textContent = user ? user.name : login;
  headerStatus.textContent = user?.online ? '🟢 онлайн' : '⚪ не в сети';
  headerAvatar.textContent = user ? user.name.charAt(0).toUpperCase() : '👤';
  messagesContainer.innerHTML = '';
  socket.emit('getHistory', { withLogin: login });
  msgInput.focus();
}

// ===== НАЗАД =====
backBtn.addEventListener('click', () => {
  currentChatLogin = '';
  chatScreen.classList.remove('active');
  contactsScreen.classList.add('active');
  backBtn.style.display = 'none';
  headerName.textContent = 'Контакты';
  headerStatus.textContent = '';
  headerAvatar.textContent = '👤';
});

// ===== МЕНЮ =====
menuBtn.addEventListener('click', () => {
  const newName = prompt('Введите новое отображаемое имя:', myName);
  if (newName && newName.trim() !== myName) {
    socket.emit('changeName', { newName: newName.trim() });
    myName = newName.trim();
  }
});

// ===== ИСТОРИЯ =====
socket.on('history', ({ withLogin, messages }) => {
  if (withLogin === currentChatLogin) {
    messagesContainer.innerHTML = '';
    messages.forEach(msg => addMessage(msg.from, msg.text, msg.time));
  }
});

// ===== НОВОЕ СООБЩЕНИЕ =====
socket.on('newPrivateMessage', ({ from, text, time }) => {
  if (currentChatLogin === from || currentChatLogin === myLogin) {
    addMessage(from, text, time);
  }
  renderContacts();
});

function addMessage(from, text, time) {
  const div = document.createElement('div');
  div.className = `msg ${from === myLogin ? 'me' : 'them'}`;
  div.innerHTML = `${text}<span class="time">${time}</span>`;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ===== ОТПРАВКА =====
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !currentChatLogin) return;
  socket.emit('sendPrivate', { toLogin: currentChatLogin, text });
  msgInput.value = '';
  msgInput.focus();
}

// ===== ВЫХОД ИЗ АККАУНТА (через меню) =====
// Добавляем кнопку "Выйти" в меню (можно доработать позже)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && chatScreen.classList.contains('active')) {
    backBtn.click();
  }
});
