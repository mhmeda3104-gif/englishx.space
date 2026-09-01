// profile.js - Advanced Carrd.co Visual Builder with Rich Portfolio Blocks & Presets

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

    if (d.customBlocks && Array.isArray(d.customBlocks) && d.customBlocks.length > 0) {
      activeBlocks = d.customBlocks;
    } else {
      activeBlocks = createCarrdStarterBlocks(d);
    }

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
  if (d.name || d.bio || d.photoURL) {
    const blocks = [];
    // 1. Live status pill
    blocks.push({
      id: genId('sts'),
      type: 'status',
      text: '🟢 Open to new robotics & software projects',
      dotColor: '#10b981',
      align: 'center'
    });
    // 2. Avatar
    blocks.push({
      id: genId('img'),
      type: 'image',
      url: d.photoURL || 'logo.png',
      size: 'avatar',
      radius: 'circle',
      align: 'center'
    });
    // 3. Name & bio
    blocks.push({
      id: genId('txt'),
      type: 'text',
      content: d.name || 'Space Engineer',
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
    // 4. Skills Bar
    blocks.push({
      id: genId('skl'),
      type: 'skills',
      items: [
        { name: 'Embedded Systems & Arduino', percent: 90 },
        { name: 'Python & Robotics Control', percent: 85 },
        { name: 'PCB & Circuit Design', percent: 80 }
      ]
    });
    // 5. Buttons
    const socialBtns = [];
    if (d.social) {
      if (d.social.github) socialBtns.push({ title: 'GitHub', url: d.social.github, style: 'outline' });
      if (d.social.instagram) socialBtns.push({ title: 'Instagram', url: d.social.instagram, style: 'outline' });
      if (d.social.website) socialBtns.push({ title: 'Portfolio Website', url: d.social.website, style: 'solid' });
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
    else if (b.type === 'status') {
      const alignClass = 'align-' + (b.align || 'center');
      const dotColor = b.dotColor || '#10b981';
      html = `
        <div class="block-status-wrap ${alignClass}">
          <div class="block-status-pill">
            <span class="block-status-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span>
            <span>${esc(b.text || 'Open for projects')}</span>
          </div>
        </div>
      `;
    }
    else if (b.type === 'skills') {
      const items = b.items || [];
      const itemsHtml = items.map(sk => `
        <div class="block-skill-item">
          <div class="block-skill-info">
            <span>${esc(sk.name || 'Skill')}</span>
            <span>${sk.percent || 80}%</span>
          </div>
          <div class="block-skill-track">
            <div class="block-skill-bar" style="width: ${sk.percent || 80}%;"></div>
          </div>
        </div>
      `).join('');
      html = `<div class="block-skills-list">${itemsHtml}</div>`;
    }
    else if (b.type === 'code') {
      const lang = b.lang || 'cpp';
      const code = b.code || '// ESTL Robotics Code\nvoid setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n}';
      html = `
        <div class="block-code">
          <div class="block-code-header">
            <span class="block-code-lang">${esc(lang)}</span>
            <button class="block-code-copy-btn" onclick="copyCodeSnippet(event, this)">📋 Copy</button>
          </div>
          <pre><code>${esc(code)}</code></pre>
        </div>
      `;
    }
    else if (b.type === 'contact') {
      html = `
        <div class="block-contact-form" onclick="event.stopPropagation()">
          <h4 style="margin:0 0 4px; font-size:14px; font-weight:700;">${esc(b.title || 'Send a Message')}</h4>
          <input type="text" placeholder="Your Name" disabled style="cursor:not-allowed;">
          <input type="email" placeholder="Your Email" disabled style="cursor:not-allowed;">
          <textarea rows="3" placeholder="Your message..." disabled style="cursor:not-allowed;"></textarea>
          <button class="block-contact-btn" disabled style="cursor:not-allowed;">${esc(b.btnText || 'Send Message')}</button>
        </div>
      `;
    }
    else if (b.type === 'github') {
      const username = b.username || 'mhmeda3104-gif';
      html = `
        <div class="block-github-card">
          <div class="block-github-header">
            <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <div>
              <a href="https://github.com/${esc(username)}" target="_blank" class="block-github-user">@${esc(username)}</a>
              <div style="font-size:11px; color:#8b949e;">GitHub Developer Profile</div>
            </div>
          </div>
          <div class="block-github-grid">
            <div>
              <div class="block-github-stat-num">24+</div>
              <div class="block-github-stat-label">Repositories</div>
            </div>
            <div>
              <div class="block-github-stat-num">120+</div>
              <div class="block-github-stat-label">Contributions</div>
            </div>
            <div>
              <div class="block-github-stat-num">5★</div>
              <div class="block-github-stat-label">Stars</div>
            </div>
          </div>
        </div>
      `;
    }
    else if (b.type === 'faq') {
      const items = b.items || [
        { q: 'What engineering services do you provide?', a: 'Robotics design, Arduino/ESP32 programming, IoT dashboards, and circuit prototyping.' },
        { q: 'How can we collaborate?', a: 'Send a message through the contact form or connect via GitHub/Instagram.' }
      ];
      const faqHtml = items.map((item, fIdx) => `
        <div class="block-faq-item ${item.open ? 'open' : ''}" onclick="toggleFaqItem(event, '${b.id}', ${fIdx})">
          <div class="block-faq-question">
            <span>${esc(item.q)}</span>
            <span style="font-size:12px;">${item.open ? '▲' : '▼'}</span>
          </div>
          <div class="block-faq-answer">${esc(item.a)}</div>
        </div>
      `).join('');
      html = `<div class="block-faq-list">${faqHtml}</div>`;
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

function copyCodeSnippet(e, btn) {
  e.stopPropagation();
  const codeEl = btn.closest('.block-code').querySelector('code');
  if (codeEl) {
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      btn.innerText = '✓ Copied';
      setTimeout(() => btn.innerText = '📋 Copy', 2000);
    });
  }
}

function toggleFaqItem(e, blockId, itemIdx) {
  e.stopPropagation();
  const block = activeBlocks.find(b => b.id === blockId);
  if (!block || !block.items || !block.items[itemIdx]) return;
  block.items[itemIdx].open = !block.items[itemIdx].open;
  renderCarrdCard();
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

  closeDrawer();

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
  else if (b.type === 'status') {
    return `
      <div class="carrd-field">
        <label>Status Text</label>
        <input type="text" class="carrd-input" value="${esc(b.text || '')}" placeholder="🟢 Available for projects..." oninput="updateActiveBlockProp('text', this.value)">
      </div>
      <div class="carrd-field">
        <label>Dot Color</label>
        <input type="color" class="carrd-input" value="${b.dotColor || '#10b981'}" onchange="updateActiveBlockProp('dotColor', this.value)" style="height:38px; cursor:pointer;">
      </div>
      <div class="carrd-field">
        <label>Alignment</label>
        <div class="carrd-segmented-control">
          <button class="${b.align==='left'?'active':''}" onclick="updateActiveBlockProp('align', 'left')">Left</button>
          <button class="${b.align==='center'||!b.align?'active':''}" onclick="updateActiveBlockProp('align', 'center')">Center</button>
          <button class="${b.align==='right'?'active':''}" onclick="updateActiveBlockProp('align', 'right')">Right</button>
        </div>
      </div>
    `;
  }
  else if (b.type === 'skills') {
    const items = b.items || [];
    const itemsHtml = items.map((sk, idx) => `
      <div style="background:#141722; padding:8px; border-radius:6px; margin-bottom:6px; position:relative;">
        <button style="position:absolute; top:4px; right:4px; background:none; border:none; color:#ef4444; cursor:pointer;" onclick="removeSkillItem(${idx})">✕</button>
        <input type="text" class="carrd-input" placeholder="Skill Name (e.g. Arduino)" value="${esc(sk.name)}" oninput="updateSkillItem(${idx}, 'name', this.value)" style="margin-bottom:4px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="range" min="10" max="100" value="${sk.percent || 80}" oninput="updateSkillItem(${idx}, 'percent', this.value)" style="flex:1;">
          <span style="font-size:12px; color:#94a3b8; width:35px;">${sk.percent || 80}%</span>
        </div>
      </div>
    `).join('');
    return `
      <div class="carrd-field">
        <label>Skills Progress List</label>
        ${itemsHtml}
        <button class="btn btn-ghost" style="width:100%; font-size:12px; padding:6px; border:1px dashed rgba(255,255,255,0.15);" onclick="addSkillItem()">+ Add Skill</button>
      </div>
    `;
  }
  else if (b.type === 'code') {
    return `
      <div class="carrd-field">
        <label>Language</label>
        <select class="carrd-select" onchange="updateActiveBlockProp('lang', this.value)">
          <option value="cpp" ${b.lang==='cpp'?'selected':''}>C++ / Arduino</option>
          <option value="python" ${b.lang==='python'?'selected':''}>Python</option>
          <option value="javascript" ${b.lang==='javascript'?'selected':''}>JavaScript</option>
          <option value="rust" ${b.lang==='rust'?'selected':''}>Rust</option>
          <option value="json" ${b.lang==='json'?'selected':''}>JSON / Config</option>
        </select>
      </div>
      <div class="carrd-field">
        <label>Code Snippet</label>
        <textarea class="carrd-textarea" rows="6" style="font-family:monospace; font-size:12px;" oninput="updateActiveBlockProp('code', this.value)">${esc(b.code || '')}</textarea>
      </div>
    `;
  }
  else if (b.type === 'github') {
    return `
      <div class="carrd-field">
        <label>GitHub Username</label>
        <input type="text" class="carrd-input" value="${esc(b.username || '')}" placeholder="username" oninput="updateActiveBlockProp('username', this.value)">
      </div>
    `;
  }
  else if (b.type === 'faq') {
    const items = b.items || [];
    const itemsHtml = items.map((it, idx) => `
      <div style="background:#141722; padding:8px; border-radius:6px; margin-bottom:6px; position:relative;">
        <button style="position:absolute; top:4px; right:4px; background:none; border:none; color:#ef4444; cursor:pointer;" onclick="removeFaqItem(${idx})">✕</button>
        <input type="text" class="carrd-input" placeholder="Question" value="${esc(it.q)}" oninput="updateFaqItemField(${idx}, 'q', this.value)" style="margin-bottom:4px;">
        <textarea class="carrd-textarea" rows="2" placeholder="Answer" oninput="updateFaqItemField(${idx}, 'a', this.value)">${esc(it.a)}</textarea>
      </div>
    `).join('');
    return `
      <div class="carrd-field">
        <label>Questions & Answers</label>
        ${itemsHtml}
        <button class="btn btn-ghost" style="width:100%; font-size:12px; padding:6px; border:1px dashed rgba(255,255,255,0.15);" onclick="addFaqItem()">+ Add Q&A Item</button>
      </div>
    `;
  }
  else if (b.type === 'contact') {
    return `
      <div class="carrd-field">
        <label>Form Title</label>
        <input type="text" class="carrd-input" value="${esc(b.title || '')}" placeholder="Send a Message" oninput="updateActiveBlockProp('title', this.value)">
      </div>
      <div class="carrd-field">
        <label>Submit Button Text</label>
        <input type="text" class="carrd-input" value="${esc(b.btnText || '')}" placeholder="Send Message" oninput="updateActiveBlockProp('btnText', this.value)">
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
    openBlockDrawer(selectedBlockId);
  };
  reader.readAsDataURL(file);
}

function addSkillItem() {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block) return;
  if (!block.items) block.items = [];
  block.items.push({ name: 'New Skill', percent: 80 });
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function removeSkillItem(idx) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.items) return;
  block.items.splice(idx, 1);
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function updateSkillItem(idx, prop, value) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.items || !block.items[idx]) return;
  block.items[idx][prop] = prop === 'percent' ? parseInt(value) : value;
  renderCarrdCard();
}

function addFaqItem() {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block) return;
  if (!block.items) block.items = [];
  block.items.push({ q: 'New Question?', a: 'Write the answer here.' });
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function removeFaqItem(idx) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.items) return;
  block.items.splice(idx, 1);
  renderCarrdCard();
  openBlockDrawer(selectedBlockId);
}

function updateFaqItemField(idx, prop, value) {
  if (!selectedBlockId) return;
  const block = activeBlocks.find(b => b.id === selectedBlockId);
  if (!block || !block.items || !block.items[idx]) return;
  block.items[idx][prop] = value;
  renderCarrdCard();
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
  } else if (type === 'status') {
    newBlock.text = '🟢 Open for freelance & projects';
    newBlock.dotColor = '#10b981';
    newBlock.align = 'center';
  } else if (type === 'skills') {
    newBlock.items = [
      { name: 'Robotics & Microcontrollers', percent: 90 },
      { name: 'Embedded C & Python', percent: 85 }
    ];
  } else if (type === 'code') {
    newBlock.lang = 'cpp';
    newBlock.code = '// ESTL Robotics Code\nvoid setup() {\n  Serial.begin(115200);\n}';
  } else if (type === 'contact') {
    newBlock.title = 'Get in Touch';
    newBlock.btnText = 'Send Message';
  } else if (type === 'github') {
    newBlock.username = (profileData.social && profileData.social.github) ? profileData.social.github.split('/').pop() : 'mhmeda3104-gif';
  } else if (type === 'faq') {
    newBlock.items = [
      { q: 'What hardware platforms do you work with?', a: 'ESP32, Arduino, STM32, and Raspberry Pi.' }
    ];
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

// ===================== TEMPLATES PRESET SYSTEM =====================

function openTemplatesModal() {
  closeDrawer();
  document.getElementById('carrdTemplatesModal').classList.add('show');
}

function closeTemplatesModal(e) {
  if (e && e.target && e.target.id !== 'carrdTemplatesModal' && !e.target.closest('button')) return;
  document.getElementById('carrdTemplatesModal').classList.remove('show');
}

function applyStarterPreset(presetKey) {
  closeTemplatesModal();

  if (presetKey === 'robotics') {
    pageSettings = {
      siteTitle: 'Robotics & Hardware Lab',
      cardWidth: '760px',
      cardRadius: '12px',
      cardBg: '#ffffff',
      bg: '#0f172a',
      primary: '#2563eb',
      font: 'Inter, sans-serif'
    };
    activeBlocks = [
      { id: genId('sts'), type: 'status', text: '🟢 Designing Robotics & IoT Kits', dotColor: '#10b981', align: 'center' },
      { id: genId('img'), type: 'image', url: profileData.photoURL || 'logo.png', size: 'avatar', radius: 'circle', align: 'center' },
      { id: genId('txt'), type: 'text', content: profileData.name || 'Robotics Engineer', style: 'h1', align: 'center' },
      { id: genId('txt'), type: 'text', content: 'Specialized in Autonomous Rover Firmware, ROS2, and PCB Hardware Prototyping.', style: 'body', align: 'center' },
      { id: genId('skl'), type: 'skills', items: [
        { name: 'C++ & Embedded Systems', percent: 95 },
        { name: 'ROS2 & Micro-ROS', percent: 85 },
        { name: 'KiCAD & Hardware Prototyping', percent: 90 }
      ]},
      { id: genId('cde'), type: 'code', lang: 'cpp', code: '// Motor Controller Interrupt Driver\nvoid IRAM_ATTR onEncoderTick() {\n  encoderCount++;\n}' },
      { id: genId('btn'), type: 'buttons', buttons: [
        { title: 'Explore Store Components', url: 'shop.html', style: 'solid' },
        { title: 'View GitHub Projects', url: 'https://github.com', style: 'outline' }
      ], layout: 'row', align: 'center' }
    ];
  }
  else if (presetKey === 'minimal_bio') {
    pageSettings = {
      siteTitle: 'My Social Bio',
      cardWidth: '540px',
      cardRadius: '16px',
      cardBg: '#ffffff',
      bg: '#f8fafc',
      primary: '#09090b',
      font: 'Inter, sans-serif'
    };
    activeBlocks = [
      { id: genId('img'), type: 'image', url: profileData.photoURL || 'logo.png', size: 'avatar', radius: 'circle', align: 'center' },
      { id: genId('txt'), type: 'text', content: profileData.name || 'Alex Morgan', style: 'h1', align: 'center' },
      { id: genId('txt'), type: 'text', content: '@' + (profileData.username || 'engineer') + ' • Maker & Tech Enthusiast', style: 'h3', align: 'center' },
      { id: genId('btn'), type: 'buttons', buttons: [
        { title: 'Instagram Profile', url: 'https://instagram.com', style: 'solid' },
        { title: 'YouTube Tutorials', url: 'https://youtube.com', style: 'outline' },
        { title: 'GitHub Open Source', url: 'https://github.com', style: 'outline' }
      ], layout: 'column', align: 'center' }
    ];
  }
  else if (presetKey === 'corporate') {
    pageSettings = {
      siteTitle: 'Engineering Consultant',
      cardWidth: '720px',
      cardRadius: '8px',
      cardBg: '#ffffff',
      bg: '#e2e8f0',
      primary: '#1d4ed8',
      font: 'Inter, sans-serif'
    };
    activeBlocks = [
      { id: genId('sts'), type: 'status', text: '⚡ Available for Corporate Consulting', dotColor: '#3b82f6', align: 'left' },
      { id: genId('txt'), type: 'text', content: profileData.name || 'ESTL Senior Engineer', style: 'h1', align: 'left' },
      { id: genId('txt'), type: 'text', content: 'Delivering end-to-end industrial automation and firmware architecture for cutting-edge electronics.', style: 'body', align: 'left' },
      { id: genId('dvd'), type: 'divider', style: 'line' },
      { id: genId('faq'), type: 'faq', items: [
        { q: 'What is the consulting engagement process?', a: 'Initial architecture review, milestone-based hardware prototyping, and production verification.' },
        { q: 'Do you offer on-site workshops?', a: 'Yes, both remote and on-site engineering training sessions.' }
      ]},
      { id: genId('cnt'), type: 'contact', title: 'Schedule a Consultation', btnText: 'Send Inquiry' }
    ];
  }
  else if (presetKey === 'developer') {
    pageSettings = {
      siteTitle: 'Fullstack Maker',
      cardWidth: '780px',
      cardRadius: '10px',
      cardBg: '#ffffff',
      bg: '#09090b',
      primary: '#3b82f6',
      font: 'Inter, sans-serif'
    };
    activeBlocks = [
      { id: genId('img'), type: 'image', url: profileData.photoURL || 'logo.png', size: 'avatar', radius: 'circle', align: 'center' },
      { id: genId('txt'), type: 'text', content: profileData.name || 'Open Source Dev', style: 'h1', align: 'center' },
      { id: genId('gth'), type: 'github', username: (profileData.social && profileData.social.github) ? profileData.social.github.split('/').pop() : 'mhmeda3104-gif' },
      { id: genId('skl'), type: 'skills', items: [
        { name: 'JavaScript & Node.js', percent: 90 },
        { name: 'Firebase & Realtime Sync', percent: 95 }
      ]},
      { id: genId('cnt'), type: 'contact', title: 'Send Direct Message', btnText: 'Submit' }
    ];
  }

  initPageSettingsInputs();
  applyPageSettings(pageSettings);
  pushHistory();
  renderCarrdCard();
  showToast('Template applied successfully!', 'success');
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

// ===================== MOBILE PREVIEW & PUBLISH =====================

function toggleMobilePreview() {
  const btn = document.getElementById('btnMobilePreview');
  document.body.classList.toggle('mobile-preview-mode');
  btn.classList.toggle('active');
  const isMobile = document.body.classList.contains('mobile-preview-mode');
  showToast(isMobile ? 'Mobile View (375px)' : 'Desktop View', 'info');
}

function saveAndPublish() {
  if (!userRef) return;

  userRef.update({
    customBlocks: activeBlocks,
    pageSettings: pageSettings
  }).then(() => {
    const portfolioUrl = window.location.origin + '/portfolio.html?id=' + targetUid;
    navigator.clipboard.writeText(portfolioUrl).then(() => {
      showToast('Published! Public link copied to clipboard 🔗', 'success');
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
