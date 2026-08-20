// profile.js — Portfolio Profile Page Logic

let currentUser = null;
let userRef = null;
let isOwner = false;
let targetUid = null;

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewUserId = urlParams.get('id');

  firebase.auth().onAuthStateChanged(user => {
    if (user) currentUser = user;

    targetUid = viewUserId || (user ? user.uid : null);

    if (!targetUid) {
      if (sessionStorage.getItem('guestMode') === 'true') {
        showGuestState();
      } else {
        // Not guest, not logged in, no ID -> go to auth
        window.location.href = 'auth.html';
      }
      return;
    }

    isOwner = (user && user.uid === targetUid);
    userRef = firebase.database().ref('users/' + targetUid);

    // Hide owner-only elements if not owner
    if (!isOwner) {
      document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
      const orderSec = document.querySelector('.orders-section');
      if (orderSec) orderSec.style.display = 'none';
      const avatarHint = document.querySelector('.avatar-upload-hint');
      if (avatarHint) avatarHint.style.display = 'none';
      document.getElementById('profileAvatar').style.cursor = 'default';
    }

    loadProfileData();
    loadProjects();
    if (isOwner) loadOrders(targetUid);
  });
});

// ===================== PROFILE =====================

function loadProfileData() {
  userRef.once('value').then(snapshot => {
    if (!snapshot.exists()) {
      setText('profileName', 'User Not Found');
      setText('profileUsername', '');
      setText('profileBio', 'This user does not exist or has no data.');
      return;
    }
    const d = snapshot.val();

    setText('profileName', d.name || 'Space Learner');
    setText('profileUsername', '@' + (d.username || 'user'));
    setText('profileBio', d.bio || 'No bio yet.');
    setText('statProjects', Object.keys(d.projects || {}).length);
    setText('statXP', d.xp || 0);
    setText('statLevel', d.level || 1);

    // Avatar
    const av = document.getElementById('profileAvatar');
    if (d.photoURL) {
      av.style.backgroundImage = `url('${d.photoURL}')`;
      av.textContent = '';
    } else {
      av.style.backgroundImage = 'none';
      av.textContent = '👤';
    }

    // Social links
    const socialsEl = document.getElementById('profileSocials');
    socialsEl.innerHTML = '';
    const social = d.social || {};
    if (social.github) socialsEl.innerHTML += `<a href="${esc(social.github)}" target="_blank">🔗 GitHub</a>`;
    if (social.instagram) socialsEl.innerHTML += `<a href="${esc(social.instagram)}" target="_blank">📸 Instagram</a>`;
    if (social.website) socialsEl.innerHTML += `<a href="${esc(social.website)}" target="_blank">🌐 Website</a>`;

    // Prefill edit form (only matters if owner)
    if (isOwner) {
      document.getElementById('editName').value = d.name || '';
      document.getElementById('editUsername').value = d.username || '';
      document.getElementById('editBio').value = d.bio || '';
      document.getElementById('editGithub').value = (d.social && d.social.github) || '';
      document.getElementById('editInstagram').value = (d.social && d.social.instagram) || '';
      document.getElementById('editWebsite').value = (d.social && d.social.website) || '';
    }
  });
}

function saveProfile() {
  if (!isOwner || !currentUser) return;
  const name = document.getElementById('editName').value.trim();
  let username = document.getElementById('editUsername').value.trim().replace(/^@/, '');
  const bio = document.getElementById('editBio').value.trim();
  const github = document.getElementById('editGithub').value.trim();
  const instagram = document.getElementById('editInstagram').value.trim();
  const website = document.getElementById('editWebsite').value.trim();

  if (!name || !username) {
    if (window.showToast) showToast('Name and username are required', 'error');
    return;
  }

  const btn = document.getElementById('saveProfileBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  userRef.update({
    name,
    username,
    bio,
    social: { github, instagram, website }
  }).then(() => {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
    closeModal('editProfileModal');
    loadProfileData();
    if (window.showToast) showToast('Profile updated! ✅', 'success');
  }).catch(err => {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
    console.error(err);
    if (window.showToast) showToast('Error saving profile', 'error');
  });
}

// ===================== AVATAR =====================

function triggerAvatarUpload() {
  if (!isOwner) return;
  document.getElementById('avatarInput').click();
}

function handleAvatarUpload(event) {
  if (!isOwner) return;
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please select an image', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }

  showToast('Processing image... ⏳', 'info');
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const MAX = 250;
      if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
      else { if (h > MAX) { w *= MAX / h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      userRef.update({ photoURL: dataUrl }).then(() => {
        currentUser.updateProfile({ photoURL: dataUrl });
        const av = document.getElementById('profileAvatar');
        av.style.backgroundImage = `url('${dataUrl}')`;
        av.textContent = '';
        showToast('Avatar updated! 📷', 'success');
      }).catch(() => showToast('Failed to save avatar', 'error'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ===================== PROJECTS =====================

function loadProjects() {
  userRef.child('projects').once('value').then(snap => {
    const grid = document.getElementById('projectsGrid');
    grid.innerHTML = '';

    if (!snap.exists() || Object.keys(snap.val()).length === 0) {
      if (isOwner) {
        grid.innerHTML = `
          <div class="add-project-card" onclick="openProjectModal()">
            <div class="add-icon">+</div>
            <span>Add your first project</span>
          </div>
        `;
      } else {
        grid.innerHTML = `<div class="empty-projects"><div class="empty-icon">📭</div><p>This user hasn't added any projects yet.</p></div>`;
      }
      setText('statProjects', 0);
      return;
    }

    const projects = snap.val();
    const keys = Object.keys(projects).sort((a, b) => (projects[b].createdAt || 0) - (projects[a].createdAt || 0));
    setText('statProjects', keys.length);

    keys.forEach(key => {
      const p = projects[key];
      grid.innerHTML += buildProjectCard(key, p);
    });

    if (isOwner) {
      grid.innerHTML += `
        <div class="add-project-card" onclick="openProjectModal()">
          <div class="add-icon">+</div>
          <span>Add new project</span>
        </div>
      `;
    }
  });
}

function buildProjectCard(key, p) {
  const tags = (p.tags || []).map(t => `<span class="project-tag">${esc(t)}</span>`).join('');
  const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';
  const cover = p.image
    ? `<img class="project-cover" src="${esc(p.image)}" alt="${esc(p.title)}" onerror="this.outerHTML='<div class=\\'project-cover-placeholder\\'>🚀</div>'">`
    : `<div class="project-cover-placeholder">🚀</div>`;

  const actions = isOwner ? `
    <div class="project-actions">
      <button onclick="editProject('${key}')" title="Edit">✏️</button>
      <button class="delete-btn" onclick="deleteProject('${key}')" title="Delete">🗑️</button>
    </div>
  ` : '';

  return `
    <div class="card project-card">
      ${cover}
      <div class="project-body">
        <h3 class="project-title">${esc(p.title || 'Untitled')}</h3>
        <p class="project-desc">${esc(p.description || '')}</p>
        <div class="project-tags">${tags}</div>
        <div class="project-meta">
          <span class="project-date">${date}</span>
          ${actions}
        </div>
      </div>
    </div>
  `;
}

let editingProjectKey = null;
let projectImageData = '';

function openProjectModal(prefill) {
  if (!isOwner) return;
  editingProjectKey = prefill ? prefill.key : null;
  document.getElementById('projectModalTitle').textContent = editingProjectKey ? 'Edit Project' : 'Add Project';
  document.getElementById('projTitle').value = prefill ? prefill.title : '';
  document.getElementById('projDesc').value = prefill ? prefill.description : '';
  document.getElementById('projTags').value = prefill ? (prefill.tags || []).join(', ') : '';
  document.getElementById('projImageUrl').value = prefill ? (prefill.image || '') : '';
  projectImageData = '';

  const area = document.getElementById('projImagePreview');
  if (prefill && prefill.image) {
    area.style.backgroundImage = `url('${prefill.image}')`;
    area.classList.add('has-image');
  } else {
    area.style.backgroundImage = '';
    area.classList.remove('has-image');
  }

  openModal('projectModal');
}

function handleProjectImage(event) {
  if (!isOwner) return;
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Select an image file', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { showToast('Image must be under 5MB', 'error'); return; }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      const MAX_W = 600, MAX_H = 400;
      const ratio = Math.min(MAX_W / w, MAX_H / h, 1);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      projectImageData = canvas.toDataURL('image/jpeg', 0.75);

      const area = document.getElementById('projImagePreview');
      area.style.backgroundImage = `url('${projectImageData}')`;
      area.classList.add('has-image');
      document.getElementById('projImageUrl').value = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveProject() {
  if (!isOwner || !currentUser) return;
  const title = document.getElementById('projTitle').value.trim();
  const description = document.getElementById('projDesc').value.trim();
  const tagsRaw = document.getElementById('projTags').value.trim();
  const imageUrl = document.getElementById('projImageUrl').value.trim();
  const image = projectImageData || imageUrl || '';
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  if (!title) { showToast('Project title is required', 'error'); return; }

  const btn = document.getElementById('saveProjectBtn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const data = { title, description, image, tags, createdAt: Date.now() };

  let promise;
  if (editingProjectKey) {
    data.createdAt = null; // preserve original date
    promise = userRef.child('projects/' + editingProjectKey).update(data).then(() => {
      // remove null createdAt
      return userRef.child('projects/' + editingProjectKey + '/createdAt').once('value').then(s => {
        if (!s.exists()) return userRef.child('projects/' + editingProjectKey).update({ createdAt: Date.now() });
      });
    });
  } else {
    promise = userRef.child('projects').push(data);
  }

  promise.then(() => {
    btn.textContent = 'Save Project';
    btn.disabled = false;
    closeModal('projectModal');
    loadProjects();
    showToast(editingProjectKey ? 'Project updated! ✅' : 'Project added! 🚀', 'success');
    editingProjectKey = null;
    projectImageData = '';
  }).catch(err => {
    btn.textContent = 'Save Project';
    btn.disabled = false;
    console.error(err);
    showToast('Error saving project', 'error');
  });
}

function editProject(key) {
  if (!isOwner) return;
  userRef.child('projects/' + key).once('value').then(snap => {
    if (!snap.exists()) return;
    const p = snap.val();
    openProjectModal({ key, ...p });
  });
}

function deleteProject(key) {
  if (!isOwner) return;
  if (!confirm('Are you sure you want to delete this project?')) return;
  userRef.child('projects/' + key).remove().then(() => {
    loadProjects();
    showToast('Project deleted', 'info');
  }).catch(() => showToast('Error deleting project', 'error'));
}

// ===================== ORDERS =====================

function loadOrders(uid) {
  firebase.database().ref(`users/${uid}/orders`).once('value').then(snap => {
    const container = document.getElementById('ordersContainer');
    if (!snap.exists()) {
      container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No orders yet.</p>`;
      return;
    }
    container.innerHTML = '';
    const orders = snap.val();
    const sorted = Object.keys(orders).sort((a, b) => new Date(orders[b].date) - new Date(orders[a].date));
    sorted.forEach(key => {
      const o = orders[key];
      const date = new Date(o.date).toLocaleDateString();
      let items = '';
      (o.items || []).forEach(i => {
        items += `<div class="order-item"><span>${i.qty}x ${esc(i.name)}</span><span>$${(i.price * i.qty).toFixed(2)}</span></div>`;
      });
      container.innerHTML += `
        <div class="card order-card">
          <div class="order-header">
            <div><strong>Order #${key.slice(-6)}</strong><div style="font-size:12px;color:var(--text-muted);margin-top:4px">${date}</div></div>
            <span class="badge badge-primary">${o.status || 'Processing'}</span>
          </div>
          ${items}
          <div style="border-top:1px solid var(--border);padding-top:12px;text-align:right;font-weight:bold">Total: $${o.total.toFixed(2)}</div>
        </div>`;
    });
  });
}

function toggleOrders() {
  const btn = document.getElementById('ordersToggle');
  const content = document.getElementById('ordersContent');
  btn.classList.toggle('open');
  content.classList.toggle('open');
}

// ===================== MODALS =====================

function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// ===================== UTILS =====================

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function showGuestState() {
  setText('profileName', 'Guest User');
  setText('profileUsername', '@guest');
  setText('profileBio', 'Sign in to create your portfolio.');
  document.querySelectorAll('.owner-only').forEach(el => el.style.display = 'none');
  const orderSec = document.querySelector('.orders-section');
  if (orderSec) orderSec.style.display = 'none';
}

function logoutUser() {
  firebase.auth().signOut().then(() => {
    sessionStorage.removeItem('guestMode');
    window.location.href = 'auth.html';
  });
}
