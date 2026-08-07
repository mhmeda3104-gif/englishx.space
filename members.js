document.addEventListener('DOMContentLoaded', () => {
  // Theme is handled by app.js initTheme()

  // We need to wait for Firebase to initialize before fetching users
  // auth-guard.js might be checking auth state, but we don't strictly need the user to be logged in to view the leaderboard if guest mode is allowed.
  // We'll wait a brief moment for Firebase App to be ready, then fetch.
  setTimeout(fetchLeaderboard, 500);
});

async function fetchLeaderboard() {
  try {
    const usersRef = firebase.database().ref('users');
    
    // We want to order by XP, but Firebase Realtime DB ordering is ascending by default.
    // So we fetch ordered by 'xp' and then reverse it client-side.
    const snapshot = await usersRef.orderByChild('xp').once('value');
    
    if (!snapshot.exists()) {
      renderEmptyState();
      return;
    }

    const usersData = snapshot.val();
    let members = [];

    // Convert object to array
    for (let uid in usersData) {
      if (usersData.hasOwnProperty(uid)) {
        const user = usersData[uid];
        // Only add users who have a name/username
        if (user.username || user.name) {
          members.push({
            uid: uid,
            name: user.name || 'Unknown Explorer',
            username: user.username || 'user',
            xp: user.xp || 0,
            level: user.level || 1,
            photoURL: user.photoURL || null
          });
        }
      }
    }

    // Sort descending by XP
    members.sort((a, b) => b.xp - a.xp);

    renderLeaderboard(members);

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    const listEl = document.getElementById('membersList');
    listEl.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 20px;">Failed to load members. Please try again later.</div>`;
  }
}

function renderLeaderboard(members) {
  const listEl = document.getElementById('membersList');
  listEl.innerHTML = ''; // Clear skeletons

  if (members.length === 0) {
    renderEmptyState();
    return;
  }

  members.forEach((member) => {
    let avatarStyle = '';
    let avatarContent = '👤';
    if (member.photoURL) {
      avatarStyle = `background-image: url('${member.photoURL}'); color: transparent;`;
      avatarContent = '';
    }

    const isCurrentUser = (window.currentUser && window.currentUser.uid === member.uid) ? 'border: 2px solid var(--primary-color); background: rgba(0,255,136,0.05);' : '';

    const itemHTML = `
      <div class="members-item" style="${isCurrentUser}">
        <div class="member-avatar" style="${avatarStyle}">${avatarContent}</div>
        <div class="member-info">
          <div class="member-name">${escapeHTML(member.name)} ${isCurrentUser ? '(You)' : ''}</div>
          <div class="member-username">@${escapeHTML(member.username)}</div>
        </div>
        <div class="member-stats">
          <div class="stat-pill stat-xp">${member.xp} XP</div>
          <div class="stat-pill stat-level">Lvl ${member.level}</div>
        </div>
      </div>
    `;

    listEl.insertAdjacentHTML('beforeend', itemHTML);
  });
}

function renderEmptyState() {
  const listEl = document.getElementById('membersList');
  listEl.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <div style="font-size: 3rem; margin-bottom: 15px;">🌌</div>
      <h3>No explorers found yet!</h3>
      <p>Be the first to earn XP and claim the top spot.</p>
    </div>
  `;
}

// Utility to prevent XSS when rendering user input
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag])
  );
}
