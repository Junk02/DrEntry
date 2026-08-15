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
    <div class="dream-header" style="margin-bottom: 20px;">
      <span class="dream-date" style="font-size: 1rem;">📅 ${dream.formattedDate} (${dream.sleepTime} - ${dream.wakeTime}, ${dream.duration}h)</span>
      <span class="dream-author" style="font-size: 1rem;">Author: ${dream.author}</span>
    </div>

    ${isOwner ? `
      <div class="form-group">
        <label>Edit Dream Description</label>
        <textarea id="edit-dream-text" rows="6">${dream.text}</textarea>
        <div id="edit-text-error" class="error-msg"></div>
      </div>
      <div class="form-group">
        <label>Edit Tags (comma separated)</label>
        <input type="text" id="edit-dream-tags" value="${dream.tags ? dream.tags.join(', ') : ''}">
        <div id="edit-tags-error" class="error-msg"></div>
      </div>
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" id="edit-dream-public" ${dream.isPublic ? 'checked' : ''}>
          <span>Make this dream public</span>
        </label>
      </div>
      <div class="details-actions">
        <button id="save-edit-btn" class="btn btn-primary">Save Changes</button>
        <button id="delete-btn" class="btn btn-danger">Delete Dream</button>
      </div>
    ` : `
      <p class="dream-full-text" style="white-space: pre-wrap; margin: 16px 0; font-size: 1.05rem; line-height: 1.6;">${dream.text}</p>
      ${dream.tags && dream.tags.length ? `<div class="dream-tags" style="margin-top: 16px;">${dream.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>` : ''}
    `}
  `;

  if (isOwner) {
    const editText = document.getElementById('edit-dream-text');
    const editTags = document.getElementById('edit-dream-tags');
    const editPublic = document.getElementById('edit-dream-public');
    const textErr = document.getElementById('edit-text-error');
    const tagsErr = document.getElementById('edit-tags-error');
    const saveBtn = document.getElementById('save-edit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    const validate = () => validateEditForm(editText, textErr, editTags, tagsErr, saveBtn);

    editText.addEventListener('input', validate);
    editTags.addEventListener('input', validate);

    saveBtn.addEventListener('click', () => {
      if (!validate()) return;

      dream.text = editText.value;
      dream.tags = editTags.value ? editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0) : [];
      dream.isPublic = editPublic.checked;

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