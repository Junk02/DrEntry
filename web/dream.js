let currentUser = localStorage.getItem('son_current_user') || 'Anonymous';
let dreams = JSON.parse(localStorage.getItem('son_dreams') || '[]');

const userDisplay = document.getElementById('user-display');
const detailsContainer = document.getElementById('details-container');

if (userDisplay && currentUser !== 'Anonymous') {
  userDisplay.textContent = `👤 ${currentUser}`;
}

const urlParams = new URLSearchParams(window.location.search);
const dreamId = parseInt(urlParams.get('id'));

const textRegex = /^[a-zA-Z0-9\s,():\-—!?]*$/;
const tagsRegex = /^[a-zA-Z\s,]*$/;

function saveDreamsToStorage() {
  localStorage.setItem('son_dreams', JSON.stringify(dreams));
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
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedDate = dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  return { year, month, day, formattedDate };
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

function validateEditForm(textInput, textError, tagsInput, tagsError, saveBtn) {
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

  saveBtn.disabled = !isValid;
  return isValid;
}

function renderDreamDetails() {
  if (!detailsContainer) return;

  const dream = dreams.find(d => d.id === dreamId);

  if (!dream) {
    detailsContainer.innerHTML = '<p class="empty-msg">Dream not found.</p>';
    return;
  }

  const isOwner = dream.author === currentUser;

  detailsContainer.innerHTML = `
    ${isOwner ? `
      <h2>Edit Dream</h2>
      <div class="form-row form-row-3">
        <div class="form-group">
          <label for="edit-dream-date">Date</label>
          <input type="date" id="edit-dream-date" value="${dream.rawDate}" required>
        </div>
        <div class="form-group">
          <label for="edit-sleep-time">Bedtime</label>
          <input type="time" id="edit-sleep-time" value="${dream.sleepTime}" required>
        </div>
        <div class="form-group">
          <label for="edit-wake-time">Wake up time</label>
          <input type="time" id="edit-wake-time" value="${dream.wakeTime}" required>
        </div>
      </div>

      <div class="form-group">
        <label for="edit-dream-text">Dream Description</label>
        <textarea id="edit-dream-text" rows="6">${dream.text}</textarea>
        <div id="edit-text-error" class="error-msg"></div>
      </div>

      <div class="form-group">
        <label for="edit-dream-tags">Edit Tags (comma separated)</label>
        <input type="text" id="edit-dream-tags" value="${dream.tags ? dream.tags.join(', ') : ''}">
        <div id="edit-tags-error" class="error-msg"></div>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="edit-dream-public" ${dream.isPublic ? 'checked' : ''}>
          <span>Make this dream public</span>
        </label>
      </div>

      <div class="sliders-grid">
        <div class="form-group">
          <div class="slider-label">
            <span>Mood</span>
            <span id="edit-mood-val" class="badge">${dream.mood ?? 0}</span>
          </div>
          <div class="range-hint"><span>-10 (Terrible)</span><span>+10 (Wonderful)</span></div>
          <input type="range" id="edit-mood-score" min="-10" max="10" value="${dream.mood ?? 0}">
        </div>

        <div class="form-group">
          <div class="slider-label">
            <span>Realism</span>
            <span id="edit-realism-val" class="badge">${dream.realism ?? 0}</span>
          </div>
          <div class="range-hint"><span>-10 (Fantasy)</span><span>+10 (Reality)</span></div>
          <input type="range" id="edit-realism-score" min="-10" max="10" value="${dream.realism ?? 0}">
        </div>
      </div>

      <div class="details-actions">
        <button id="save-edit-btn" class="btn btn-primary">Save Changes</button>
        <button id="delete-btn" class="btn btn-danger">Delete Dream</button>
      </div>
    ` : `
      <div class="dream-header" style="border-bottom: 1px solid var(--panel-border); padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="dream-author" style="font-weight: 700; color: var(--accent-green); margin-right: 8px;">👤 ${dream.author || 'Anonymous'}</span>
          <span class="dream-date" style="font-size: 0.9rem; color: var(--text-muted);">📅 ${dream.formattedDate} (${dream.sleepTime} - ${dream.wakeTime}, ${dream.duration}h)</span>
        </div>
        <span class="dream-scores" style="font-size: 0.9rem;">Mood: <b>${dream.mood}</b> | Realism: <b>${dream.realism}</b></span>
      </div>
      <p class="dream-full-text" style="white-space: pre-wrap; margin: 16px 0; font-size: 1.05rem; line-height: 1.6;">${dream.text}</p>
      ${dream.tags && dream.tags.length ? `<div class="dream-tags" style="margin-top: 16px;">${dream.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    `}
  `;

  if (isOwner) {
    const editDate = document.getElementById('edit-dream-date');
    const editSleep = document.getElementById('edit-sleep-time');
    const editWake = document.getElementById('edit-wake-time');
    const editText = document.getElementById('edit-dream-text');
    const editTags = document.getElementById('edit-dream-tags');
    const editPublic = document.getElementById('edit-dream-public');
    const editMood = document.getElementById('edit-mood-score');
    const editRealism = document.getElementById('edit-realism-score');
    const editMoodVal = document.getElementById('edit-mood-val');
    const editRealismVal = document.getElementById('edit-realism-val');

    const textErr = document.getElementById('edit-text-error');
    const tagsErr = document.getElementById('edit-tags-error');
    const saveBtn = document.getElementById('save-edit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    updateSliderBackground(editMood);
    updateSliderBackground(editRealism);

    editMood.addEventListener('input', (e) => {
      editMoodVal.textContent = e.target.value;
      updateSliderBackground(e.target);
    });

    editRealism.addEventListener('input', (e) => {
      editRealismVal.textContent = e.target.value;
      updateSliderBackground(e.target);
    });

    const validate = () => validateEditForm(editText, textErr, editTags, tagsErr, saveBtn);

    editText.addEventListener('input', validate);
    editTags.addEventListener('input', validate);

    saveBtn.addEventListener('click', () => {
      if (!validate()) return;

      const dateStr = editDate.value;
      const sleepTime = editSleep.value;
      const wakeTime = editWake.value;
      const { year, month, day, formattedDate } = parseDateParts(dateStr);

      dream.rawDate = dateStr;
      dream.year = year;
      dream.month = month;
      dream.day = day;
      dream.formattedDate = formattedDate;
      dream.sleepTime = sleepTime;
      dream.wakeTime = wakeTime;
      dream.duration = calculateDuration(sleepTime, wakeTime);

      dream.text = editText.value;
      dream.tags = editTags.value ? editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
      dream.isPublic = editPublic.checked;
      dream.mood = parseInt(editMood.value);
      dream.realism = parseInt(editRealism.value);

      saveDreamsToStorage();
      window.location.href = 'index.html';
    });

    deleteBtn.addEventListener('click', () => {
      dreams = dreams.filter(d => d.id !== dreamId);
      saveDreamsToStorage();
      window.location.href = 'index.html';
    });
  }
}

window.onload = renderDreamDetails;