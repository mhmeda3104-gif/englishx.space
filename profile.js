// profile.js

let currentUser = null;
let userRef = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check auth state
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      userRef = firebase.database().ref('users/' + user.uid);
      loadProfileData();
    } else {
      // If not logged in and not guest, auth-guard will redirect. 
      // If guest, they shouldn't really edit profile, maybe just show a message.
      if (sessionStorage.getItem('guestMode') === 'true') {
        document.getElementById('profilePageName').textContent = 'Guest User';
        document.getElementById('profilePageUsername').textContent = '@guest';
        document.getElementById('editNameInput').disabled = true;
        document.getElementById('editUsernameInput').disabled = true;
        document.getElementById('saveProfileBtn').disabled = true;
        document.getElementById('saveProfileBtn').textContent = 'Cannot edit in Guest Mode';
      }
    }
  });
});

function loadProfileData() {
  userRef.once('value').then(snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Update UI elements
      document.getElementById('profilePageName').textContent = data.name || 'Space Learner';
      document.getElementById('profilePageUsername').textContent = '@' + (data.username || 'user');
      
      document.getElementById('profilePageXP').textContent = data.xp || 0;
      document.getElementById('profilePageLevel').textContent = data.level || 1;
      document.getElementById('profilePageStreak').textContent = data.streak || 0;

      // Update Form Inputs
      document.getElementById('editNameInput').value = data.name || '';
      document.getElementById('editUsernameInput').value = data.username || '';
      document.getElementById('editUserId').value = currentUser.uid;

      // Update Avatar
      const avatarEl = document.getElementById('profilePageAvatar');
      if (data.photoURL) {
        avatarEl.style.backgroundImage = `url('${data.photoURL}')`;
        avatarEl.textContent = '';
      } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.textContent = '👤';
      }
    }
  }).catch(error => {
    console.error("Error loading profile:", error);
    if(window.showToast) showToast('Failed to load profile data', 'error');
  });
}

function saveProfileChanges() {
  if (!currentUser) return;
  
  const newName = document.getElementById('editNameInput').value.trim();
  let newUsername = document.getElementById('editUsernameInput').value.trim();

  // Remove @ if user typed it
  if (newUsername.startsWith('@')) {
    newUsername = newUsername.substring(1);
  }

  if (!newName || !newUsername) {
    if(window.showToast) showToast('Name and Username cannot be empty', 'error');
    return;
  }

  const btn = document.getElementById('saveProfileBtn');
  const originalText = btn.textContent;
  btn.textContent = 'Saving...';
  btn.disabled = true;

  userRef.update({
    name: newName,
    username: newUsername
  }).then(() => {
    btn.textContent = originalText;
    btn.disabled = false;
    
    // Update local UI immediately
    document.getElementById('profilePageName').textContent = newName;
    document.getElementById('profilePageUsername').textContent = '@' + newUsername;
    
    if(window.showToast) showToast('Profile updated successfully!', 'success');
  }).catch(error => {
    btn.textContent = originalText;
    btn.disabled = false;
    console.error("Error updating profile:", error);
    if(window.showToast) showToast('Error updating profile', 'error');
  });
}

function logoutUser() {
  firebase.auth().signOut().then(() => {
    sessionStorage.removeItem('guestMode');
    window.location.href = 'auth.html';
  }).catch(error => {
    console.error("Logout error:", error);
  });
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    if(window.showToast) showToast('Please select an image file', 'error');
    return;
  }
  
  if (file.size > 2 * 1024 * 1024) {
    if(window.showToast) showToast('Image size must be less than 2MB', 'error');
    return;
  }

  try {
    if(window.showToast) showToast('Uploading image... ⏳', 'info');
    
    const storageRef = firebase.storage().ref();
    const avatarRef = storageRef.child(`avatars/${currentUser.uid}_${Date.now()}`);
    
    const snapshot = await avatarRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    await currentUser.updateProfile({ photoURL: downloadURL });
    await userRef.update({ photoURL: downloadURL });
    
    const avatarEl = document.getElementById('profilePageAvatar');
    avatarEl.style.backgroundImage = `url('${downloadURL}')`;
    avatarEl.textContent = '';

    if(window.showToast) showToast('Profile picture updated! 📷', 'success');

  } catch (error) {
    console.error("Upload failed:", error);
    if(window.showToast) showToast('Upload failed! (Check if Firebase Storage is enabled in console)', 'error');
  }
}
