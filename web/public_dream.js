const API_BASE = 'http://localhost:8000';
let dreams = JSON.parse(localStorage.getItem('son_dreams') || '[]');
let currentUser = localStorage.getItem('son_current_user') || 'Anonymous';

const container = document.getElementById('public-dream-container');

function calculateDuration(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return '0';
  const [sH, sM] = sleepTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  let start = sH * 60 + sM;
  let end = wH * 60 + wM;
  if (end <= start) end += 24 * 60;
  return ((end - start) / 60).toFixed(1);
}

function renderEntry(e) {
  if (!container) return;
  container.innerHTML = `
    <div class="card">
      <div class="dream-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; margin-bottom: 12px; display:flex; justify-content: space-between; align-items:center;">
        <div>
          <span class="dream-author" style="font-weight:700; color:var(--accent-green);">👤 ${e.author || 'Anonymous'}</span>
          <span class="dream-date" style="margin-left:8px; color:var(--text-muted)">📅 ${e.formattedDate}</span>
        </div>
        <span class="dream-scores">Mood: <b>${e.mood}</b> | Realism: <b>${e.realism}</b></span>
      </div>

      <div class="public-dream-text">
        ${e.dream_text}
      </div>

      ${e.tags && e.tags.length ? `<div class="dream-tags" style="margin-top: 12px;">${e.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}

      <div style="margin-top:12px; color:var(--text-muted)">Duration: ${calculateDuration(e.sleep_time, e.wake_time)}h</div>
    </div>
  `;
}

async function fetchPublicEntry(id) {
  try {
    const res = await fetch(`${API_BASE}/sleep/public/${id}`);
    if (!res.ok) {
      container.innerHTML = '<p class="empty-msg">Entry not found or not public.</p>';
      return;
    }
    const data = await res.json();
    const mapped = {
      id: data.id,
      date: data.date,
      formattedDate: new Date(data.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      sleep_time: data.sleep_time,
      wake_time: data.wake_time,
      dream_text: data.dream_text,
      tags: data.tags ? (Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean)) : [],
      mood: data.mood,
      realism: data.realism,
      author: data.author
    };
    renderEntry(mapped);
  } catch (err) {
    container.innerHTML = '<p class="empty-msg">Error loading entry.</p>';
    console.warn(err);
  }
}

window.onload = () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const pageFromUrl = params.get('page');

  const savedPage = pageFromUrl || sessionStorage.getItem('lastPublicFeedPage');
  const backBtn = document.getElementById('backToFeedBtn');
  
  if (backBtn && savedPage) {
    backBtn.href = `all.html?page=${savedPage}`;
  }

  if (!id) {
    if (container) container.innerHTML = '<p class="empty-msg">No entry specified.</p>';
    return;
  }
  fetchPublicEntry(id);
};