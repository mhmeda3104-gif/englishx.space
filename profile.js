// profile.js - Exact Carrd.co Visual Builder Engine

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
let targetUid = null;
let profileData = {};
let activeBlocks = [];
let selectedBlockId = null;
let historyStack = [];
let historyIndex = -1;

let pageSettings = {
  siteTitle: 'My Untitled Site',
  cardWidth: '680px',
  cardRadius: '8px',
  cardBg: '#ffffff',
  bg: '#e8eaed',
  primary: '#2563eb',
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
        renderGuestMode();
      } else {
        window.location.href = 'auth.html';
      }
      return;
    }

    userRef = firebase.database().ref('users/' + targetUid);
    loadCarrdProfileData();
  });
});

// ===================== DATA & HISTORY =====================

function pushHistory() {
  const state = JSON.stringify({ blocks: activeBlocks, settings: pageSettings });
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(state);
  if (historyStack.length > 30) historyStack.shift();
  historyIndex = historyStack.length - 1;
}

function undoAction() {
  if (historyIndex > 0) {
    historyIndex--;
    const state = JSON.parse(historyStack[historyIndex]);
    activeBlocks = state.blocks;
    pageSettings = state.settings;
    applyPageSettings(pageSettings);
    renderCarrdCard();
    if (selectedBlockId) openBlockDrawer(selectedBlockId);
    showToast('Undo', 'info');
  }
}

function redoAction() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    const state = JSON.parse(historyStack[historyIndex]);
    activeBlocks = state.blocks;
    pageSettings = state.settings;
    applyPageSettings(pageSettings);
    renderCarrdCard();
    if (selectedBlockId) openBlockDrawer(selectedBlockId);
    showToast('Redo', 'info');
  }
}

function loadCarrdProfileData() {
  userRef.once('value').then(snapshot => {
    if (!snapshot.exists()) {
      activeBlocks = createCarrdStarterBlocks({});
      renderCarrdCard();
      pushHistory();
      return;
    }

    const d = snapshot.val();
    profileData = d;

    // Load customBlocks or migrate
    if (d.customBlocks && Array.isArray(d.customBlocks) && d.customBlocks.length > 0) {
      activeBlocks = d.customBlocks;
    } else {
      activeBlocks = createCarrdStarterBlocks(d);
    }

    // Load page settings
    if (d.pageSettings) {
      pageSettings = { ...pageSettings, ...d.pageSettings };
    }

    initPageSettingsInputs();
    applyPageSettings(pageSettings);
    renderCarrdCard();
    pushHistory();
  }).catch(err => {
    console.error('Data load error:', err);
  });
}

function createCarrdStarterBlocks(d) {
  // If user has existing profile info, use it; otherwise provide Carrd default starter
  if (d.name || d.bio || d.photoURL) {
    const blocks = [];
    if (d.photoURL) {
      blocks.push({
        id: genId('img'),
        type: 'image',
        url: d.photoURL,
        size: 'avatar',
        radius: 'circle',
        align: 'center'
      });
    }
    blocks.push({
      id: genId('txt'),
      type: 'text',
      content: d.name || 'My Untitled Site',
      style: 'h1',
      align: 'center'
    });
    if (d.bio) {
      blocks.push({
        id: genId('txt'),
        type: 'text',
        content: d.bio,
        style: 'body',
        align: 'center'
      });
    }
    const socialBtns = [];
    if (d.social) {
      if (d.social.github) socialBtns.push({ title: 'GitHub', url: d.social.github, style: 'outline' });
      if (d.social.instagram) socialBtns.push({ title: 'Instagram', url: d.social.instagram, style: 'outline' });
      if (d.social.website) socialBtns.push({ title: 'Website', url: d.social.website, style: 'solid' });
    }
    if (socialBtns.length > 0) {
      blocks.push({
        id: genId('btn'),
        type: 'buttons',
        buttons: socialBtns,
        layout: 'column',
        align: 'center'
      });
    }
    return blocks;
  }

  // Exact Carrd.co Default Starter
  return [
    {
      id: genId('txt'),
      type: 'text',
      content: 'My Untitled Site',
      style: 'h1',
      align: 'left'
    },
    {
      id: genId('txt'),
      type: 'text',
      content: "There's nothing here yet (well, except for this message), but clicking on the \"+\" button in the menu above should change that. Have fun! :)",
      style: 'body',
      align: 'left'
    }
  ];
}

// ===================== CARD RENDERING =====================

function renderCarrdCard() {
  const card = document.getElementById('carrdSiteCard');
  if (!card) return;

  card.innerHTML = '';

  if (activeBlocks.length === 0) {
    card.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:#94a3b8; border:2px dashed #cbd5e1; border-radius:6px;">
        <p style="margin:0; font-size:14px;">Canvas is empty. Click the <strong>+</strong> button at the top to add elements.</p>
      </div>
    `;
    return;
  }

  activeBlocks.forEach(b => {
    const blockEl = document.createElement('div');
    blockEl.className = 'canvas-block' + (b.id === selectedBlockId ? ' selected' : '');
    blockEl.id = 'block_' + b.id;
    blockEl.onclick = (e) => {
      e.stopPropagation();
      selectBlock(b.id);
    };

    let html = '';

    if (b.type === 'text') {
      const alignClass = 'align-' + (b.align || 'left');
      const styleClass = 'style-' + (b.style || 'body');
      const colorAttr = b.color ? `style="color:${esc(b.color)}"` : '';
      html = `<div class="block-text ${alignClass} ${styleClass}" ${colorAttr}>${esc(b.content || '')}</div>`;
    }
    else if (b.type === 'image') {
      const alignClass = 'align-' + (b.align || 'center');
      const sizeClass = 'size-' + (b.size || 'medium');
      const radiusClass = 'radius-' + (b.radius || 'rounded');
      const imgUrl = b.url || 'logo.png';
      const imgTag = `<img src="${esc(imgUrl)}" alt="Image" loading="lazy">`;
      const linkedImg = b.link ? `<a href="${esc(b.link)}" target="_blank" onclick="event.preventDefault()">${imgTag}</a>` : imgTag;
      const captionTag = b.caption ? `<div class="block-image-caption">${esc(b.caption)}</div>` : '';

      html = `
        <div class="block-image-wrap ${alignClass} ${sizeClass} ${radiusClass}">
          <div class="block-image-content">
            ${linkedImg}
            ${captionTag}
          </div>
        </div>
      `;
    }
    else if (b.type === 'buttons') {
      const layoutClass = 'layout-' + (b.layout || 'column');
      const alignClass = 'align-' + (b.align || 'center');
      const btnsHtml = (b.buttons || []).map(btn => {
        const btnStyle = 'btn-' + (btn.style || 'solid');
        return `<a href="${esc(btn.url || '#')}" class="block-btn-item ${btnStyle}" onclick="event.preventDefault()">${esc(btn.title || 'Button')}</a>`;
      }).join('');

      html = `<div class="block-buttons ${layoutClass} ${alignClass}">${btnsHtml}</div>`;
    }
    else if (b.type === 'gallery') {
      const cols = b.cols || 3;
      const imgs = b.images || ['logo.png', 'logo.png', 'logo.png'];
      const imgsHtml = imgs.map(img => `
        <div style="aspect-ratio:1; overflow:hidden; border-radius:6px; background:#f1f5f9;">
          <img src="${esc(img)}" style="width:100%; height:100%; object-fit:cover;">
        </div>
      `).join('');
      html = `<div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:12px; width:100%;">${imgsHtml}</div>`;
    }
    else if (b.type === 'video') {
      const videoUrl = b.url || 'promo-video.mp4';
      let mediaTag = '';
      if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
        const embedUrl = getYouTubeEmbedUrl(videoUrl);
        mediaTag = `<iframe src="${embedUrl}" allowfullscreen></iframe>`;
      } else {
        mediaTag = `<video src="${esc(videoUrl)}" autoplay loop muted playsinline></video>`;
      }
      html = `<div class="block-video">${mediaTag}</div>`;
    }
    else if (b.type === 'divider') {
      const styleClass = 'style-' + (b.style || 'line');
      html = `<div class="block-divider ${styleClass}"><hr></div>`;
    }
    else if (b.type === 'icons') {
      const iconsList = b.icons || [
        { name: 'Instagram', url: '#' },
        { name: 'GitHub', url: '#' },
        { name: 'Website', url: '#' }
      ];
      const iconsHtml = iconsList.map(ic => `
        <a href="${esc(ic.url)}" class="profile-socials" onclick="event.preventDefault()" style="display:inline-flex; padding:6px 14px; background:#f1f5f9; border-radius:999px; text-decoration:none; font-size:12px; font-weight:600; color:#334155;">
          ${esc(ic.name)}
        </a>
      `).join('');
      html = `<div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:${b.align || 'center'}; width:100%;">${iconsHtml}</div>`;
    }

    blockEl.innerHTML = html;
    card.appendChild(blockEl);
  });
}

// ===================== ELEMENT INTERACTION & SELECTION =====================

function selectBlock(id) {
  selectedBlockId = id;
  renderCarrdCard();
  openBlockDrawer(id);
}

function handleCanvasClick(e) {
  if (e.target.id === 'carrdCanvasWrapper' || e.target.id === 'carrdSiteCard') {
    closeAddMenu();
  }
}

function openBlockDrawer(id) {
  const block = activeBlocks.find(b => b.id === id);
  if (!block) return;

  closeDrawer(); // Close settings drawer if open

  const drawer = document.getElementById('carrdPropDrawer');
  const titleEl = document.getElementById('drawerTitle');
  const bodyEl = document.getElementById('drawerBody');

  let typeLabel = block.type.toUpperCase();
  titleEl.innerHTML = `<span style="color:#60a5fa;">#</span> ${typeLabel}`;
  bodyEl.innerHTML = getDrawerFormHtml(block);

  drawer.classList.add('open');
}

function closeDrawer() {
  document.getElementById('carrdPropDrawer').classList.remove('open');
  document.getElementById('carrdPageDrawer').classList.remove('open');
  selectedBlockId = null;
  renderCarrdCard();
}

function getDrawerFormHtml(b) {
  if (b.type === 'text') {
    return `
      <div class="carrd-field">
        <label>Text Content</label>
        <textarea class="carrd-textarea" rows="4" placeholder="Enter text..." oninput="updateActiveBlockProp('content', this.value)">${esc(b.content || '')}</textarea>
      </div>
      <div class="carrd-field">
        <label>Type / Style</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('style', this.value)">
          <option value="h1" ${b.style==='h1'?'selected':''}>Heading 1 (Main Title)</option>
          <option value="h2" ${b.style==='h2'?'selected':''}>Heading 2 (Subtitle)</option>
          <option value="h3" ${b.style==='h3'?'selected':''}>Heading 3 (Section)</option>
          <option value="body" ${b.style==='body'?'selected':''}>Paragraph (Body)</option>
          <option value="quote" ${b.style==='quote'?'selected':''}>Quote</option>
        </select>
      </div>
      <div class="carrd-field">
        <label>Alignment</label>
        <div class="carrd-segmented-control">
          <button class="${b.align==='left'||!b.align?'active':''}" onclick="updateActiveBlockProp('align', 'left')">Left</button>
          <button class="${b.align==='center'?'active':''}" onclick="updateActiveBlockProp('align', 'center')">Center</button>
          <button class="${b.align==='right'?'active':''}" onclick="updateActiveBlockProp('align', 'right')">Right</button>
        </div>
      </div>
      <div class="carrd-field">
        <label>Custom Text Color</label>
        <input type="color" class="carrd-input" value="${b.color || '#09090b'}" onchange="updateActiveBlockProp('color', this.value)" style="height:38px; cursor:pointer;">
      </div>
    `;
  }
  else if (b.type === 'image') {
    return `
      <div class="carrd-field">
        <label>Upload Image File</label>
        <input type="file" accept="image/*" class="carrd-input" onchange="handleImageFileUpload(event)">
      </div>
      <div class="carrd-field">
        <label>Or Image Link (URL)</label>
        <input type="url" class="carrd-input" value="${esc(b.url || '')}" placeholder="https://..." oninput="updateActiveBlockProp('url', this.value)">
      </div>
      <div class="carrd-field">
        <label>Size</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('size', this.value)">
          <option value="full" ${b.size==='full'?'selected':''}>Full Width (100%)</option>
          <option value="large" ${b.size==='large'?'selected':''}>Large (75%)</option>
          <option value="medium" ${b.size==='medium'?'selected':''}>Medium (50%)</option>
          <option value="small" ${b.size==='small'?'selected':''}>Small (220px)</option>
          <option value="avatar" ${b.size==='avatar'?'selected':''}>Avatar Circle (120px)</option>
        </select>
      </div>
      <div class="carrd-field">
        <label>Corner Shape</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('radius', this.value)">
          <option value="rounded" ${b.radius==='rounded'?'selected':''}>Rounded Corners</option>
          <option value="none" ${b.radius==='none'?'selected':''}>Square (0)</option>
          <option value="circle" ${b.radius==='circle'?'selected':''}>Circle / Pill</option>
        </select>
      </div>
      <div class="carrd-field">
        <label>Alignment</label>
        <div class="carrd-segmented-control">
          <button class="${b.align==='left'?'active':''}" onclick="updateActiveBlockProp('align', 'left')">Left</button>
          <button class="${b.align==='center'||!b.align?'active':''}" onclick="updateActiveBlockProp('align', 'center')">Center</button>
          <button class="${b.align==='right'?'active':''}" onclick="updateActiveBlockProp('align', 'right')">Right</button>
        </div>
      </div>
      <div class="carrd-field">
        <label>Click URL (Optional)</label>
        <input type="url" class="carrd-input" value="${esc(b.link || '')}" placeholder="https://..." oninput="updateActiveBlockProp('link', this.value)">
      </div>
    `;
  }
  else if (b.type === 'buttons') {
    const btns = b.buttons || [];
    const btnsHtml = btns.map((btn, idx) => `
      <div style="background:#141722; padding:10px; border-radius:6px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.06); position:relative;">
        <button style="position:absolute; top:6px; right:6px; background:none; border:none; color:#ef4444; cursor:pointer;" onclick="removeButtonFromActiveBlock(${idx})">✕</button>
        <input type="text" class="carrd-input" placeholder="Button Title" value="${esc(btn.title)}" oninput="updateButtonInActiveBlock(${idx}, 'title', this.value)" style="margin-bottom:6px;">
        <input type="url" class="carrd-input" placeholder="https://" value="${esc(btn.url)}" oninput="updateButtonInActiveBlock(${idx}, 'url', this.value)" style="margin-bottom:6px;">
        <select class="carrd-select" onchange="updateButtonInActiveBlock(${idx}, 'style', this.value)">
          <option value="solid" ${btn.style==='solid'?'selected':''}>Solid Brand</option>
          <option value="outline" ${btn.style==='outline'?'selected':''}>Outline</option>
          <option value="ghost" ${btn.style==='ghost'?'selected':''}>Ghost</option>
        </select>
      </div>
    `).join('');

    return `
      <div class="carrd-field">
        <label>Buttons</label>
        ${btnsHtml}
        <button class="btn btn-ghost" style="width:100%; font-size:12px; padding:6px; border:1px dashed rgba(255,255,255,0.15);" onclick="addButtonToActiveBlock()">+ Add Another Button</button>
      </div>
      <div class="carrd-field">
        <label>Layout</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('layout', this.value)">
          <option value="column" ${b.layout==='column'?'selected':''}>Vertical Stack</option>
          <option value="row" ${b.layout==='row'?'selected':''}>Horizontal Row</option>
        </select>
      </div>
    `;
  }
  else if (b.type === 'video') {
    return `
      <div class="carrd-field">
        <label>Video URL (YouTube or MP4)</label>
        <input type="url" class="carrd-input" value="${esc(b.url || '')}" placeholder="https://..." oninput="updateActiveBlockProp('url', this.value)">
      </div>
    `;
  }
  else if (b.type === 'divider') {
    return `
      <div class="carrd-field">
        <label>Divider Style</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('style', this.value)">
          <option value="line" ${b.style==='line'?'selected':''}>Solid Line</option>
          <option value="dashed" ${b.style==='dashed'?'selected':''}>Dashed</option>
          <option value="dots" ${b.style==='dots'?'selected':''}>Dots Center</option>
          <option value="space" ${b.style==='space'?'selected':''}>Blank Space Gap</option>
        </select>
      </div>
    `;
  }
  else if (b.type === 'gallery') {
    return `
      <div class="carrd-field">
        <label>Columns</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('cols', parseInt(this.value))">
          <option value="2" ${b.cols===2?'selected':''}>2 Columns</option>
          <option value="3" ${b.cols===3||!b.cols?'selected':''}>3 Columns</option>
          <option value="4" ${b.cols===4?'selected':''}>4 Columns</option>
        </select>
      </div>
    `;
  }
  else if (b.type === 'icons') {
    return `
      <div class="carrd-field">
        <label>Social Icons</label>
        <p style="font-size:12px; color:#94a3b8; margin:0;">Displays your connected social profiles.</p>
      </div>
    `;
  }
  return '';
}

function updateActiveBlockProp(prop, value) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block) return;
  block[prop] = value;
  renderCarrdCard();
}

function handleImageFileUpload(e) {
  const file = e.target.files[0];
  if (!file || !selectedBlockId) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    updateActiveBlockProp('url', event.target.result);
    openBlockDrawer(selectedBlockId); // refresh preview in drawer
  };
  reader.readAsDataURL(file);
}

function addButtonToActiveBlock() {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block) return;
  if (!block.buttons) block.buttons = [];
  block.buttons.push({ title: 'New Button', url: 'https://', style: 'solid' });
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function removeButtonFromActiveBlock(idx) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.buttons) return;
  block.buttons.splice(idx, 1);
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function updateButtonInActiveBlock(idx, prop, value) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.buttons || !block.buttons[idx]) return;
  block.buttons[idx][prop] = value;
  renderCarrdCard();
}

function moveActiveBlock(direction) {
  if (!selectedBlockId) return;
  const idx = activeBlocks.findIndex(b => b.id === selectedBlockId);
  if (idx === -1) return;
  const targetIdx = idx + direction;
  if (targetIdx < 0 || targetIdx >= activeBlocks.length) return;

  const temp = activeBlocks[idx];
  activeBlocks[idx] = activeBlocks[targetIdx];
  activeBlocks[targetIdx] = temp;

  pushHistory();
  renderCarrdCard();
}

function deleteActiveBlock() {
  if (!selectedBlockId) return;
  activeBlocks = activeBlocks.filter(b => b.id !== selectedBlockId);
  selectedBlockId = null;
  pushHistory();
  closeDrawer();
  renderCarrdCard();
}

// ===================== ADD ELEMENTS MENU =====================

function toggleAddMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById('carrdAddMenu');
  menu.classList.toggle('show');
}

function closeAddMenu() {
  const menu = document.getElementById('carrdAddMenu');
  if (menu) menu.classList.remove('show');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('#carrdToolbar') && !e.target.closest('#carrdAddMenu')) {
    closeAddMenu();
  }
});

function insertNewElement(type) {
  closeAddMenu();

  const newId = genId(type.substring(0, 3));
  let newBlock = { id: newId, type: type };

  if (type === 'text') {
    newBlock.content = 'New Heading or Text';
    newBlock.style = 'h2';
    newBlock.align = 'left';
  } else if (type === 'image') {
    newBlock.url = 'logo.png';
    newBlock.size = 'medium';
    newBlock.radius = 'rounded';
    newBlock.align = 'center';
  } else if (type === 'buttons') {
    newBlock.buttons = [{ title: 'Get Started', url: 'https://', style: 'solid' }];
    newBlock.layout = 'column';
    newBlock.align = 'center';
  } else if (type === 'gallery') {
    newBlock.cols = 3;
    newBlock.images = ['logo.png', 'logo.png', 'logo.png'];
  } else if (type === 'video') {
    newBlock.url = 'promo-video.mp4';
  } else if (type === 'divider') {
    newBlock.style = 'line';
  } else if (type === 'icons') {
    newBlock.align = 'center';
  }

  activeBlocks.push(newBlock);
  pushHistory();
  renderCarrdCard();
  selectBlock(newId);
}

// ===================== PAGE SETTINGS =====================

function openPageSettingsDrawer() {
  closeDrawer();
  document.getElementById('carrdPageDrawer').classList.add('open');
}

function initPageSettingsInputs() {
  if (pageSettings.siteTitle) document.getElementById('settingSiteTitle').value = pageSettings.siteTitle;
  if (pageSettings.cardWidth) document.getElementById('settingCardWidth').value = pageSettings.cardWidth;
  if (pageSettings.cardRadius) document.getElementById('settingCardRadius').value = pageSettings.cardRadius;
  if (pageSettings.font) document.getElementById('settingFont').value = pageSettings.font;
  if (pageSettings.bg) document.getElementById('settingBgColor').value = pageSettings.bg;
  if (pageSettings.cardBg) document.getElementById('settingCardBgColor').value = pageSettings.cardBg;
  if (pageSettings.primary) document.getElementById('settingPrimaryColor').value = pageSettings.primary;
}

function updatePageSetting(key, value) {
  pageSettings[key] = value;
  applyPageSettings(pageSettings);
}

function applyPageSettings(s) {
  const root = document.documentElement;
  if (s.cardWidth) root.style.setProperty('--card-max-width', s.cardWidth);
  if (s.cardRadius) root.style.setProperty('--card-radius', s.cardRadius);
  if (s.bg) root.style.setProperty('--carrd-bg', s.bg);
  if (s.cardBg) root.style.setProperty('--card-bg', s.cardBg);
  if (s.primary) root.style.setProperty('--primary', s.primary);
  if (s.font) root.style.setProperty('font-family', s.font);
}

function resetToCarrdStarter() {
  if (confirm('Reset your canvas to the blank Carrd starter layout?')) {
    activeBlocks = [
      {
        id: genId('txt'),
        type: 'text',
        content: 'My Untitled Site',
        style: 'h1',
        align: 'left'
      },
      {
        id: genId('txt'),
        type: 'text',
        content: "There's nothing here yet (well, except for this message), but clicking on the \"+\" button in the menu above should change that. Have fun! :)",
        style: 'body',
        align: 'left'
      }
    ];
    pushHistory();
    renderCarrdCard();
    closeDrawer();
  }
}

// ===================== MOBILE PREVIEW & PUBLISH =====================

function toggleMobilePreview() {
  const btn = document.getElementById('btnMobilePreview');
  document.body.classList.toggle('mobile-preview-mode');
  btn.classList.toggle('active');
  const isMobile = document.body.classList.contains('mobile-preview-mode');
  showToast(isMobile ? 'Mobile Preview Mode (375px)' : 'Desktop View', 'info');
}

function saveAndPublish() {
  if (!userRef) return;

  userRef.update({
    customBlocks: activeBlocks,
    pageSettings: pageSettings
  }).then(() => {
    const portfolioUrl = window.location.origin + '/portfolio.html?id=' + targetUid;
    navigator.clipboard.writeText(portfolioUrl).then(() => {
      showToast('Published! Public portfolio link copied to clipboard 🔗', 'success');
    }).catch(() => {
      showToast('Published successfully!', 'success');
    });
  }).catch(err => {
    showToast('Error saving: ' + err.message, 'error');
  });
}

function getYouTubeEmbedUrl(url) {
  let videoId = '';
  if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
  else if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1].split('&')[0];
  return videoId ? 'https://www.youtube.com/embed/' + videoId : url;
}

function genId(prefix) {
  return prefix + '_' + Math.random().toString(36).substr(2, 7);
}

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

function renderGuestMode() {
  document.getElementById('carrdSiteCard').innerHTML = '<div style="text-align:center; padding:60px;"><h3>Guest Mode</h3><p>Please log in to edit and publish your site.</p></div>';
}
