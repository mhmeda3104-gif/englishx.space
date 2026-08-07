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
  
  if (file.size > 5 * 1024 * 1024) {
    if(window.showToast) showToast('Image size must be less than 5MB', 'error');
    return;
  }

  try {
    if(window.showToast) showToast('Processing image... ⏳', 'info');
    
    // Read the file
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = async function() {
        // Create canvas to resize image
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress to base64 jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        
        try {
          // Save Base64 to Realtime Database instead of Storage
          await userRef.update({ photoURL: dataUrl });
          
          // Also update Auth profile
          await currentUser.updateProfile({ photoURL: dataUrl });
          
          // Update UI
          const avatarEl = document.getElementById('profilePageAvatar');
          avatarEl.style.backgroundImage = `url('${dataUrl}')`;
          avatarEl.textContent = '';
          
          if(window.showToast) showToast('Profile picture updated! 📷', 'success');
        } catch (dbError) {
          console.error("DB Save failed:", dbError);
          if(window.showToast) showToast('Failed to save image!', 'error');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);

  } catch (error) {
    console.error("Upload failed:", error);
    if(window.showToast) showToast('An error occurred processing the image.', 'error');
  }
}
