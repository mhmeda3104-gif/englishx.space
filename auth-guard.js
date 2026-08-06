// =============================================
// AUTH GUARD + FIREBASE SYNC — Space Academy
// =============================================
// Include this script in every HTML page BEFORE app.js

(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyBydQb6wDh4X7JA0JkcuhToJam66VD3bTM",
    authDomain: "englishx-ed1c6.firebaseapp.com",
    projectId: "englishx-ed1c6",
    storageBucket: "englishx-ed1c6.firebasestorage.app",
    messagingSenderId: "570756105739",
    appId: "1:570756105739:web:69c4b5edd62cc34c56290e"
  };

  // Init Firebase (only once)
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  window.fbAuth = firebase.auth();
  window.fbDb = firebase.database();

  // ── Auth State Listener ──
  fbAuth.onAuthStateChanged(async user => {
    if (!user) {
      // Not logged in → redirect to auth page
      sessionStorage.setItem('authRedirect', window.location.pathname.split('/').pop() || 'index.html');
      window.location.href = 'auth.html';
      return;
    }

    // Store current user globally
    window.currentUser = user;

    // Inject user info into navbar
    injectUserNav(user);

    // Load user data from Firebase
    try {
      const snap = await fbDb.ref('users/' + user.uid).once('value');
      if (snap.exists()) {
        const data = snap.val();
        // Sync AppState when it's ready
        if (window.AppState) {
          syncAppState(data);
        } else {
          window.__pendingUserData = data;
        }
      }
    } catch (e) {
      console.warn('Could not load user data:', e);
    }
  });

  // ── Sync Firebase data → AppState ──
  function syncAppState(data) {
    if (!window.AppState) return;
    AppState.xp = data.xp || 0;
    AppState.level = data.level || 1;
    AppState.streak = data.streak || 0;
    AppState.lastStudied = data.lastStudied || null;
    AppState.completedLessons = data.completedLessons || [];
    AppState.quizScores = data.quizScores || [];
    AppState.gamesPlayed = data.gamesPlayed || 0;

    // Refresh UI if function exists
    if (typeof updateUI === 'function') updateUI();
    if (typeof renderDashboard === 'function') renderDashboard();
  }

  // ── Save AppState → Firebase ──
  window.saveToFirebase = function () {
    if (!window.currentUser || !window.AppState) return;
    fbDb.ref('users/' + currentUser.uid).update({
      xp: AppState.xp || 0,
      level: AppState.level || 1,
      streak: AppState.streak || 0,
      lastStudied: AppState.lastStudied || null,
      completedLessons: AppState.completedLessons || [],
      quizScores: AppState.quizScores || [],
      gamesPlayed: AppState.gamesPlayed || 0,
      lastUpdated: Date.now()
    }).catch(e => console.warn('Save error:', e));
  };

  // ── Logout ──
  window.logoutUser = async function () {
    await fbAuth.signOut();
    window.location.href = 'auth.html';
  };

  // ── Inject User Avatar in Navbar ──
  function injectUserNav(user) {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Remove old user nav if exists
    const old = document.getElementById('userNavItem');
    if (old) old.remove();

    const navLinks = navbar.querySelector('.nav-links');
    if (!navLinks) return;

    const li = document.createElement('li');
    li.id = 'userNavItem';

    const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
    const photoHTML = user.photoURL
      ? `<img src="${user.photoURL}" class="user-avatar-img" alt="${initial}">`
      : `<div class="user-avatar-initial">${initial}</div>`;

    li.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span class="user-avatar-btn">
          ${photoHTML}
          <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${user.displayName || user.email.split('@')[0]}
          </span>
        </span>
        <button class="logout-btn" onclick="logoutUser()">Sign Out</button>
      </div>
    `;
    navLinks.appendChild(li);
  }

  // ── Wait for AppState then sync ──
  document.addEventListener('DOMContentLoaded', () => {
    if (window.__pendingUserData && window.AppState) {
      syncAppState(window.__pendingUserData);
      window.__pendingUserData = null;
    }
  });

})();
