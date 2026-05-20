const TARGET_COLORS = [
  '#4361ee', '#e63946', '#2a9d8f', '#e9c46a',
  '#f4a261', '#264653', '#7209b7', '#fb8500'
];

let startDate = null;
let targets = [];
let history = [];
let currentYear, currentMonth;

const startDateInput = document.getElementById('start-date');
const daysPassed = document.getElementById('days-passed');
const targetDaysInput = document.getElementById('target-days');
const addTargetBtn = document.getElementById('add-target-btn');
const targetList = document.getElementById('target-list');
const calendarBody = document.getElementById('calendar-body');
const calendarTitle = document.getElementById('calendar-title');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const tooltip = document.getElementById('tooltip');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const clearBtn = document.getElementById('clear-btn');
const historyList = document.getElementById('history-list');

function init() {
  loadFromStorage();
  loadHistory();
  loadFromURL();

  if (startDate) {
    startDateInput.value = formatDateToInput(startDate);
  }

  const today = new Date();
  currentYear = today.getFullYear();
  currentMonth = today.getMonth();

  updateDaysPassed();
  renderTargetList();
  renderCalendar();
  renderHistory();

  startDateInput.addEventListener('change', onStartDateChange);
  addTargetBtn.addEventListener('click', onAddTarget);
  targetDaysInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onAddTarget();
  });
  prevMonthBtn.addEventListener('click', () => changeMonth(-1));
  nextMonthBtn.addEventListener('click', () => changeMonth(1));
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  clearBtn.addEventListener('click', clearAll);
}

function clearAll() {
  startDate = null;
  targets = [];
  startDateInput.value = '';
  deleteCookie('day-counter');
  updateDaysPassed();
  renderTargetList();
  renderCalendar();
}

// History
function saveHistory() {
  if (!startDate || targets.length === 0) return;
  const entry = {
    startDate: formatDateToInput(startDate),
    targets: [...targets],
    savedAt: new Date().toISOString()
  };
  // avoid duplicate: same startDate + same targets
  const key = entry.startDate + '|' + entry.targets.join(',');
  history = history.filter(h => (h.startDate + '|' + h.targets.join(',')) !== key);
  history.unshift(entry);
  if (history.length > 20) history.pop();
  setCookie('day-counter-history', JSON.stringify(history), COOKIE_DAYS);
  renderHistory();
}

function loadHistory() {
  const raw = getCookie('day-counter-history');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) history = data;
  } catch (e) {}
}

function applyHistory(index) {
  const entry = history[index];
  if (!entry) return;
  startDate = parseInputDate(entry.startDate);
  targets = [...entry.targets];
  startDateInput.value = entry.startDate;
  saveToStorage();
  updateDaysPassed();
  renderTargetList();
  renderCalendar();
}

function removeHistory(index) {
  history.splice(index, 1);
  setCookie('day-counter-history', JSON.stringify(history), COOKIE_DAYS);
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = '尚無紀錄';
    historyList.appendChild(empty);
    return;
  }
  history.forEach((entry, i) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <span class="history-item-info">
        <span class="history-item-date">${entry.startDate}</span>
        <span class="history-item-targets">目標：${entry.targets.join(', ')} 天</span>
      </span>
      <button class="delete-btn" data-index="${i}">&times;</button>
    `;
    li.querySelector('.history-item-info').addEventListener('click', () => applyHistory(i));
    li.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeHistory(i);
    });
    historyList.appendChild(li);
  });
}

function onStartDateChange() {
  const val = startDateInput.value;
  if (val) {
    startDate = parseInputDate(val);
  } else {
    startDate = null;
  }
  saveToStorage();
  updateDaysPassed();
  renderTargetList();
  renderCalendar();
}

function onAddTarget() {
  const val = parseInt(targetDaysInput.value, 10);
  if (!val || val < 1) return;
  targets.push(val);
  targetDaysInput.value = '';
  saveToStorage();
  saveHistory();
  renderTargetList();
  renderCalendar();
}

function removeTarget(index) {
  targets.splice(index, 1);
  saveToStorage();
  renderTargetList();
  renderCalendar();
}

function updateDaysPassed() {
  if (!startDate) {
    daysPassed.textContent = '';
    return;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = daysBetween(startDate, today);
  daysPassed.textContent = `已經過 ${diff} 天`;
}

function renderTargetList() {
  targetList.innerHTML = '';
  targets.forEach((days, i) => {
    const li = document.createElement('li');
    li.className = 'target-item';

    const color = TARGET_COLORS[i % TARGET_COLORS.length];
    const reachDate = startDate ? addDays(startDate, days) : null;

    li.innerHTML = `
      <span class="target-color" style="background:${color}"></span>
      <span class="target-info">
        <span class="target-days-label">第 ${days} 天</span>
        <span class="target-date">${reachDate ? formatDate(reachDate) : '（請先選擇起始日期）'}</span>
      </span>
      <button class="delete-btn" data-index="${i}">&times;</button>
    `;
    targetList.appendChild(li);
  });

  targetList.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      removeTarget(parseInt(btn.dataset.index, 10));
    });
  });
}

function renderCalendar() {
  calendarTitle.textContent = `${currentYear} 年 ${currentMonth + 1} 月`;
  calendarBody.innerHTML = '';

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevLastDay = new Date(currentYear, currentMonth, 0);
  const prevDays = prevLastDay.getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDateMap = buildTargetDateMap();

  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    let cellDate;
    if (i < startDayOfWeek) {
      const day = prevDays - startDayOfWeek + i + 1;
      cell.textContent = day;
      cell.classList.add('other-month');
      cellDate = new Date(currentYear, currentMonth - 1, day);
    } else if (i >= startDayOfWeek + daysInMonth) {
      const day = i - startDayOfWeek - daysInMonth + 1;
      cell.textContent = day;
      cell.classList.add('other-month');
      cellDate = new Date(currentYear, currentMonth + 1, day);
    } else {
      const day = i - startDayOfWeek + 1;
      cell.textContent = day;
      cellDate = new Date(currentYear, currentMonth, day);

      if (cellDate.getTime() === today.getTime()) {
        cell.classList.add('today');
      }
    }

    const dateKey = formatDateKey(cellDate);
    if (targetDateMap[dateKey]) {
      cell.classList.add('has-target');
      const dotContainer = document.createElement('div');
      dotContainer.className = 'target-dot';
      targetDateMap[dateKey].forEach((color) => {
        const dot = document.createElement('span');
        dot.style.background = color;
        dotContainer.appendChild(dot);
      });
      cell.appendChild(dotContainer);
    }

    if (!cell.classList.contains('other-month') && startDate) {
      cell.addEventListener('mouseenter', (e) => showTooltip(e, cellDate));
      cell.addEventListener('mouseleave', hideTooltip);
    }

    calendarBody.appendChild(cell);
  }
}

function buildTargetDateMap() {
  const map = {};
  if (!startDate) return map;

  targets.forEach((days, i) => {
    const date = addDays(startDate, days);
    const key = formatDateKey(date);
    if (!map[key]) map[key] = [];
    map[key].push(TARGET_COLORS[i % TARGET_COLORS.length]);
  });

  return map;
}

function showTooltip(e, cellDate) {
  if (!startDate) return;
  const diff = daysBetween(startDate, cellDate);
  tooltip.textContent = `第 ${diff} 天`;
  tooltip.classList.add('visible');

  const rect = e.target.getBoundingClientRect();
  const parentRect = e.target.closest('.calendar-section').getBoundingClientRect();
  tooltip.style.left = (rect.left - parentRect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
  tooltip.style.top = (rect.top - parentRect.top - tooltip.offsetHeight - 6) + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  renderCalendar();
}

// Utility functions
function daysBetween(a, b) {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateToInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseInputDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Cookie helpers
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.split('; ').find(c => c.startsWith(encodeURIComponent(name) + '='));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
}

function saveToStorage() {
  const data = {
    startDate: startDate ? formatDateToInput(startDate) : null,
    targets: targets
  };
  setCookie('day-counter', JSON.stringify(data), COOKIE_DAYS);
}

function loadFromStorage() {
  const raw = getCookie('day-counter');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.startDate) {
      startDate = parseInputDate(data.startDate);
    }
    if (Array.isArray(data.targets)) {
      targets = data.targets;
    }
  } catch (e) {
    // ignore corrupt data
  }
}

// URL query parameters — override localStorage if present
// Usage: ?start=2026-01-01&targets=100,200,365
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);

  const startParam = params.get('start');
  if (startParam && /^\d{4}-\d{2}-\d{2}$/.test(startParam)) {
    startDate = parseInputDate(startParam);
  }

  const targetsParam = params.get('targets');
  if (targetsParam) {
    const parsed = targetsParam.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => n > 0);
    if (parsed.length > 0) {
      targets = parsed;
    }
  }
}

init();
