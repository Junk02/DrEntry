let currentUser = localStorage.getItem('son_current_user') || 'Anonymous';
let dreams = JSON.parse(localStorage.getItem('son_dreams') || '[]');
const API_BASE = 'http://localhost:8000';
let publicDreams = [];

function calculateDuration(sleepTime, wakeTime) {
  if (!sleepTime || !wakeTime) return '0';
  const [sH, sM] = sleepTime.split(':').map(Number);
  const [wH, wM] = wakeTime.split(':').map(Number);
  let start = sH * 60 + sM;
  let end = wH * 60 + wM;
  if (end <= start) end += 24 * 60;
  return ((end - start) / 60).toFixed(1);
}

const userDisplay = document.getElementById('user-display');
const publicDreamsList = document.getElementById('public-dreams-list');
const sortSelect = document.getElementById('sort-select');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');

let currentPage = 1;
const ITEMS_PER_PAGE = 4;
let currentSort = 'dream-desc';

if (userDisplay && currentUser !== 'Anonymous') {
  userDisplay.textContent = `👤 ${currentUser}`;
}

if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderPublicDreams();
  });
}

if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPublicDreams();
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    currentPage++;
    renderPublicDreams();
  });
}

function openPublicDreamDetails(id) {
  window.location.href = `public_dream.html?id=${id}`;
}

function renderPublicDreams() {
  if (!publicDreamsList) return;
  const source = publicDreams.length ? publicDreams : dreams.filter(d => d.isPublic);

  // use 'source' as the array to render
  const publicList = source;
  if (publicList.length === 0) {
    publicDreamsList.innerHTML = '<p class="empty-msg">No public dreams shared yet.</p>';
    if (pageIndicator) pageIndicator.textContent = 'Page 0 of 0';
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;
    return;
  }

  publicList.sort((a, b) => {
    const createdA = a.createdAt || a.id;
    const createdB = b.createdAt || b.id;
    if (currentSort === 'dream-desc') return b.rawDate.localeCompare(a.rawDate);
    if (currentSort === 'dream-asc') return a.rawDate.localeCompare(b.rawDate);
    if (currentSort === 'mood-desc') return (Number(b.mood) || 0) - (Number(a.mood) || 0);
    if (currentSort === 'mood-asc') return (Number(a.mood) || 0) - (Number(b.mood) || 0);
    if (currentSort === 'realism-desc') return (Number(b.realism) || 0) - (Number(a.realism) || 0);
    if (currentSort === 'realism-asc') return (Number(a.realism) || 0) - (Number(b.realism) || 0);
    return 0;
  });

  const totalPages = Math.ceil(publicList.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedDreams = publicList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  publicDreamsList.innerHTML = paginatedDreams.map(d => {
    const isOwner = d.author === currentUser;
    const shortText = (d.text || '').length > 50 ? (d.text.substring(0, 50) + '...') : d.text;
    return `
      <div class="card dream-expanded-item" style="margin-bottom: 16px; background: #050806; cursor: pointer;" onclick="openPublicDreamDetails(${d.id})">
        <div class="dream-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span class="dream-author" style="font-weight: 700; color: var(--accent-color); margin-right: 8px;">👤 ${d.author || 'Anonymous'}</span>
            <span class="dream-date" style="font-size: 0.85rem; color: var(--text-muted);">📅 ${d.formattedDate}</span>
          </div>
          <span class="dream-scores" style="font-size: 0.85rem;">Mood: <b>${d.mood}</b> | Realism: <b>${d.realism}</b></span>
        </div>

        <p class="dream-preview-text" style="margin: 12px 0; font-size: 1rem; line-height: 1.6;">${shortText}</p>

        ${d.tags && d.tags.length ? `
          <div class="dream-tags" style="margin-top: 12px; margin-bottom: 12px;">
            ${d.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
          </div>
        ` : ''}

        ${isOwner ? `
          <div style="margin-top: 12px; text-align: right;">
            <button class="btn btn-outline" style="width: auto; padding: 6px 12px; font-size: 0.85rem;" onclick="window.location.href='dream.html?id=${d.id}'">Edit My Dream</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (pageIndicator) pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
}

async function fetchPublicFromServer() {
  try {
    const res = await fetch(`${API_BASE}/sleep/public`);
    if (!res.ok) {
      console.warn('Failed to fetch public dreams', res.status);
      return [];
    }
    const data = await res.json();
    // map to frontend shape
    publicDreams = data.map(e => ({
      id: e.id,
      rawDate: e.date,
      formattedDate: new Date(e.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      sleepTime: e.sleep_time,
      wakeTime: e.wake_time,
      duration: (e.sleep_time && e.wake_time) ? calculateDuration(e.sleep_time, e.wake_time) : '0',
      text: e.dream_text,
      tags: e.tags ? (Array.isArray(e.tags) ? e.tags : e.tags.split(',').map(t => t.trim()).filter(Boolean)) : [],
      mood: e.mood,
      realism: e.realism,
      author: e.author,
      createdAt: e.created_at ? new Date(e.created_at).getTime() : null,
      isPublic: true
    }));
    renderPublicDreams();
    return publicDreams;
  } catch (err) {
    console.warn('Error fetching public dreams', err);
    return [];
  }
}

window.onload = () => {
  fetchPublicFromServer().catch(() => {});
};