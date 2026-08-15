let currentUser = localStorage.getItem('son_current_user') || null;
let dreams = [];
let isSignUpMode = false;
let selectedTags = new Set();

const form = document.getElementById('dream-form');
const dreamDateInput = document.getElementById('dream-date');
const moodSlider = document.getElementById('mood-score');
const realismSlider = document.getElementById('realism-score');
const moodVal = document.getElementById('mood-val');
const realismVal = document.getElementById('realism-val');
const dreamsList = document.getElementById('dreams-list');
const tagsFilterContainer = document.getElementById('tags-filter-container');
const authBtn = document.getElementById('auth-btn');
const userDisplay = document.getElementById('user-display');

const filterDaySelect = document.getElementById('filter-day');
const filterMonthSelect = document.getElementById('filter-month');
const filterYearSelect = document.getElementById('filter-year');

dreamDateInput.value = new Date().toISOString().split('T')[0];

const authModal = document.getElementById('auth-modal');
const modalClose = document.getElementById('modal-close');
const authForm = document.getElementById('auth-form');
const modalTitle = document.getElementById('modal-title');
const modalSubmitBtn = document.getElementById('modal-submit-btn');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const authSwitchText = document.getElementById('auth-switch-text');

let matrixChart;
let moodTimelineChart;

for (let d = 1; d <= 31; d++) {
  const opt = document.createElement('option');
  opt.value = d;
  opt.textContent = d;
  filterDaySelect.appendChild(opt);
}

[filterDaySelect, filterMonthSelect, filterYearSelect].forEach(select => {
  select.addEventListener('change', () => {
    renderDreamsList();
  });
});

moodSlider.addEventListener('input', (e) => moodVal.textContent = e.target.value);
realismSlider.addEventListener('input', (e) => realismVal.textContent = e.target.value);

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
      maintainAspectRatio: false,
      scales: {
        x: {
          min: -10,
          max: 10,
          title: { display: true, text: '◄ Negative (-10) | Positive (+10) ►', color: '#00ff87' },
          grid: { 
            color: (ctx) => ctx.tick.value === 0 ? 'transparent' : '#1b2e1e' 
          }
        },
        y: {
          min: -10,
          max: 10,
          title: { display: true, text: '◄ Fantasy (-10) | Realistic (+10) ►', color: '#00ff87' },
          grid: { 
            color: (ctx) => ctx.tick.value === 0 ? 'transparent' : '#1b2e1e' 
          }
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

  const ctxMood = document.getElementById('mood-timeline-chart').getContext('2d');
  moodTimelineChart = new Chart(ctxMood, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { min: -10, max: 10, grid: { color: '#1b2e1e' } }
      }
    }
  });
}

function updateAuthUI() {
  if (currentUser) {
    userDisplay.textContent = `👤 ${currentUser}`;
    authBtn.textContent = 'Log Out';
  } else {
    userDisplay.textContent = '';
    authBtn.textContent = 'Log In / Sign Up';
  }
}

authBtn.addEventListener('click', () => {
  if (currentUser) {
    currentUser = null;
    localStorage.removeItem('son_current_user');
    updateAuthUI();
  } else {
    authModal.style.display = 'flex';
  }
});

modalClose.addEventListener('click', () => authModal.style.display = 'none');

toggleAuthMode.addEventListener('click', (e) => {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  modalTitle.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
  modalSubmitBtn.textContent = isSignUpMode ? 'Create Account' : 'Log In';
  authSwitchText.textContent = isSignUpMode ? 'Already have an account?' : "Don't have an account?";
  toggleAuthMode.textContent = isSignUpMode ? 'Log In' : 'Sign Up';
});

authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  if (!username) return;

  currentUser = username;
  localStorage.setItem('son_current_user', currentUser);
  
  authModal.style.display = 'none';
  authForm.reset();
  updateAuthUI();
});

function calculateDuration(sleepTime, wakeTime) {
  const [sH, sM] = sleepTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  let start = sH * 60 + sM;
  let end = wH * 60 + wM;
  if (end <= start) end += 24 * 60;
  return ((end - start) / 60).toFixed(1);
}

function parseDateParts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  return { year, month, day, formattedDate };
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const dateStr = dreamDateInput.value;
  const sleepTime = document.getElementById('sleep-time').value;
  const wakeTime = document.getElementById('wake-time').value;
  const text = document.getElementById('dream-text').value;
  const tagsInput = document.getElementById('dream-tags').value;
  const mood = parseInt(moodSlider.value);
  const realism = parseInt(realismSlider.value);

  const duration = calculateDuration(sleepTime, wakeTime);
  const tags = tagsInput 
    ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) 
    : [];

  const { year, month, day, formattedDate } = parseDateParts(dateStr);

  const dream = {
    id: Date.now(),
    rawDate: dateStr,
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

  dreams.push(dream);
  
  form.reset();
  dreamDateInput.value = new Date().toISOString().split('T')[0];
  moodVal.textContent = "0";
  realismVal.textContent = "0";

  updateUI();
});

function deleteDream(id) {
  dreams = dreams.filter(d => d.id !== id);
  updateUI();
}

function toggleTagFilter(tag) {
  if (selectedTags.has(tag)) {
    selectedTags.delete(tag);
  } else {
    selectedTags.add(tag);
  }
  renderTagFilters();
  renderDreamsList();
}

function renderTagFilters() {
  const allTags = Array.from(new Set(dreams.flatMap(d => d.tags)));

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
  const years = Array.from(new Set(dreams.map(d => d.year))).sort((a, b) => b - a);
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
  updateAnalytics();
  updateCharts();
}

function renderDreamsList() {
  if (dreams.length === 0) {
    dreamsList.innerHTML = '<p class="empty-msg">No dreams logged yet. Fill out the form above!</p>';
    return;
  }

  const reqDay = filterDaySelect.value ? parseInt(filterDaySelect.value) : null;
  const reqMonth = filterMonthSelect.value ? parseInt(filterMonthSelect.value) : null;
  const reqYear = filterYearSelect.value ? parseInt(filterYearSelect.value) : null;

  const filteredDreams = dreams.filter(d => {
    if (reqDay !== null && d.day !== reqDay) return false;
    if (reqMonth !== null && d.month !== reqMonth) return false;
    if (reqYear !== null && d.year !== reqYear) return false;
    if (selectedTags.size > 0 && !Array.from(selectedTags).every(t => d.tags.includes(t))) return false;
    return true;
  });

  if (filteredDreams.length === 0) {
    dreamsList.innerHTML = '<p class="empty-msg">No dreams match the selected filters.</p>';
    return;
  }

  dreamsList.innerHTML = filteredDreams.map(d => `
    <div class="dream-item">
      <button class="delete-btn" onclick="deleteDream(${d.id})" title="Delete">&times;</button>
      <div class="dream-header">
        <span class="dream-date">📅 ${d.formattedDate} (${d.sleepTime} - ${d.wakeTime}, ${d.duration}h)</span>
        <span class="dream-scores">Mood: <b>${d.mood}</b> | Realism: <b>${d.realism}</b></span>
      </div>
      <p>${d.text}</p>
      ${d.tags.length ? `<div class="dream-tags">${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    </div>
  `).join('');
}

function updateAnalytics() {
  if (!dreams.length) {
    document.getElementById('total-dreams').textContent = '0';
    document.getElementById('avg-duration').textContent = '0h';
    document.getElementById('avg-mood').textContent = '0';
    return;
  }

  const total = dreams.length;
  const avgDur = (dreams.reduce((acc, d) => acc + parseFloat(d.duration), 0) / total).toFixed(1);
  const avgM = (dreams.reduce((acc, d) => acc + d.mood, 0) / total).toFixed(1);

  document.getElementById('total-dreams').textContent = total;
  document.getElementById('avg-duration').textContent = `${avgDur}h`;
  document.getElementById('avg-mood').textContent = avgM;
}

function updateCharts() {
  matrixChart.data.datasets = [{
    label: 'Dreams',
    data: dreams.map(d => ({
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

  const sortedDreams = [...dreams].sort((a, b) => a.rawDate.localeCompare(b.rawDate));

  moodTimelineChart.data.labels = sortedDreams.map(d => d.formattedDate);
  moodTimelineChart.data.datasets = [{
    data: sortedDreams.map(d => d.mood),
    borderColor: '#00ff87',
    backgroundColor: 'rgba(0, 255, 135, 0.15)',
    fill: true,
    tension: 0.3
  }];
  moodTimelineChart.update();
}

window.onload = () => {
  initCharts();
  updateAuthUI();
  updateUI();
};