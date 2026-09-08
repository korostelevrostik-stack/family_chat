// ============================================
// emojis.js — Панель со смайликами
// ============================================

const EmojiPicker = {
  // Список самых популярных смайликов
  emojis: [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊',
    '😋', '😎', '😍', '🥰', '😘', '😗', '😙', '😚', '🙂', '🤗',
    '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥',
    '😮', '🤐', '😯', '😪', '😫', '😴', '😌', '😛', '😜', '😝',
    '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑', '😲', '☹️', '🙁',
    '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩',
    '🤯', '😬', '😰', '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡',
    '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😇', '🤠',
    '🤡', '🥳', '🥺', '😈', '👿', '👹', '👺', '💀', '☠️', '👻',
    '👽', '👾', '🤖', '💩', '😺', '😸', '😹', '😻', '😼', '😽',
    '🙀', '😿', '😾', '🙌', '👏', '👋', '🤝', '👍', '👎', '👊',
    '✊', '🤛', '🤜', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘',
    '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👀'
  ],

  // Создать панель со смайликами
  createPanel(inputElement) {
    const panel = document.createElement('div');
    panel.id = 'emojiPanel';
    panel.style.cssText = `
      display: none;
      background: #1f2b33;
      border-top: 1px solid #2b3a45;
      padding: 8px 12px;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 150px;
      overflow-y: auto;
      justify-content: center;
    `;

    this.emojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.textContent = emoji;
      btn.style.cssText = `
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 8px;
        transition: 0.15s;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      btn.onmouseenter = () => btn.style.background = '#2b3a45';
      btn.onmouseleave = () => btn.style.background = 'none';
      btn.onclick = () => {
        inputElement.value += emoji;
        inputElement.focus();
        panel.style.display = 'none';
      };
      panel.appendChild(btn);
    });

    return panel;
  },

  // Показать/скрыть панель
  toggle(panel) {
    if (panel.style.display === 'none' || panel.style.display === '') {
      panel.style.display = 'flex';
    } else {
      panel.style.display = 'none';
    }
  }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  const inputArea = document.getElementById('inputArea');
  const msgInput = document.getElementById('msgInput');

  if (inputArea && msgInput) {
    // Создаём панель со смайликами
    const panel = EmojiPicker.createPanel(msgInput);
    inputArea.parentNode.insertBefore(panel, inputArea.nextSibling);

    // Кнопка для открытия смайликов
    const emojiBtn = document.createElement('button');
    emojiBtn.textContent = '😊';
    emojiBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 50%;
      color: #6b8c9e;
    `;
    emojiBtn.onclick = () => EmojiPicker.toggle(panel);
    emojiBtn.onmouseenter = () => emojiBtn.style.background = '#2b3a45';
    emojiBtn.onmouseleave = () => emojiBtn.style.background = 'none';

    // Добавляем кнопку перед полем ввода
    const inputField = inputArea.querySelector('input');
    if (inputField) {
      inputArea.insertBefore(emojiBtn, inputField);
    }
  }
});
