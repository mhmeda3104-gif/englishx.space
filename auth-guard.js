// =============================================
// AUTH GUARD + FIREBASE SYNC — Space Academy
// =============================================

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBydQb6wDh4X7JA0JkcuhToJam66VD3bTM",
    authDomain: "englishx-ed1c6.firebaseapp.com",
    projectId: "englishx-ed1c6",
    storageBucket: "englishx-ed1c6.firebasestorage.app",
    messagingSenderId: "570756105739",
    appId: "1:570756105739:web:69c4b5edd62cc34c56290e"
  };

  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.fbAuth = firebase.auth();
  window.fbDb  = firebase.database();

  // ── Auth State ──
  fbAuth.onAuthStateChanged(async user => {
    // Allow guest mode — skip auth check
    if (sessionStorage.getItem('guestMode') === 'true') return;

    if (!user) {
      sessionStorage.setItem('authRedirect',
        window.location.pathname.split('/').pop() || 'index.html');
      window.location.href = 'auth.html';
      return;
    }
    window.currentUser = user;

    // Inject navbar user info
    injectUserNav(user);

    // Load user data from Firebase
    try {
      const snap = await fbDb.ref('users/' + user.uid).once('value');
      if (snap.exists()) {
        const data = snap.val();
        applyUserData(user, data);
      } else {
        // New user — initialize profile only
        applyUserData(user, null);
      }
    } catch (e) {
      console.warn('Firebase load error:', e);
      applyUserData(user, null);
    }
  });

  // ── Apply Firebase data → AppState + UI ──
  function applyUserData(user, data) {
    // Wait for AppState to be ready
    function trySync() {
      if (!window.AppState) { setTimeout(trySync, 50); return; }

      if (data) {
        AppState.xp               = data.xp               || 0;
        AppState.level            = data.level             || 1;
        AppState.streak           = data.streak            || 0;
        AppState.lastStudied      = data.lastStudied       || null;
        AppState.completedLessons = data.completedLessons  || [];
        AppState.quizScores       = data.quizScores        || [];
        AppState.gamesPlayed      = data.gamesPlayed       || 0;
      }

      // Update AppState UI
      if (typeof AppState.updateUI === 'function') AppState.updateUI();

      // Update dashboard-specific elements
      updateDashboardProfile(user, data);

      // Hook into AppState.save() to auto-sync Firebase
      hookSave();

      // Call dashboard render if available
      if (typeof updateDashboard === 'function') updateDashboard();
      if (typeof checkAchievements === 'function') checkAchievements();
    }
    trySync();
  }

  // ── Override AppState.save() to also save to Firebase ──
  function hookSave() {
    if (!window.AppState || AppState.__fbHooked) return;
    const _original = AppState.save.bind(AppState);
    AppState.save = function () {
      _original();           // keep localStorage
      saveToFirebase();      // also Firebase
    };
    AppState.__fbHooked = true;
  }

  // ── Save to Firebase ──
  window.saveToFirebase = function () {
    if (!window.currentUser || !window.AppState) return;
    fbDb.ref('users/' + currentUser.uid).update({
      xp:               AppState.xp               || 0,
      level:            AppState.level             || 1,
      streak:           AppState.streak            || 0,
      lastStudied:      AppState.lastStudied       || null,
      completedLessons: AppState.completedLessons  || [],
      quizScores:       AppState.quizScores        || [],
      gamesPlayed:      AppState.gamesPlayed       || 0,
      lastUpdated:      Date.now()
    }).catch(e => console.warn('Firebase save error:', e));
  };

  // ── Update Dashboard Profile Card ──
  function updateDashboardProfile(user, data) {
    const name = (data && data.name) || user.displayName || user.email.split('@')[0] || 'Learner';

    // Profile name
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) profileNameEl.textContent = name;

    // Welcome message
    const mainTitle = document.querySelector('.main-title');
    if (mainTitle) mainTitle.textContent = `Welcome back, ${name.split(' ')[0]}! 👋`;

    // Avatar
    const avatarEl = document.getElementById('avatarEl');
    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="${name}">`;
      } else {
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        avatarEl.style.cssText = 'background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;border-radius:50%;';
        avatarEl.textContent = initials;
      }
    }
  }

  // ── Logout ──
  window.logoutUser = async function () {
    await fbAuth.signOut();
    window.location.href = 'auth.html';
  };

  // ── Reset Progress (also clears Firebase) ──
  window.resetProgressFirebase = function () {
    if (!window.currentUser) return;
    fbDb.ref('users/' + currentUser.uid).update({
      xp: 0, level: 1, streak: 0,
      lastStudied: null,
      completedLessons: [],
      quizScores: [],
      gamesPlayed: 0
    });
  };

  // ── Inject Navbar User Avatar ──
  function injectUserNav(user) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    const old = document.getElementById('userNavItem');
    if (old) old.remove();

    const li = document.createElement('li');
    li.id = 'userNavItem';

    const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
    const photoHTML = user.photoURL
      ? `<img src="${user.photoURL}" class="user-avatar-img" alt="${initial}">`
      : `<div class="user-avatar-initial">${initial}</div>`;

    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-left:8px">
        <span class="user-avatar-btn">
          ${photoHTML}
          <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px">
            ${user.displayName || user.email.split('@')[0]}
          </span>
        </span>
        <button class="logout-btn" onclick="logoutUser()">Sign Out</button>
      </div>`;

    navLinks.appendChild(li);
  }

})();
