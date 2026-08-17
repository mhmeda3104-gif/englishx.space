// =============================================
// AUTH GUARD — ESTL Tech
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
  fbAuth.onAuthStateChanged(user => {
    // Allow guest mode — skip auth check
    if (sessionStorage.getItem('guestMode') === 'true') {
      window.currentUser = null;
      return;
    }

    if (!user) {
      const currentPath = window.location.pathname.split('/').pop();
      if (currentPath !== 'auth.html' && currentPath !== 'index.html' && currentPath !== '') {
        sessionStorage.setItem('authRedirect', currentPath);
        window.location.href = 'auth.html';
      }
      return;
    }
    
    window.currentUser = user;

    // Inject user info into UI if available
    injectUserNav(user);
  });

  function injectUserNav(user) {
    const brandText = document.querySelector('.brand-text');
    if (brandText) {
      // Just a small touch, maybe show they are logged in if needed, but not strictly necessary here
    }
  }

})();
