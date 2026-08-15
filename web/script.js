let currentUser = localStorage.getItem('son_current_user') || 'Anonymous';
let dreams = JSON.parse(localStorage.getItem('son_dreams') || '[]');
let isSignUpMode = false;
let selectedTags = new Set();
let currentView = 'journal';

let currentPage = 1;
const ITEMS_PER_PAGE = 4;
let currentSort = 'created-desc';

const form = document.getElementById('dream-form');
const dreamDateInput = document.getElementById('dream-date');
const dreamTextInput = document.getElementById('dream-text');
const dreamTagsInput = document.getElementById('dream-tags');
const dreamPublicInput = document.getElementById('dream-public');
const dreamTextError = document.getElementById('dream-text-error');
const dreamTagsError = document.getElementById('dream-tags-error');
const submitBtn = document.querySelector('#dream-form button[type="submit"]');

const moodSlider = document.getElementById('mood-score');
const realismSlider = document.getElementById('realism-score');
const moodVal = document.getElementById('mood-val');
const realismVal = document.getElementById('realism-val');

const dreamsList = document.getElementById('dreams-list');
const publicDreamsList = document.getElementById('public-dreams-list');
const tagsFilterContainer = document.getElementById('tags-filter-container');
const authBtn = document.getElementById('auth-btn');
const userDisplay = document.getElementById('user-display');

const navMyDreams = document.getElementById('nav-my-dreams');
const navPublicDreams = document.getElementById('nav-public-dreams');

const viewJournal = document.getElementById('view-journal');
const viewPublic = document.getElementById('view-public');

const filterDaySelect = document.getElementById('filter-day');
const filterMonthSelect = document.getElementById('filter-month');
const filterYearSelect = document.getElementById('filter-year');
const sortSelect = document.getElementById('sort-select');

const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');

if (dreamDateInput) {
  if (dreamDateInput.type === 'date') {
    dreamDateInput.value = new Date().toISOString().split('T')[0];
  } else {
    const _d = new Date();
    const _m = String(_d.getMonth() + 1).padStart(2, '0');
    const _day = String(_d.getDate()).padStart(2, '0');
    dreamDateInput.value = `${_m}/${_day}/${_d.getFullYear()}`;
  }
}

const authModal = document.getElementById('auth-modal');
const modalClose = document.getElementById('modal-close');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
const modalSubmitBtn = document.getElementById('modal-submit-btn');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const authSwitchText = document.getElementById('auth-switch-text');

const API_BASE = 'http://localhost:8000';

const authUsernameRegex = /^[A-Za-z0-9_]{3,32}$/; // letters, digits, underscore, 3-32 chars
const authPasswordRegex = /^[A-Za-z0-9_]{8,30}$/; // min 8, max 30 chars, letters/digits/underscore

let matrixChart;
let moodTimelineChart;
let realismTimelineChart;
let tagsBarChart;

let __fetchMyDreamsPromise = null;

const textRegex = /^[a-zA-Z0-9\s,():\-—!?]*$/;
const tagsRegex = /^[a-zA-Z\s,]*$/;

function saveDreamsToStorage() {
  localStorage.setItem('son_dreams', JSON.stringify(dreams));
}

function validateForm(textInput = dreamTextInput, textError = dreamTextError, tagsInput = dreamTagsInput, tagsError = dreamTagsError, targetBtn = submitBtn) {
  if (!textInput || !tagsInput) return true;
  
  let isValid = true;
  const textVal = textInput.value;

  if (textVal.length > 0 && textVal.trim().length === 0) {
    textInput.classList.add('invalid-input');
    textError.textContent = 'Description cannot consist only of spaces';
    isValid = false;
  } else if (/ {11,}/.test(textVal)) {
    textInput.classList.add('invalid-input');
    textError.textContent = 'Maximum 10 consecutive spaces allowed';
    isValid = false;
  } else if (!textRegex.test(textVal)) {
    textInput.classList.add('invalid-input');
    textError.textContent = 'Allowed characters: Latin letters, numbers, spaces, commas, (), :, -, —, !, ?';
    isValid = false;
  } else if (textVal.length > 1500) {
    textInput.classList.add('invalid-input');
    textError.textContent = `Character limit exceeded: ${textVal.length}/1500`;
    isValid = false;
  } else {
    textInput.classList.remove('invalid-input');
    textError.textContent = '';
  }

  const tagsVal = tagsInput.value;

  const rawTags = tagsVal.split(',');
  const hasEmptyOrSpacesOnlyTag = rawTags.some(t => t.length > 0 && t.trim().length === 0);

  if (hasEmptyOrSpacesOnlyTag) {
    tagsInput.classList.add('invalid-input');
    tagsError.textContent = 'Tags cannot consist only of spaces';
    isValid = false;
  } else if (!tagsRegex.test(tagsVal)) {
    tagsInput.classList.add('invalid-input');
    tagsError.textContent = 'Allowed characters: Latin letters, spaces, and commas';
    isValid = false;
  } else {
    const parsedTags = rawTags.map(t => t.trim()).filter(t => t.length > 0);

    if (parsedTags.length > 15) {
      tagsInput.classList.add('invalid-input');
      tagsError.textContent = `Tag limit exceeded: ${parsedTags.length}/15 max tags`;
      isValid = false;
    } else {
      tagsInput.classList.remove('invalid-input');
      tagsError.textContent = '';
    }
  }

  if (targetBtn) {
    targetBtn.disabled = !isValid;
  }
  return isValid;
}

if (dreamTextInput) dreamTextInput.addEventListener('input', () => validateForm());
if (dreamTagsInput) dreamTagsInput.addEventListener('input', () => validateForm());

function switchView(viewName) {
  currentView = viewName;

  viewJournal.classList.remove('active');
  viewPublic.classList.remove('active');

  navMyDreams.classList.remove('active');
  navPublicDreams.classList.remove('active');

  if (viewName === 'journal') {
    viewJournal.classList.add('active');
    navMyDreams.classList.add('active');
  } else if (viewName === 'public') {
    viewPublic.classList.add('active');
    navPublicDreams.classList.add('active');
  }
}

if (navMyDreams) navMyDreams.addEventListener('click', () => switchView('journal'));
if (navPublicDreams) navPublicDreams.addEventListener('click', () => switchView('public'));

if (filterDaySelect) {
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    filterDaySelect.appendChild(opt);
  }

  [filterDaySelect, filterMonthSelect, filterYearSelect].forEach(select => {
    select.addEventListener('change', () => {
      currentPage = 1;
      renderDreamsList();
    });
  });
}

if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderDreamsList();
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderDreamsList();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    renderDreamsList();
  });
}

function updateSliderBackground(slider) {
  if (!slider) return;
  const min = parseFloat(slider.min) || -10;
  const max = parseFloat(slider.max) || 10;
  const val = parseFloat(slider.value);

  const baseColor = '#2a3d2e';
  const activeColor = '#00ff87';

  if (val === 0) {
    slider.style.setProperty('background', baseColor, 'important');
    return;
  }

  const zeroPercent = ((0 - min) / (max - min)) * 100;
  const valPercent = ((val - min) / (max - min)) * 100;

  let gradient = '';

  if (val > 0) {
    gradient = `linear-gradient(to right, ${baseColor} 0%, ${baseColor} ${zeroPercent}%, ${activeColor} ${zeroPercent}%, ${activeColor} ${valPercent}%, ${baseColor} ${valPercent}%, ${baseColor} 100%)`;
  } else {
    gradient = `linear-gradient(to right, ${baseColor} 0%, ${baseColor} ${valPercent}%, ${activeColor} ${valPercent}%, ${activeColor} ${zeroPercent}%, ${baseColor} ${zeroPercent}%, ${baseColor} 100%)`;
  }

  slider.style.setProperty('background', gradient, 'important');
}

if (moodSlider) {
  moodSlider.addEventListener('input', (e) => {
    moodVal.textContent = e.target.value;
    updateSliderBackground(e.target);
  });
}

if (realismSlider) {
  realismSlider.addEventListener('input', (e) => {
    realismVal.textContent = e.target.value;
    updateSliderBackground(e.target);
  });
}

const centerAxesPlugin = {
  id: 'centerAxes',
  afterDraw: (chart) => {
    const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = chart;
    if (!x || !y) return;

    const xZero = x.getPixelForValue(0);
    const yZero = y.getPixelForValue(0);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ff87';

    ctx.beginPath();
    ctx.moveTo(xZero, top);
    ctx.lineTo(xZero, bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(left, yZero);
    ctx.lineTo(right, yZero);
    ctx.stroke();

    ctx.restore();
  }
};

function initCharts() {
  const ctxMatrix = document.getElementById('matrix-chart').getContext('2d');
  matrixChart = new Chart(ctxMatrix, {
    type: 'scatter',
    data: { datasets: [] },
    plugins: [centerAxesPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      scales: {
        x: {
          min: -10,
          max: 10,
          ticks: {
            stepSize: 2
          },
          title: { display: true, text: 'Mood', color: '#00ff87' },
          grid: { color: (ctx) => ctx.tick.value === 0 ? 'transparent' : '#1b2e1e' }
        },
        y: {
          min: -10,
          max: 10,
          ticks: {
            stepSize: 2
          },
          title: { display: true, text: 'Realism', color: '#00ff87' },
          grid: { color: (ctx) => ctx.tick.value === 0 ? 'transparent' : '#1b2e1e' }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.raw.formattedDate}: "${ctx.raw.text.substring(0, 25)}..."`
          }
        }
      }
    }
  });

  const ctxTags = document.getElementById('tags-bar-chart').getContext('2d');
  tagsBarChart = new Chart(ctxTags, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const idx = items[0].dataIndex;
              return items[0].chart.data.fullTags ? '#' + items[0].chart.data.fullTags[idx] : items[0].label;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#6b8a70' }, grid: { display: false } },
        y: { ticks: { precision: 0, color: '#6b8a70' }, grid: { color: '#1b2e1e' } }
      }
    }
  });

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => items[0] ? items[0].label : ''
        }
      }
    },
    scales: {
      x: { 
        ticks: { display: false },
        grid: { display: false } 
      },
      y: { min: -10, max: 10, ticks: { stepSize: 2 }, grid: { color: '#1b2e1e' } }
    }
  };

  const ctxMood = document.getElementById('mood-timeline-chart').getContext('2d');
  moodTimelineChart = new Chart(ctxMood, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: timelineOptions
  });

  const ctxRealism = document.getElementById('realism-timeline-chart').getContext('2d');
  realismTimelineChart = new Chart(ctxRealism, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: timelineOptions
  });
}

function updateAuthUI() {
  if (!userDisplay || !authBtn) return;
  const token = localStorage.getItem('son_token');
  const loggedIn = token && currentUser && currentUser !== 'Anonymous';

  if (loggedIn) {
    userDisplay.textContent = `👤 ${currentUser}`;
    authBtn.textContent = 'Log Out';
  } else {
    userDisplay.textContent = '';
    authBtn.textContent = 'Log In / Sign Up';
  }

  if (submitBtn) {
    if (loggedIn) {
      submitBtn.disabled = !validateForm();
      submitBtn.removeAttribute('title');
    } else {
      submitBtn.disabled = true;
      submitBtn.title = 'You must be signed in to save a dream';
    }
  }
}

if (authBtn) {
  authBtn.addEventListener('click', () => {
    if (currentUser && currentUser !== 'Anonymous') {
      currentUser = 'Anonymous';
      localStorage.removeItem('son_current_user');
      localStorage.removeItem('son_token');
      updateAuthUI();
      updateUI();
    } else {
      authModal.style.display = 'flex';
    }
  });
}

if (modalClose) modalClose.addEventListener('click', () => authModal.style.display = 'none');

if (toggleAuthMode) {
  toggleAuthMode.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    modalTitle.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    modalSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Log In';
    authSwitchText.textContent = isSignUpMode ? 'Already have an account?' : "Don't have an account?";
    toggleAuthMode.textContent = isSignUpMode ? 'Log In' : 'Sign Up';
    try {
      authForm.reset();
      const u = document.getElementById('username');
      const p = document.getElementById('password');
      if (u) u.classList.remove('invalid-input');
      if (p) p.classList.remove('invalid-input');
      const ue = document.getElementById('auth-username-error');
      const pe = document.getElementById('auth-password-error');
      const ge = document.getElementById('auth-error');
      if (ue) ue.textContent = '';
      if (pe) pe.textContent = '';
      if (ge) ge.textContent = '';
      if (modalSubmitBtn) modalSubmitBtn.disabled = false;
    } catch (err) {
    }
  });
}

if (authForm) {
  async function apiRegister(username, password) {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      // pydantic/fastapi may return validation errors as an array under detail
      if (errBody && Array.isArray(errBody.detail)) {
        const msgs = errBody.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
        throw new Error(msgs || 'Registration failed');
      }
      throw new Error(errBody.detail || 'Registration failed');
    }
    return res.json();
  }

  async function apiLogin(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (errBody && Array.isArray(errBody.detail)) {
        const msgs = errBody.detail.map(d => d.msg || JSON.stringify(d)).join('; ');
        throw new Error(msgs || 'Login failed');
      }
      throw new Error(errBody.detail || 'Login failed');
    }
    return res.json();
  }

  function checkAuthUsername() {
    const el = document.getElementById('username');
    if (!el) return;
    const errEl = document.getElementById('auth-username-error');
    if (!authUsernameRegex.test(el.value.trim())) {
      el.classList.add('invalid-input');
      if (errEl) errEl.textContent = '3–32 chars: letters, numbers, underscore';
    } else {
      el.classList.remove('invalid-input');
      if (errEl) errEl.textContent = '';
    }
  }

  function checkAuthPassword() {
    const el = document.getElementById('password');
    if (!el) return;
    const errEl = document.getElementById('auth-password-error');
    if (!authPasswordRegex.test(el.value)) {
      el.classList.add('invalid-input');
      if (errEl) errEl.textContent = 'Min 8 chars: letters, numbers, underscore';
    } else {
      el.classList.remove('invalid-input');
      if (errEl) errEl.textContent = '';
    }
  }

  const __userEl = document.getElementById('username');
  const __passEl = document.getElementById('password');
  if (__userEl) __userEl.addEventListener('input', checkAuthUsername);
  if (__passEl) __passEl.addEventListener('input', checkAuthPassword);
  const __sleepEl = document.getElementById('sleep-time');
  const __wakeEl = document.getElementById('wake-time');
  if (__sleepEl) __sleepEl.addEventListener('input', () => { if (__sleepEl.checkValidity()) __sleepEl.classList.remove('invalid-input'); });
  if (__wakeEl) __wakeEl.addEventListener('input', () => { if (__wakeEl.checkValidity()) __wakeEl.classList.remove('invalid-input'); });

  async function fetchMyDreamsFromServer() {
    if (__fetchMyDreamsPromise) return __fetchMyDreamsPromise;

    __fetchMyDreamsPromise = (async () => {
      const token = localStorage.getItem('son_token');
      if (!token) {
        __fetchMyDreamsPromise = null;
        return [];
      }
      const res = await fetch(`${API_BASE}/sleep/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        __fetchMyDreamsPromise = null;
        throw new Error('Failed to load dreams from server');
      }
      const data = await res.json();

      const mapped = data.map(e => ({
        id: e.id,
        createdAt: e.created_at ? new Date(e.created_at).getTime() : Date.now(),
        author: currentUser,
        isPublic: !!e.public,
        rawDate: e.date,
        year: (new Date(e.date)).getFullYear(),
        month: (new Date(e.date)).getMonth() + 1,
        day: (new Date(e.date)).getDate(),
        formattedDate: new Date(e.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        sleepTime: e.sleep_time,
        wakeTime: e.wake_time,
        duration: calculateDuration(e.sleep_time, e.wake_time),
        text: e.dream_text,
        tags: Array.isArray(e.tags) ? e.tags : (e.tags ? e.tags.split(',').map(t => t.trim()) : []),
        mood: e.mood,
        realism: e.realism
      }));

      dreams = dreams.filter(d => d.author !== currentUser).concat(mapped);
      saveDreamsToStorage();
      updateUI();
      __fetchMyDreamsPromise = null;
      return mapped;
    })();

    return __fetchMyDreamsPromise;
  }

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const userEl = document.getElementById('username');
    const passEl = document.getElementById('password');
    const usernameValid = authUsernameRegex.test(username);
    const passwordValid = authPasswordRegex.test(password);
    const userErrEl = document.getElementById('auth-username-error');
    const passErrEl = document.getElementById('auth-password-error');
    if (!usernameValid) {
      userEl && userEl.classList.add('invalid-input');
      if (userErrEl) userErrEl.textContent = '3–32 chars: letters, numbers, underscore';
    } else if (userErrEl) userErrEl.textContent = '';
    if (!passwordValid) {
      passEl && passEl.classList.add('invalid-input');
      if (passErrEl) passErrEl.textContent = 'Min 8 chars: letters, numbers, underscore';
    } else if (passErrEl) passErrEl.textContent = '';
    if (!usernameValid || !passwordValid) return;
    const authErrorEl = document.getElementById('auth-error');
    if (authErrorEl) authErrorEl.textContent = '';
    modalSubmitBtn.disabled = true;
    try {
      let token;
      if (isSignUpMode) {
        const regResp = await apiRegister(username, password);
        if (regResp && regResp.access_token) {
          token = regResp.access_token;
        }
      }
      if (!token) {
        const loginResp = await apiLogin(username, password);
        token = loginResp.access_token;
      }
      if (!token) throw new Error('No token received from server');
      localStorage.setItem('son_token', token);
      currentUser = username;
      localStorage.setItem('son_current_user', currentUser);
      isSignUpMode = false;
      toggleAuthMode.textContent = 'Sign Up';
      modalTitle.textContent = 'Sign In';
      modalSubmitBtn.textContent = 'Log In';
      await fetchMyDreamsFromServer();
      authModal.style.display = 'none';
      authForm.reset();
      const userErrEl2 = document.getElementById('auth-username-error');
      const passErrEl2 = document.getElementById('auth-password-error');
      if (userErrEl2) userErrEl2.textContent = '';
      if (passErrEl2) passErrEl2.textContent = '';
      updateAuthUI();
      updateUI();
    } catch (err) {
      const msg = err && err.message ? err.message : 'Auth error';
      if (authErrorEl) authErrorEl.textContent = msg;
      else alert(msg);
    } finally {
      modalSubmitBtn.disabled = false;
    }
  });
  window.fetchMyDreamsFromServer = fetchMyDreamsFromServer;
}

function calculateDuration(sleepTime, wakeTime) {
  const [sH, sM] = sleepTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  let start = sH * 60 + sM;
  let end = wH * 60 + wM;
  if (end <= start) end += 24 * 60;
  return ((end - start) / 60).toFixed(1);
}

function parseDateParts(dateStr) {
  let year, month, day;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(s => s.trim());
    month = Number(parts[0]);
    day = Number(parts[1]);
    year = Number(parts[2]);
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    const d = new Date(dateStr);
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  return { year, month, day, formattedDate };
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    const sleepEl = document.getElementById('sleep-time');
    const wakeEl = document.getElementById('wake-time');
    if (sleepEl && sleepEl.type === 'time' && !sleepEl.checkValidity()) {
      sleepEl.classList.add('invalid-input');
      return;
    }
    if (wakeEl && wakeEl.type === 'time' && !wakeEl.checkValidity()) {
      wakeEl.classList.add('invalid-input');
      return;
    }

    const dateStr = dreamDateInput.value;
    let serverDate = dateStr;
    if (dreamDateInput && dreamDateInput.type === 'date') {
      serverDate = dateStr; // browser provides yyyy-mm-dd
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split('/').map(s => s.trim());
      const mm = parts[0].padStart(2, '0');
      const dd = parts[1].padStart(2, '0');
      const yyyy = parts[2];
      serverDate = `${yyyy}-${mm}-${dd}`;
    } else if (!dateStr.includes('-')) {
      const _d = new Date(dateStr);
      const mm = String(_d.getMonth() + 1).padStart(2, '0');
      const dd = String(_d.getDate()).padStart(2, '0');
      const yyyy = _d.getFullYear();
      serverDate = `${yyyy}-${mm}-${dd}`;
    }
    const sleepTime = document.getElementById('sleep-time').value;
    const wakeTime = document.getElementById('wake-time').value;
    const text = dreamTextInput.value;
    const tagsInput = dreamTagsInput.value;
    const isPublic = dreamPublicInput.checked;
    const mood = parseInt(moodSlider.value);
    const realism = parseInt(realismSlider.value);

    const duration = calculateDuration(sleepTime, wakeTime);
    const tags = tagsInput 
      ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) 
      : [];

    const { year, month, day, formattedDate } = parseDateParts(serverDate);

    const dream = {
      id: Date.now(),
      createdAt: Date.now(),
      author: currentUser,
      isPublic,
      rawDate: serverDate,
      year,
      month,
      day,
      formattedDate,
      sleepTime,
      wakeTime,
      duration,
      text,
      tags,
      mood,
      realism
    };

    // if logged in, attempt to save on server
    const token = localStorage.getItem('son_token');
    if (token) {
      try {
        const resp = await fetch(`${API_BASE}/sleep/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            date: serverDate,
            sleep_time: sleepTime,
            wake_time: wakeTime,
            dream_text: text,
            tags: tags.join(','),
            mood,
            realism,
            public: isPublic
          })
        });
        if (resp.ok) {
          const json = await resp.json();
          if (json.id) dream.id = json.id;
          dream.createdAt = Date.now();
        } else {
          console.warn('Server rejected dream save', resp.status);
        }
      } catch (err) {
        console.warn('Failed to save dream to server', err);
      }
    }

    dreams.push(dream);
    saveDreamsToStorage();
    
    form.reset();
    const _nd = new Date();
    const _nm = String(_nd.getMonth() + 1).padStart(2, '0');
    const _nday = String(_nd.getDate()).padStart(2, '0');
    if (dreamDateInput.type === 'date') {
      dreamDateInput.value = new Date().toISOString().split('T')[0];
    } else {
      dreamDateInput.value = `${_nm}/${_nday}/${_nd.getFullYear()}`;
    }
    moodSlider.value = 0;
    realismSlider.value = 0;
    moodVal.textContent = "0";
    realismVal.textContent = "0";

    updateSliderBackground(moodSlider);
    updateSliderBackground(realismSlider);
    validateForm();

    currentPage = 1;
    updateUI();
  });
}

function openDreamDetails(id) {
  window.location.href = `dream.html?id=${id}`;
}

function toggleTagFilter(tag) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }
  currentPage = 1;
  renderTagFilters();
  renderDreamsList();
}

function renderTagFilters() {
  if (!tagsFilterContainer) return;
  const userDreams = dreams.filter(d => d.author === currentUser);
  const allTags = Array.from(new Set(userDreams.flatMap(d => d.tags)));

  selectedTags = new Set(Array.from(selectedTags).filter(t => allTags.includes(t)));

  if (allTags.length === 0) {
    tagsFilterContainer.innerHTML = '<span class="empty-filter-msg">No tags added yet</span>';
    return;
  }

  tagsFilterContainer.innerHTML = allTags.map(tag => {
    const activeClass = selectedTags.has(tag) ? 'active' : '';
    return `<button class="filter-chip ${activeClass}" onclick="toggleTagFilter('${tag}')">#${tag}</button>`;
  }).join('');
}

function updateYearFilterOptions() {
  if (!filterYearSelect) return;
  const userDreams = dreams.filter(d => d.author === currentUser);
  const years = Array.from(new Set(userDreams.map(d => d.year))).sort((a, b) => b - a);
  const currentVal = filterYearSelect.value;
  
  filterYearSelect.innerHTML = '<option value="">All Years</option>';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    filterYearSelect.appendChild(opt);
  });
  
  filterYearSelect.value = currentVal;
}

function updateUI() {
  updateYearFilterOptions();
  renderTagFilters();
  renderDreamsList();
  renderPublicDreamsList();
  updateAnalytics();
  updateCharts();
}

function renderDreamsList() {
  if (!dreamsList) return;
  const userDreams = dreams.filter(d => d.author === currentUser);

  if (userDreams.length === 0) {
    dreamsList.innerHTML = '<p class="empty-msg">No dreams logged yet. Fill out the form above!</p>';
    if (pageIndicator) pageIndicator.textContent = 'Page 0 of 0';
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;
    return;
  }

  const reqDay = filterDaySelect.value ? parseInt(filterDaySelect.value) : null;
  const reqMonth = filterMonthSelect.value ? parseInt(filterMonthSelect.value) : null;
  const reqYear = filterYearSelect.value ? parseInt(filterYearSelect.value) : null;

  let filteredDreams = userDreams.filter(d => {
    if (reqDay !== null && d.day !== reqDay) return false;
    if (reqMonth !== null && d.month !== reqMonth) return false;
    if (reqYear !== null && d.year !== reqYear) return false;
    if (selectedTags.size > 0 && !Array.from(selectedTags).every(t => d.tags.includes(t))) return false;
    return true;
  });

  filteredDreams.sort((a, b) => {
    const createdA = a.createdAt || a.id;
    const createdB = b.createdAt || b.id;
    if (currentSort === 'created-desc') return createdB - createdA;
    if (currentSort === 'created-asc') return createdA - createdB;
    if (currentSort === 'dream-desc') return b.rawDate.localeCompare(a.rawDate);
    if (currentSort === 'dream-asc') return a.rawDate.localeCompare(b.rawDate);
    return 0;
  });

  if (filteredDreams.length === 0) {
    dreamsList.innerHTML = '<p class="empty-msg">No dreams match the selected filters.</p>';
    if (pageIndicator) pageIndicator.textContent = 'Page 0 of 0';
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;
    return;
  }

  const totalPages = Math.ceil(filteredDreams.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDreams = filteredDreams.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  dreamsList.innerHTML = paginatedDreams.map(d => `
    <div class="dream-item" onclick="openDreamDetails(${d.id})">
      <div class="dream-header">
        <span class="dream-date">📅 ${d.formattedDate} (${d.sleepTime} - ${d.wakeTime}, ${d.duration}h) ${d.isPublic ? '<span class="public-badge">Public</span>' : ''}</span>
        <span class="dream-scores">Mood: <b>${d.mood}</b> | Realism: <b>${d.realism}</b></span>
      </div>
      <p class="dream-preview-text">${d.text}</p>
      ${d.tags.length ? `<div class="dream-tags">${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');

  if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

function renderPublicDreamsList() {
  if (!publicDreamsList) return;
  const publicDreams = dreams.filter(d => d.isPublic);

  if (publicDreams.length === 0) {
    publicDreamsList.innerHTML = '<p class="empty-msg">No public dreams shared yet.</p>';
    return;
  }

  publicDreamsList.innerHTML = publicDreams.map(d => `
    <div class="dream-item" onclick="openDreamDetails(${d.id})">
      <div class="dream-header">
        <span class="dream-date">📅 ${d.formattedDate}</span>
        <span class="dream-author">👤 ${d.author}</span>
      </div>
      <p class="dream-preview-text">${d.text}</p>
      ${d.tags.length ? `<div class="dream-tags">${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');
}

function updateAnalytics() {
  const userDreams = dreams.filter(d => d.author === currentUser);

  if (!userDreams.length) {
    document.getElementById('total-dreams').textContent = '0';
    document.getElementById('avg-duration').textContent = '0h';
    document.getElementById('avg-mood').textContent = '0';
    return;
  }

  const total = userDreams.length;
  const avgDur = (userDreams.reduce((acc, d) => acc + parseFloat(d.duration), 0) / total).toFixed(1);
  const avgM = (userDreams.reduce((acc, d) => acc + d.mood, 0) / total).toFixed(1);

  document.getElementById('total-dreams').textContent = total;
  document.getElementById('avg-duration').textContent = `${avgDur}h`;
  document.getElementById('avg-mood').textContent = avgM;
}

function updateCharts() {
  const userDreams = dreams.filter(d => d.author === currentUser);

  matrixChart.data.datasets = [{
    label: 'Dreams',
    data: userDreams.map(d => ({
      x: d.mood,
      y: d.realism,
      formattedDate: d.formattedDate,
      text: d.text
    })),
    backgroundColor: '#00ff87',
    borderColor: '#10b981',
    borderWidth: 2,
    pointRadius: 6,
    pointHoverRadius: 9
  }];
  matrixChart.update();

  const tagCounts = {};
  userDreams.flatMap(d => d.tags).forEach(t => {
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const fullTagNames = sortedTags.map(t => t[0]);
  const truncatedLabels = fullTagNames.map(t => t.length > 6 ? '#' + t.substring(0, 5) + '…' : '#' + t);

  tagsBarChart.data.labels = truncatedLabels;
  tagsBarChart.data.fullTags = fullTagNames;
  tagsBarChart.data.datasets = [{
    data: sortedTags.map(t => t[1]),
    backgroundColor: '#00ff87',
    borderRadius: 4
  }];
  tagsBarChart.update();

  const last10Dreams = [...userDreams]
    .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    .slice(-10);

  const labels = last10Dreams.map(d => d.formattedDate);

  moodTimelineChart.data.labels = labels;
  moodTimelineChart.data.datasets = [{
    data: last10Dreams.map(d => d.mood),
    borderColor: '#00ff87',
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    fill: true,
    tension: 0.3
  }];
  moodTimelineChart.update();

  realismTimelineChart.data.labels = labels;
  realismTimelineChart.data.datasets = [{
    data: last10Dreams.map(d => d.realism),
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    fill: true,
    tension: 0.3
  }];
  realismTimelineChart.update();
}

window.onload = () => {
  if (document.getElementById('matrix-chart')) {
    initCharts();
    updateAuthUI();
    const token = localStorage.getItem('son_token');
    if (token && currentUser && currentUser !== 'Anonymous' && window.fetchMyDreamsFromServer) {
      window.fetchMyDreamsFromServer().catch(err => console.warn('Failed to fetch server dreams:', err));
    } else {
      updateUI();
    }

    if (moodSlider) {
      moodSlider.value = 0;
      realismSlider.value = 0;
      moodVal.textContent = "0";
      realismVal.textContent = "0";

      updateSliderBackground(moodSlider);
      updateSliderBackground(realismSlider);
      validateForm();
    }
  }
};