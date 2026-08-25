// profile.js - Advanced Portfolio Builder

const firebaseConfig = {
  apiKey: "AIzaSyBydQb6wDh4X7JA0JkcuhToJam66VD3bTM",
  authDomain: "englishx-ed1c6.firebaseapp.com",
  projectId: "englishx-ed1c6",
  storageBucket: "englishx-ed1c6.firebasestorage.app",
  messagingSenderId: "570756105739",
  appId: "1:570756105739:web:69c4b5edd62cc34c56290e"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

let currentUser = null;
let userRef = null;
let isOwner = false;
let targetUid = null;
let profileData = {};

document.addEventListener('DOMContentLoaded', () => {
  const nm = document.getElementById('profileName');
  if(nm) nm.innerText = "JS Executing...";

  const urlParams = new URLSearchParams(window.location.search);
  const viewUserId = urlParams.get('user'); // Changed from id to user as requested

  firebase.auth().onAuthStateChanged(user => {
    if (user) currentUser = user;

    targetUid = viewUserId || (user ? user.uid : null);

    if (!targetUid) {
      if (sessionStorage.getItem('guestMode') === 'true') {
        showGuestState();
      } else {
        window.location.href = 'auth.html';
      }
      return;
    }

    isOwner = (user && user.uid === targetUid);
    userRef = firebase.database().ref('users/' + targetUid);

    if (isOwner && !viewUserId) {
      document.body.classList.add('owner-view');
      document.getElementById('builderToolbar').style.display = 'flex';
    } else {
      document.body.classList.remove('owner-view');
    }

    loadProfileData();
    loadProjects();
  });
});

// ===================== PROFILE LOADING =====================

function loadProfileData() {
  try {
    userRef.on('value', snapshot => {
      if (!snapshot.exists()) {
        setText('profileName', 'User Not Found');
        setText('profileUsername', '');
        setText('profileBio', 'This user does not exist or has no data.');
        return;
      }
      
      const d = snapshot.val();
      profileData = d;

      try {
        // Apply Theme
        document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
        if(d.theme) {
          document.body.classList.add('theme-' + d.theme);
          if(isOwner) {
            document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
            const activeCard = document.querySelector(`.theme-card[onclick*="${d.theme}"]`);
            if(activeCard) activeCard.classList.add('active');
          }
        }

        // Cover Photo
        const coverEl = document.getElementById('coverPhotoPreview');
        if(coverEl) {
          if (d.coverPhoto) {
            coverEl.style.backgroundImage = `url('${d.coverPhoto}')`;
          } else {
            coverEl.style.backgroundImage = 'linear-gradient(135deg, var(--bg-secondary), var(--border))';
          }
        }

        // Basic Details
        setText('profileName', d.name || 'Space Engineer');
        setText('profileUsername', '@' + (d.username || 'user'));
        setText('profileBio', d.bio || 'Building the future with ESTL.');
        setText('statProjects', Object.keys(d.projects || {}).length);
        setText('statXP', d.xp || 0);
        setText('statLevel', d.level || 1);

        // Avatar
        const av = document.getElementById('profileAvatar');
        if(av) {
          if (d.photoURL) {
            av.style.backgroundImage = `url('${d.photoURL}')`;
            av.textContent = '';
          } else {
            av.style.backgroundImage = 'none';
            av.textContent = '👤';
          }
        }

        // Social Links
        const socialsEl = document.getElementById('profileSocials');
        if(socialsEl) {
          socialsEl.innerHTML = '';
          const social = d.social || {};
          if (social.github) socialsEl.innerHTML += `<a href="${esc(social.github)}" target="_blank"> GitHub</a>`;
          if (social.instagram) socialsEl.innerHTML += `<a href="${esc(social.instagram)}" target="_blank"> Instagram</a>`;
          if (social.website) socialsEl.innerHTML += `<a href="${esc(social.website)}" target="_blank"> Website</a>`;
        }

        // Custom Links
        renderCustomLinks(d.customLinks || []);
        if (isOwner) initCarrdEditor(d);
        else applyCustomStyles(d.customStyle || {});

        // Skills
        renderSkills(d.skills || []);

        // Prefill Edit Form
        if (isOwner) {
          const els = ['editName', 'editUsername', 'editBio', 'editGithub', 'editInstagram', 'editWebsite'];
          els.forEach(id => {
            if(!document.getElementById(id)) console.warn('Missing input:', id);
          });
          document.getElementById('editName').value = d.name || '';
          document.getElementById('editUsername').value = d.username || '';
          document.getElementById('editBio').value = d.bio || '';
          document.getElementById('editGithub').value = (d.social && d.social.github) || '';
          document.getElementById('editInstagram').value = (d.social && d.social.instagram) || '';
          document.getElementById('editWebsite').value = (d.social && d.social.website) || '';
        }
      } catch(renderErr) {
        if(window.showToast) showToast('Render error: ' + renderErr.message, 'error');
        console.error('Render error:', renderErr);
      }
    }, (err) => {
      if(window.showToast) showToast('DB Error: ' + err.message, 'error');
      console.error('Database error:', err);
    });
  } catch(e) {
    if(window.showToast) showToast('Init Error: ' + e.message, 'error');
    console.error('Init error:', e);
  }
}

// ===================== CUSTOMIZATION LOGIC =====================

function applyTheme(themeName) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
  document.body.classList.add('theme-' + themeName);
  profileData.selectedTheme = themeName;
}

function saveTheme() {
  if (!isOwner || !profileData.selectedTheme) return;
  userRef.update({ theme: profileData.selectedTheme }).then(() => {
    closeModal('themeModal');
    if(window.showToast) showToast('Theme applied successfully!', 'success');
  });
}

function handleCoverUpload(event) {
  if (!isOwner) return;
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById('coverPhotoPreview').style.backgroundImage = `url('${dataUrl}')`;
    userRef.update({ coverPhoto: dataUrl }).then(() => {
      if(window.showToast) showToast('Cover photo updated!', 'success');
    });
  };
  reader.readAsDataURL(file);
}

function addSkill() {
  if (!isOwner) return;
  const skillName = document.getElementById('newSkillInput').value.trim();
  if (!skillName) return;
  
  let skills = profileData.skills || [];
  if (!skills.includes(skillName)) {
    skills.push(skillName);
    userRef.update({ skills }).then(() => {
      document.getElementById('newSkillInput').value = '';
      closeModal('addSkillModal');
    });
  }
}

function removeSkill(skillName) {
  if (!isOwner) return;
  let skills = profileData.skills || [];
  skills = skills.filter(s => s !== skillName);
  userRef.update({ skills });
}

function renderSkills(skills) {
  const container = document.getElementById('skillsContainer');
  container.innerHTML = '';
  skills.forEach(skill => {
    container.innerHTML += `<div class="skill-badge">${esc(skill)} <span class="remove-skill" onclick="removeSkill('${esc(skill)}')">×</span></div>`;
  });
}

function sharePortfolio() {
  const url = window.location.origin + '/portfolio.html?id=' + targetUid;
  navigator.clipboard.writeText(url).then(() => {
    if(window.showToast) showToast('Portfolio link copied! Share it on Instagram ', 'success');
  });
}

// ===================== BASIC PROFILE EDIT =====================

function saveProfile() {
  if (!isOwner || !currentUser) return;
  const name = document.getElementById('editName').value.trim();
  let username = document.getElementById('editUsername').value.trim().replace(/^@/, '');
  const bio = document.getElementById('editBio').value.trim();
  const github = document.getElementById('editGithub').value.trim();
  const instagram = document.getElementById('editInstagram').value.trim();
  const website = document.getElementById('editWebsite').value.trim();

  userRef.update({
    name, username, bio,
    social: { github, instagram, website }
  }).then(() => {
    closeModal('editProfileModal');
    if(window.showToast) showToast('Profile updated!', 'success');
  }).catch(err => {
    if(window.showToast) showToast('Error: ' + err.message, 'error');
  });
}

function triggerAvatarUpload() {
  if (isOwner) document.getElementById('avatarInput').click();
}

function handleAvatarUpload(event) {
  if (!isOwner) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    userRef.update({ photoURL: e.target.result }).then(() => {
      if(window.showToast) showToast('Avatar updated!', 'success');
    });
  };
  reader.readAsDataURL(file);
}

// ===================== MODALS & UTILS =====================

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function setText(id, text) { const el = document.getElementById(id); if (el) el.innerText = text; }
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

// Projects logic (simplified from previous)
function loadProjects() {
  userRef.child('projects').on('value', snap => {
    const grid = document.getElementById('projectsGrid');
    // keep add button if owner
    grid.innerHTML = isOwner ? `<div class="add-project-card owner-only" onclick="openProjectModal()"><div class="add-icon">+</div><span>Add project</span></div>` : '';
    
    if (snap.exists()) {
      snap.forEach(child => {
        const p = child.val();
        const pKey = child.key;
        grid.innerHTML += `
          <div class="project-card">
            <div class="proj-img" style="background-image:url('${p.image || ''}')"></div>
            <div class="proj-info">
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.description)}</p>
              ${isOwner ? `<button class="btn btn-ghost" onclick="deleteProject('${pKey}')" style="margin-top:10px; color:var(--danger)">Delete</button>` : ''}
            </div>
          </div>
        `;
      });
    } else if (!isOwner) {
      grid.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1;">No projects added yet.</p>';
    }
  });
}

let editProjectId = null;
function openProjectModal(id = null) {
  editProjectId = id;
  document.getElementById('projTitle').value = '';
  document.getElementById('projDesc').value = '';
  document.getElementById('projImageUrl').value = '';
  document.getElementById('projTags').value = '';
  openModal('projectModal');
}

function saveProject() {
  const title = document.getElementById('projTitle').value.trim();
  if(!title) return;
  const desc = document.getElementById('projDesc').value.trim();
  const image = document.getElementById('projImageUrl').value.trim();
  
  const projRef = editProjectId ? userRef.child('projects/' + editProjectId) : userRef.child('projects').push();
  projRef.set({ title, description: desc, image }).then(() => {
    closeModal('projectModal');
    if(window.showToast) showToast('Project saved!', 'success');
  });
}

function deleteProject(id) {
  if(confirm('Are you sure you want to delete this project?')) {
    userRef.child('projects/' + id).remove();
  }
}
function logoutUser() {
  firebase.auth().signOut().then(() => window.location.href = 'auth.html');
}
function showGuestState() {
  setText('profileName', 'Guest User');
  setText('profileUsername', '@guest');
}


// ===================== CARRD.CO BUILDER LOGIC =====================

function toggleSidebar() {
  const sb = document.getElementById('builderSidebar');
  if(!sb) return;
  sb.classList.toggle('active');
  document.body.classList.toggle('sidebar-open');
}

function initCarrdEditor(d) {
  if(!isOwner) return;
  
  // Custom Styles
  const style = d.customStyle || {};
  if (style.bg) document.getElementById('colorBg').value = style.bg;
  if (style.card) document.getElementById('colorCard').value = style.card;
  if (style.primary) document.getElementById('colorPrimary').value = style.primary;
  if (style.text) document.getElementById('colorText').value = style.text;
  if (style.font) document.getElementById('fontSelector').value = style.font;

  // Hidden Sections
  const hidden = d.hiddenSections || [];
  if (hidden.includes('stats')) {
    document.getElementById('toggleStats').classList.remove('on');
    document.querySelector('.stats-bar').style.display = 'none';
  }
  if (hidden.includes('skills')) {
    document.getElementById('toggleSkills').classList.remove('on');
    document.getElementById('skillsContainer').style.display = 'none';
  }
  if (hidden.includes('projects')) {
    document.getElementById('toggleProjects').classList.remove('on');
    document.querySelectorAll('.projects-header, #projectsGrid').forEach(el => el.style.display = 'none');
  }

  // Custom Links Editor
  const links = d.customLinks || [];
  const list = document.getElementById('editorLinksList');
  list.innerHTML = '';
  links.forEach(l => {
    addCustomLinkEditor(l.title, l.url);
  });

  applyCustomStyles(style);
}

function applyCustomStyles(style) {
  const root = document.documentElement;
  if (style.bg) root.style.setProperty('--bg-primary', style.bg);
  if (style.card) root.style.setProperty('--bg-card', style.card);
  if (style.primary) root.style.setProperty('--primary', style.primary);
  if (style.text) root.style.setProperty('--text-primary', style.text);
  if (style.font) root.style.setProperty('font-family', style.font);
}

function updateLivePreview() {
  const bg = document.getElementById('colorBg').value;
  const card = document.getElementById('colorCard').value;
  const primary = document.getElementById('colorPrimary').value;
  const text = document.getElementById('colorText').value;
  const font = document.getElementById('fontSelector').value;
  
  applyCustomStyles({bg, card, primary, text, font});
}

function resetColors() {
  document.getElementById('colorBg').value = '#0a0a0f';
  document.getElementById('colorCard').value = '#161622';
  document.getElementById('colorPrimary').value = '#00ff9d';
  document.getElementById('colorText').value = '#ffffff';
  document.getElementById('fontSelector').value = 'Inter, sans-serif';
  updateLivePreview();
}

function toggleVisibility(toggleId, selector) {
  const toggle = document.getElementById(toggleId);
  toggle.classList.toggle('on');
  const show = toggle.classList.contains('on');
  document.querySelectorAll(selector).forEach(el => {
    el.style.display = show ? '' : 'none';
  });
}

function addCustomLinkEditor(title = '', url = '') {
  const id = 'link_' + Math.random().toString(36).substr(2, 9);
  const html = `
    <div class="editor-link-item" id="${id}">
      <div class="editor-link-remove" onclick="document.getElementById('${id}').remove()">✕</div>
      <input type="text" class="form-input link-title-input" placeholder="Button Title (e.g. My YouTube)" value="${esc(title)}">
      <input type="url" class="form-input link-url-input" placeholder="https://" value="${esc(url)}">
    </div>
  `;
  document.getElementById('editorLinksList').insertAdjacentHTML('beforeend', html);
}

function saveCarrdDesign() {
  if (!isOwner) return;

  const bg = document.getElementById('colorBg').value;
  const card = document.getElementById('colorCard').value;
  const primary = document.getElementById('colorPrimary').value;
  const text = document.getElementById('colorText').value;
  const font = document.getElementById('fontSelector').value;
  
  const customStyle = { bg, card, primary, text, font };

  const hiddenSections = [];
  if (!document.getElementById('toggleStats').classList.contains('on')) hiddenSections.push('stats');
  if (!document.getElementById('toggleSkills').classList.contains('on')) hiddenSections.push('skills');
  if (!document.getElementById('toggleProjects').classList.contains('on')) hiddenSections.push('projects');

  const customLinks = [];
  document.querySelectorAll('.editor-link-item').forEach(el => {
    const title = el.querySelector('.link-title-input').value.trim();
    const url = el.querySelector('.link-url-input').value.trim();
    if (title && url) customLinks.push({ title, url });
  });

  userRef.update({ customStyle, hiddenSections, customLinks }).then(() => {
    if(window.showToast) showToast('Design saved successfully! ', 'success');
  }).catch(err => {
    if(window.showToast) showToast('Error saving: ' + err.message, 'error');
  });
}

function renderCustomLinks(links) {
  const container = document.getElementById('customLinksPreview');
  if(!container) return;
  container.innerHTML = '';
  if (!links) return;
  links.forEach(l => {
    container.innerHTML += `<a href="${esc(l.url)}" target="_blank" class="custom-link-btn">${esc(l.title)}</a>`;
  });
}
