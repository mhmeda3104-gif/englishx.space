// profile.js - Carrd.co Modular Block Builder Engine

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
let activeBlocks = [];
let pageSettings = {
  canvasWidth: '800px',
  bg: '',
  card: '',
  primary: '',
  text: '',
  font: 'Inter, sans-serif'
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewUserId = urlParams.get('user') || urlParams.get('id');

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
      const tb = document.getElementById('builderToolbar');
      if (tb) tb.style.display = 'flex';
    } else {
      document.body.classList.remove('owner-view');
    }

    loadProfileData();
  });
});

// ===================== DATA LOADING =====================

function loadProfileData() {
  userRef.on('value', snapshot => {
    if (!snapshot.exists()) {
      renderEmptyState();
      return;
    }

    const d = snapshot.val();
    profileData = d;

    // Load or migrate blocks
    if (d.customBlocks && Array.isArray(d.customBlocks) && d.customBlocks.length > 0) {
      activeBlocks = JSON.parse(JSON.stringify(d.customBlocks));
    } else {
      activeBlocks = createStarterBlocks(d);
    }

    // Load page settings
    if (d.pageSettings) {
      pageSettings = { ...pageSettings, ...d.pageSettings };
    } else if (d.customStyle) {
      pageSettings.bg = d.customStyle.bg || '';
      pageSettings.card = d.customStyle.card || '';
      pageSettings.primary = d.customStyle.primary || '';
      pageSettings.text = d.customStyle.text || '';
      pageSettings.font = d.customStyle.font || 'Inter, sans-serif';
    }

    applyPageStyles(pageSettings);
    renderCanvasBlocks();

    if (isOwner) {
      initSidebarControls();
      renderSidebarBlocksList();
    }
  }, err => {
    console.error('Database read error:', err);
  });
}

function createStarterBlocks(d) {
  const blocks = [];
  
  // 1. Cover Photo if exists
  if (d.coverPhoto) {
    blocks.push({
      id: genId('block'),
      type: 'image',
      url: d.coverPhoto,
      size: 'full',
      radius: 'rounded',
      align: 'center',
      link: '',
      caption: ''
    });
  }

  // 2. Avatar
  blocks.push({
    id: genId('block'),
    type: 'image',
    url: d.photoURL || 'logo.png',
    size: 'avatar',
    radius: 'circle',
    align: 'center',
    link: '',
    caption: ''
  });

  // 3. Name & Bio
  blocks.push({
    id: genId('block'),
    type: 'text',
    content: d.name || 'Space Engineer',
    style: 'h1',
    align: 'center',
    color: ''
  });

  if (d.username) {
    blocks.push({
      id: genId('block'),
      type: 'text',
      content: '@' + d.username,
      style: 'h3',
      align: 'center',
      color: 'var(--primary)'
    });
  }

  if (d.bio) {
    blocks.push({
      id: genId('block'),
      type: 'text',
      content: d.bio,
      style: 'body',
      align: 'center',
      color: ''
    });
  }

  // 4. Social & Custom Links
  const linkBtns = [];
  const social = d.social || {};
  if (social.github) linkBtns.push({ title: 'GitHub', url: social.github, style: 'outline' });
  if (social.instagram) linkBtns.push({ title: 'Instagram', url: social.instagram, style: 'outline' });
  if (social.website) linkBtns.push({ title: 'Website', url: social.website, style: 'outline' });

  (d.customLinks || []).forEach(l => {
    if (l.title && l.url) linkBtns.push({ title: l.title, url: l.url, style: 'solid' });
  });

  if (linkBtns.length > 0) {
    blocks.push({
      id: genId('block'),
      type: 'buttons',
      buttons: linkBtns,
      layout: 'column',
      align: 'center'
    });
  }

  return blocks;
}

// ===================== CANVAS RENDERING =====================

function renderCanvasBlocks() {
  const canvas = document.getElementById('modularCanvas');
  if (!canvas) return;

  // Hide legacy elements to avoid duplication
  const legacyHero = document.querySelector('.profile-hero');
  const legacyCover = document.getElementById('coverPhotoPreview');
  const legacyStats = document.querySelector('.stats-bar');
  const legacyProjectsHeader = document.querySelector('.projects-header');
  const legacyProjectsGrid = document.getElementById('projectsGrid');
  if (legacyHero) legacyHero.style.display = 'none';
  if (legacyCover) legacyCover.style.display = 'none';
  if (legacyStats) legacyStats.style.display = 'none';
  if (legacyProjectsHeader) legacyProjectsHeader.style.display = 'none';
  if (legacyProjectsGrid) legacyProjectsGrid.style.display = 'none';

  canvas.innerHTML = '';

  if (activeBlocks.length === 0) {
    canvas.innerHTML = '<div style="text-align:center; padding:60px 20px; color:var(--text-muted); border:2px dashed var(--border); border-radius:var(--radius-lg);">No elements yet. Click "+ Add Element" in Design Mode to start building!</div>';
    return;
  }

  activeBlocks.forEach((b, index) => {
    const blockEl = document.createElement('div');
    blockEl.className = 'canvas-block';
    blockEl.id = 'canvas_' + b.id;

    let innerHtml = '';

    if (b.type === 'image') {
      const alignClass = 'align-' + (b.align || 'center');
      const sizeClass = 'size-' + (b.size || 'medium');
      const radiusClass = 'radius-' + (b.radius || 'rounded');
      const imgUrl = b.url || 'logo.png';
      const imgTag = `<img src="${esc(imgUrl)}" alt="Image" loading="lazy">`;
      const linkedImg = b.link ? `<a href="${esc(b.link)}" target="_blank">${imgTag}</a>` : imgTag;
      const captionTag = b.caption ? `<div class="block-image-caption">${esc(b.caption)}</div>` : '';

      innerHtml = `
        <div class="block-image-wrap ${alignClass} ${sizeClass} ${radiusClass}">
          <div class="block-image-content">
            ${linkedImg}
            ${captionTag}
          </div>
        </div>
      `;
    } 
    else if (b.type === 'text') {
      const alignClass = 'align-' + (b.align || 'center');
      const styleClass = 'style-' + (b.style || 'body');
      const colorStyle = b.color ? `style="color:${esc(b.color)}"` : '';
      innerHtml = `
        <div class="block-text ${alignClass} ${styleClass}" ${colorStyle}>
          ${esc(b.content || '')}
        </div>
      `;
    }
    else if (b.type === 'buttons') {
      const layoutClass = 'layout-' + (b.layout || 'column');
      const alignClass = 'align-' + (b.align || 'center');
      const btnsHtml = (b.buttons || []).map(btn => {
        const btnStyle = 'btn-' + (btn.style || 'solid');
        return `<a href="${esc(btn.url || '#')}" target="_blank" class="block-btn-item ${btnStyle}">${esc(btn.title || 'Link')}</a>`;
      }).join('');

      innerHtml = `
        <div class="block-buttons ${layoutClass} ${alignClass}">
          ${btnsHtml}
        </div>
      `;
    }
    else if (b.type === 'divider') {
      const styleClass = 'style-' + (b.style || 'line');
      innerHtml = `
        <div class="block-divider ${styleClass}">
          <hr>
        </div>
      `;
    }
    else if (b.type === 'video') {
      const videoUrl = b.url || '';
      let mediaTag = '';
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const embedUrl = getYouTubeEmbedUrl(videoUrl);
        mediaTag = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
      } else {
        const autoplayAttr = b.autoplay ? 'autoplay loop muted playsinline' : 'controls';
        mediaTag = `<video src="${esc(videoUrl)}" ${autoplayAttr}></video>`;
      }
      innerHtml = `
        <div class="block-video">
          ${mediaTag}
        </div>
      `;
    }

    // Owner in-canvas quick tools
    if (isOwner) {
      innerHtml += `
        <div class="canvas-block-actions">
          <button onclick="moveBlock(${index}, -1)" title="Move Up">▲</button>
          <button onclick="moveBlock(${index}, 1)" title="Move Down">▼</button>
          <button onclick="openBlockSettings('${b.id}')" title="Edit">⚙</button>
          <button onclick="removeBlock('${b.id}')" title="Delete" style="color:var(--danger)">✕</button>
        </div>
      `;
    }

    blockEl.innerHTML = innerHtml;
    canvas.appendChild(blockEl);
  });
}

function getYouTubeEmbedUrl(url) {
  let videoId = '';
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('watch?v=')) {
    videoId = url.split('watch?v=')[1].split('&')[0];
  }
  return videoId ? 'https://www.youtube.com/embed/' + videoId : url;
}

// ===================== SIDEBAR BLOCK MANAGEMENT =====================

function renderSidebarBlocksList() {
  const container = document.getElementById('sidebarBlocksList');
  const countEl = document.getElementById('blocksCount');
  if (!container) return;

  if (countEl) countEl.innerText = activeBlocks.length;
  container.innerHTML = '';

  activeBlocks.forEach((b, index) => {
    const item = document.createElement('div');
    item.className = 'sidebar-block-item';
    item.id = 'sidebar_item_' + b.id;

    let icon = '📄';
    let title = 'Element';
    if (b.type === 'image') { icon = '🖼️'; title = 'Image (' + (b.size || 'medium') + ')'; }
    else if (b.type === 'text') { icon = '✍️'; title = 'Text (' + (b.style || 'body') + ')'; }
    else if (b.type === 'buttons') { icon = '🔘'; title = 'Buttons (' + (b.buttons ? b.buttons.length : 0) + ')'; }
    else if (b.type === 'divider') { icon = '➖'; title = 'Divider (' + (b.style || 'line') + ')'; }
    else if (b.type === 'video') { icon = '📹'; title = 'Video Embed'; }

    item.innerHTML = `
      <div class="sidebar-block-header" onclick="toggleBlockSettings('${b.id}')">
        <div class="sidebar-block-title">${icon} ${title}</div>
        <div class="sidebar-block-controls" onclick="event.stopPropagation()">
          <button onclick="moveBlock(${index}, -1)" title="Move Up">▲</button>
          <button onclick="moveBlock(${index}, 1)" title="Move Down">▼</button>
          <button class="btn-del" onclick="removeBlock('${b.id}')" title="Delete">✕</button>
        </div>
      </div>
      <div class="sidebar-block-body">
        ${renderBlockEditorFields(b, index)}
      </div>
    `;

    container.appendChild(item);
  });
}

function renderBlockEditorFields(b, index) {
  if (b.type === 'image') {
    return `
      <div class="editor-row">
        <label>Upload Image</label>
        <input type="file" accept="image/*" class="editor-input" onchange="handleBlockImageUpload(event, '${b.id}')">
      </div>
      <div class="editor-row">
        <label>Or Image URL</label>
        <input type="url" class="editor-input" value="${esc(b.url || '')}" placeholder="https://" oninput="updateBlockProp('${b.id}', 'url', this.value)">
      </div>
      <div class="editor-row">
        <label>Size</label>
        <select class="editor-select" onchange="updateBlockProp('${b.id}', 'size', this.value)">
          <option value="full" ${b.size==='full'?'selected':''}>Full Width (100%)</option>
          <option value="large" ${b.size==='large'?'selected':''}>Large (75%)</option>
          <option value="medium" ${b.size==='medium'?'selected':''}>Medium (50%)</option>
          <option value="small" ${b.size==='small'?'selected':''}>Small (220px)</option>
          <option value="avatar" ${b.size==='avatar'?'selected':''}>Avatar Circle (120px)</option>
        </select>
      </div>
      <div class="editor-row">
        <label>Corner Radius</label>
        <select class="editor-select" onchange="updateBlockProp('${b.id}', 'radius', this.value)">
          <option value="rounded" ${b.radius==='rounded'?'selected':''}>Rounded Corners</option>
          <option value="none" ${b.radius==='none'?'selected':''}>Square (0)</option>
          <option value="circle" ${b.radius==='circle'?'selected':''}>Circle (Pill)</option>
        </select>
      </div>
      <div class="editor-row">
        <label>Alignment</label>
        <div class="editor-segmented">
          <button class="${b.align==='left'?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'left')">Left</button>
          <button class="${b.align==='center'||!b.align?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'center')">Center</button>
          <button class="${b.align==='right'?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'right')">Right</button>
        </div>
      </div>
      <div class="editor-row">
        <label>Click URL (Optional)</label>
        <input type="url" class="editor-input" value="${esc(b.link || '')}" placeholder="https://" oninput="updateBlockProp('${b.id}', 'link', this.value)">
      </div>
      <div class="editor-row">
        <label>Caption (Optional)</label>
        <input type="text" class="editor-input" value="${esc(b.caption || '')}" placeholder="Photo caption..." oninput="updateBlockProp('${b.id}', 'caption', this.value)">
      </div>
    `;
  }
  else if (b.type === 'text') {
    return `
      <div class="editor-row">
        <label>Text Content</label>
        <textarea class="editor-input" rows="3" oninput="updateBlockProp('${b.id}', 'content', this.value)">${esc(b.content || '')}</textarea>
      </div>
      <div class="editor-row">
        <label>Style Type</label>
        <select class="editor-select" onchange="updateBlockProp('${b.id}', 'style', this.value)">
          <option value="h1" ${b.style==='h1'?'selected':''}>Main Heading (H1)</option>
          <option value="h2" ${b.style==='h2'?'selected':''}>Subheading (H2)</option>
          <option value="h3" ${b.style==='h3'?'selected':''}>Section Title (H3)</option>
          <option value="body" ${b.style==='body'?'selected':''}>Body Paragraph</option>
          <option value="quote" ${b.style==='quote'?'selected':''}>Quote</option>
        </select>
      </div>
      <div class="editor-row">
        <label>Alignment</label>
        <div class="editor-segmented">
          <button class="${b.align==='left'?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'left')">Left</button>
          <button class="${b.align==='center'||!b.align?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'center')">Center</button>
          <button class="${b.align==='right'?'active':''}" onclick="updateBlockProp('${b.id}', 'align', 'right')">Right</button>
        </div>
      </div>
      <div class="editor-row">
        <label>Custom Color (Optional)</label>
        <input type="color" class="editor-input" value="${b.color || '#ffffff'}" onchange="updateBlockProp('${b.id}', 'color', this.value)">
      </div>
    `;
  }
  else if (b.type === 'buttons') {
    const btns = b.buttons || [];
    let btnsEditorHtml = btns.map((btn, bIdx) => `
      <div style="background:var(--bg-card); padding:8px; border-radius:4px; margin-bottom:6px; position:relative;">
        <button style="position:absolute; top:4px; right:4px; background:none; border:none; color:var(--danger); cursor:pointer;" onclick="removeButtonFromBlock('${b.id}', ${bIdx})">✕</button>
        <input type="text" class="editor-input" placeholder="Title" value="${esc(btn.title)}" oninput="updateButtonProp('${b.id}', ${bIdx}, 'title', this.value)" style="margin-bottom:4px;">
        <input type="url" class="editor-input" placeholder="https://" value="${esc(btn.url)}" oninput="updateButtonProp('${b.id}', ${bIdx}, 'url', this.value)" style="margin-bottom:4px;">
        <select class="editor-select" onchange="updateButtonProp('${b.id}', ${bIdx}, 'style', this.value)">
          <option value="solid" ${btn.style==='solid'?'selected':''}>Solid Brand</option>
          <option value="outline" ${btn.style==='outline'?'selected':''}>Outline</option>
          <option value="ghost" ${btn.style==='ghost'?'selected':''}>Subtle Ghost</option>
        </select>
      </div>
    `).join('');

    return `
      <div class="editor-row">
        <label>Buttons List</label>
        ${btnsEditorHtml}
        <button class="btn btn-ghost" style="width:100%; font-size:12px; padding:6px;" onclick="addButtonToBlock('${b.id}')">+ Add Button</button>
      </div>
      <div class="editor-row">
        <label>Layout</label>
        <select class="editor-select" onchange="updateBlockProp('${b.id}', 'layout', this.value)">
          <option value="column" ${b.layout==='column'?'selected':''}>Vertical Stack (Column)</option>
          <option value="row" ${b.layout==='row'?'selected':''}>Horizontal (Row)</option>
        </select>
      </div>
    `;
  }
  else if (b.type === 'divider') {
    return `
      <div class="editor-row">
        <label>Divider Style</label>
        <select class="editor-select" onchange="updateBlockProp('${b.id}', 'style', this.value)">
          <option value="line" ${b.style==='line'?'selected':''}>Solid Line</option>
          <option value="dashed" ${b.style==='dashed'?'selected':''}>Dashed Line</option>
          <option value="dots" ${b.style==='dots'?'selected':''}>Dotted Center</option>
          <option value="space" ${b.style==='space'?'selected':''}>Blank Space Gap</option>
        </select>
      </div>
    `;
  }
  else if (b.type === 'video') {
    return `
      <div class="editor-row">
        <label>Video URL (MP4 or YouTube)</label>
        <input type="url" class="editor-input" value="${esc(b.url || '')}" placeholder="https://..." oninput="updateBlockProp('${b.id}', 'url', this.value)">
      </div>
      <div class="editor-row">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" ${b.autoplay?'checked':''} onchange="updateBlockProp('${b.id}', 'autoplay', this.checked)">
          <span>Autoplay Looping (GIF-like)</span>
        </label>
      </div>
    `;
  }
  return '';
}

// ===================== BLOCK ACTIONS =====================

function addNewBlock(type) {
  const newB = {
    id: genId('block'),
    type: type
  };

  if (type === 'image') {
    newB.url = 'logo.png';
    newB.size = 'medium';
    newB.radius = 'rounded';
    newB.align = 'center';
  } else if (type === 'text') {
    newB.content = 'Write your text here...';
    newB.style = 'body';
    newB.align = 'center';
  } else if (type === 'buttons') {
    newB.buttons = [{ title: 'Visit Link', url: 'https://', style: 'solid' }];
    newB.layout = 'column';
    newB.align = 'center';
  } else if (type === 'divider') {
    newB.style = 'line';
  } else if (type === 'video') {
    newB.url = 'promo-video.mp4';
    newB.autoplay = true;
  }

  activeBlocks.push(newB);
  renderCanvasBlocks();
  renderSidebarBlocksList();
  openBlockSettings(newB.id);
}

function removeBlock(id) {
  activeBlocks = activeBlocks.filter(b => b.id !== id);
  renderCanvasBlocks();
  renderSidebarBlocksList();
}

function moveBlock(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= activeBlocks.length) return;
  const temp = activeBlocks[index];
  activeBlocks[index] = activeBlocks[targetIndex];
  activeBlocks[targetIndex] = temp;
  renderCanvasBlocks();
  renderSidebarBlocksList();
}

function updateBlockProp(id, prop, value) {
  const block = activeBlocks.find(b => b.id === id);
  if (!block) return;
  block[prop] = value;
  renderCanvasBlocks();
}

function handleBlockImageUpload(event, blockId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    updateBlockProp(blockId, 'url', e.target.result);
    renderSidebarBlocksList();
    openBlockSettings(blockId);
  };
  reader.readAsDataURL(file);
}

function addButtonToBlock(blockId) {
  const block = activeBlocks.find(b => b.id === blockId);
  if (!block) return;
  if (!block.buttons) block.buttons = [];
  block.buttons.push({ title: 'New Button', url: 'https://', style: 'solid' });
  renderCanvasBlocks();
  renderSidebarBlocksList();
  openBlockSettings(blockId);
}

function removeButtonFromBlock(blockId, btnIndex) {
  const block = activeBlocks.find(b => b.id === blockId);
  if (!block || !block.buttons) return;
  block.buttons.splice(btnIndex, 1);
  renderCanvasBlocks();
  renderSidebarBlocksList();
  openBlockSettings(blockId);
}

function updateButtonProp(blockId, btnIndex, prop, value) {
  const block = activeBlocks.find(b => b.id === blockId);
  if (!block || !block.buttons || !block.buttons[btnIndex]) return;
  block.buttons[btnIndex][prop] = value;
  renderCanvasBlocks();
}

function toggleBlockSettings(id) {
  const item = document.getElementById('sidebar_item_' + id);
  if (!item) return;
  item.classList.toggle('open');
}

function openBlockSettings(id) {
  const item = document.getElementById('sidebar_item_' + id);
  if (!item) return;
  item.classList.add('open');
  item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function resetToDefaultBlocks() {
  if (confirm('Reset your layout to the standard starter profile?')) {
    activeBlocks = createStarterBlocks(profileData);
    renderCanvasBlocks();
    renderSidebarBlocksList();
  }
}

// ===================== PAGE SETTINGS & PREVIEW =====================

function initSidebarControls() {
  if (pageSettings.canvasWidth) {
    const sel = document.getElementById('settingCanvasWidth');
    if (sel) sel.value = pageSettings.canvasWidth;
  }
  if (pageSettings.bg) document.getElementById('colorBg').value = pageSettings.bg;
  if (pageSettings.card) document.getElementById('colorCard').value = pageSettings.card;
  if (pageSettings.primary) document.getElementById('colorPrimary').value = pageSettings.primary;
  if (pageSettings.text) document.getElementById('colorText').value = pageSettings.text;
  if (pageSettings.font) document.getElementById('fontSelector').value = pageSettings.font;
}

function updatePageStylePreview() {
  pageSettings.canvasWidth = document.getElementById('settingCanvasWidth').value;
  pageSettings.bg = document.getElementById('colorBg').value;
  pageSettings.card = document.getElementById('colorCard').value;
  pageSettings.primary = document.getElementById('colorPrimary').value;
  pageSettings.text = document.getElementById('colorText').value;
  pageSettings.font = document.getElementById('fontSelector').value;

  applyPageStyles(pageSettings);
}

function applyPageStyles(settings) {
  const root = document.documentElement;
  if (settings.canvasWidth) root.style.setProperty('--canvas-max-width', settings.canvasWidth);
  if (settings.bg) root.style.setProperty('--bg-primary', settings.bg);
  if (settings.card) root.style.setProperty('--bg-card', settings.card);
  if (settings.primary) root.style.setProperty('--primary', settings.primary);
  if (settings.text) root.style.setProperty('--text-primary', settings.text);
  if (settings.font) root.style.setProperty('font-family', settings.font);
}

function toggleSidebar() {
  const sb = document.getElementById('builderSidebar');
  if (!sb) return;
  sb.classList.toggle('active');
  document.body.classList.toggle('sidebar-open');
}

function saveCarrdDesign() {
  if (!isOwner) return;

  userRef.update({
    customBlocks: activeBlocks,
    pageSettings: pageSettings
  }).then(() => {
    if (window.showToast) showToast('Design saved & published successfully!', 'success');
  }).catch(err => {
    if (window.showToast) showToast('Error saving: ' + err.message, 'error');
  });
}

function sharePortfolio() {
  const url = window.location.origin + '/portfolio.html?id=' + targetUid;
  navigator.clipboard.writeText(url).then(() => {
    if (window.showToast) showToast('Portfolio link copied!', 'success');
  });
}

function logoutUser() {
  firebase.auth().signOut().then(() => window.location.href = 'auth.html');
}

function genId(prefix) {
  return prefix + '_' + Math.random().toString(36).substr(2, 9);
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

function showGuestState() {
  const canvas = document.getElementById('modularCanvas');
  if (canvas) canvas.innerHTML = '<div style="text-align:center; padding:60px;"><h3>Guest Mode</h3><p>Please log in to design your profile.</p></div>';
}
