// ============================================
// auth.js — Авторизация и запоминание аккаунта
// ============================================

const Auth = {
  STORAGE_KEY: 'chat_user',

  // Сохранить данные аккаунта
  save(login, password) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ login, password }));
      return true;
    } catch (e) {
      console.warn('Не удалось сохранить аккаунт:', e);
      return false;
    }
  },

  // Загрузить сохранённые данные
  load() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Не удалось загрузить аккаунт:', e);
      return null;
    }
  },

  // Удалить сохранённые данные (выход)
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  // Проверить, есть ли сохранённый аккаунт
  hasSaved() {
    return this.load() !== null;
  },

  // Получить сохранённый логин (без пароля)
  getSavedLogin() {
    const data = this.load();
    return data ? data.login : null;
  }
};

// ============================================
// Инициализация формы входа
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const loginInput = document.getElementById('loginInput');
  const passInput = document.getElementById('passInput');
  const nameInput = document.getElementById('nameInput');
  const authBtn = document.getElementById('authBtn');
  const authTitle = document.getElementById('authTitle');
  const authError = document.getElementById('authError');
  const authSwitch = document.getElementById('authSwitch');

  let isRegisterMode = false;

  // Если есть сохранённый аккаунт — показываем подсказку
  const saved = Auth.load();
  if (saved) {
    const hint = document.createElement('div');
    hint.className = 'saved-info';
    hint.textContent = `🔑 Вы уже входили как "${saved.login}". Нажмите "Войти" для автовхода.`;
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      const firstInput = loginScreen.querySelector('input');
      if (firstInput) firstInput.parentNode.insertBefore(hint, firstInput);
    }
    // Автозаполнение полей
    loginInput.value = saved.login;
    passInput.value = saved.password;
  }

  // Переключение регистрация / вход
  authSwitch.addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      authTitle.textContent = '📝 Регистрация';
      authBtn.textContent = 'Зарегистрироваться';
      authSwitch.innerHTML = 'Уже есть аккаунт? <span>Войти</span>';
      nameInput.style.display = 'block';
    } else {
      authTitle.textContent = '💬 Вход';
      authBtn.textContent = 'Войти';
      authSwitch.innerHTML = 'Нет аккаунта? <span>Зарегистрироваться</span>';
      nameInput.style.display = 'none';
    }
    authError.textContent = '';
  });

  // Кнопка "Войти" / "Зарегистрироваться"
  authBtn.addEventListener('click', () => {
    const login = loginInput.value.trim();
    const password = passInput.value.trim();
    if (!login || !password) {
      authError.textContent = 'Заполните все поля!';
      return;
    }

    if (isRegisterMode) {
      const name = nameInput.value.trim() || login;
      // Отправляем событие на сервер (обрабатывается в main.js)
      window.dispatchEvent(new CustomEvent('authRegister', { detail: { login, password, name } }));
    } else {
      // Отправляем событие на сервер (обрабатывается в main.js)
      window.dispatchEvent(new CustomEvent('authLogin', { detail: { login, password } }));
    }
  });

  // Обработка ошибок с сервера
  window.addEventListener('authError', (e) => {
    authError.textContent = e.detail.message;
  });

  // Обработка успешного входа/регистрации
  window.addEventListener('authSuccess', (e) => {
    const { login, password } = e.detail;
    // Сохраняем аккаунт
    Auth.save(login, password);
    // Переключаем экраны (обрабатывается в main.js)
    window.dispatchEvent(new CustomEvent('enterApp'));
  });

  // Обработка выхода
  window.addEventListener('authLogout', () => {
    Auth.clear();
    // Показываем экран входа
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('contactsScreen').classList.remove('active');
    document.getElementById('chatScreen').classList.remove('active');
    document.getElementById('loginInput').value = '';
    document.getElementById('passInput').value = '';
  });

  // Если аккаунт сохранён — можно войти автоматически при нажатии Enter
  if (saved) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.getElementById('loginScreen').classList.contains('active')) {
        authBtn.click();
      }
    });
  }
});

// Экспортируем Auth для использования в других скриптах
window.Auth = Auth;
