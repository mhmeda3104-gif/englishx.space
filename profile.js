// profile.js - Advanced Portfolio Builder

let currentUser = null;
let userRef = null;
let isOwner = false;
let targetUid = null;
let profileData = {};

document.addEventListener('DOMContentLoaded', () => {
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
    if (isOwner) loadOrders(targetUid);
  });
});

// ===================== PROFILE LOADING =====================

function loadProfileData() {
  userRef.on('value', snapshot => {
    if (!snapshot.exists()) {
      setText('profileName', 'User Not Found');
      setText('profileUsername', '');
      setText('profileBio', 'This user does not exist or has no data.');
      return;
    }
    
    const d = snapshot.val();
    profileData = d;

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
    if (d.coverPhoto) {
      coverEl.style.backgroundImage = `url('${d.coverPhoto}')`;
    } else {
      coverEl.style.backgroundImage = 'linear-gradient(135deg, var(--bg-secondary), var(--border))';
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
    if (d.photoURL) {
      av.style.backgroundImage = `url('${d.photoURL}')`;
      av.textContent = '';
    } else {
      av.style.backgroundImage = 'none';
      av.textContent = '👤';
    }

    // Social Links
    const socialsEl = document.getElementById('profileSocials');
    socialsEl.innerHTML = '';
    const social = d.social || {};
    if (social.github) socialsEl.innerHTML += `<a href="${esc(social.github)}" target="_blank">💻 GitHub</a>`;
    if (social.instagram) socialsEl.innerHTML += `<a href="${esc(social.instagram)}" target="_blank">📸 Instagram</a>`;
    if (social.website) socialsEl.innerHTML += `<a href="${esc(social.website)}" target="_blank">🌐 Website</a>`;

    // Skills
    renderSkills(d.skills || []);

    // Prefill Edit Form
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
  const username = profileData.username || targetUid;
  const url = window.location.origin + '/portfolio.html?u=' + username;
  navigator.clipboard.writeText(url).then(() => {
    if(window.showToast) showToast('Portfolio link copied! Share it on Instagram 📸', 'success');
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
