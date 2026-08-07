document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const loadingNotice = document.getElementById('chatLoading');

  let db = null;
  let messagesRef = null;
  let isConnected = false;

  // Wait for Firebase Auth to initialize
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      db = firebase.database();
      messagesRef = db.ref('messages');
      initChat(user);
    } else {
      // User is not logged in. auth-guard.js will usually handle redirect,
      // but just in case:
      loadingNotice.textContent = 'Please log in to use the chat.';
      loadingNotice.style.color = 'var(--secondary-color)';
    }
  });

  function initChat(user) {
    // Enable inputs
    chatInput.disabled = false;
    chatSendBtn.disabled = false;
    chatInput.focus();

    // Setup listener for new messages
    messagesRef.orderByChild('timestamp').limitToLast(100).on('child_added', (snapshot) => {
      if (!isConnected) {
        isConnected = true;
        if (loadingNotice) loadingNotice.remove();
      }
      
      const message = snapshot.val();
      const messageKey = snapshot.key;
      renderMessage(message, messageKey, user.uid);
    });

    // In case there are no messages at all yet
    messagesRef.once('value').then((snapshot) => {
      if (!snapshot.exists()) {
        isConnected = true;
        if (loadingNotice) loadingNotice.remove();
        const emptyNotice = document.createElement('div');
        emptyNotice.className = 'chat-notice';
        emptyNotice.textContent = 'No messages yet. Be the first to say hello!';
        emptyNotice.id = 'chatEmpty';
        chatMessages.appendChild(emptyNotice);
      }
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (!text) return;

      // Optimistically disable input while sending
      chatInput.disabled = true;
      chatSendBtn.disabled = true;

      try {
        // Fetch current user data for name and avatar
        let authorName = user.displayName || 'Space Explorer';
        let authorAvatar = null;

        const userSnapshot = await db.ref('users/' + user.uid).once('value');
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          authorName = userData.name || userData.username || authorName;
          authorAvatar = userData.photoURL || null;
        }

        // Push to Firebase
        await messagesRef.push({
          uid: user.uid,
          text: text,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          authorName: authorName,
          authorAvatar: authorAvatar
        });

        // Clear input
        chatInput.value = '';
        
        // Remove empty notice if it exists
        const emptyNotice = document.getElementById('chatEmpty');
        if (emptyNotice) emptyNotice.remove();

      } catch (error) {
        console.error("Error sending message: ", error);
        if (window.showToast) {
          window.showToast("Failed to send message. Please try again.", "error");
        }
      } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
      }
    });
  }

  function renderMessage(message, key, currentUid) {
    // Avoid duplicate renders if Firebase triggers multiple times
    if (document.getElementById(`msg-${key}`)) return;

    const isSent = message.uid === currentUid;
    const alignClass = isSent ? 'sent' : 'received';
    
    let avatarStyle = '';
    let avatarContent = '👤';
    if (message.authorAvatar) {
      avatarStyle = `background-image: url('${message.authorAvatar}'); color: transparent;`;
      avatarContent = '';
    }

    // Format time
    let timeString = '';
    if (message.timestamp) {
      const date = new Date(message.timestamp);
      timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${alignClass}`;
    wrapper.id = `msg-${key}`;

    const safeText = escapeHTML(message.text);
    const safeName = escapeHTML(message.authorName);

    if (isSent) {
      wrapper.innerHTML = `
        <div class="message-meta">${timeString}</div>
        <div class="message-bubble">${safeText}</div>
      `;
    } else {
      wrapper.innerHTML = `
        <div class="message-meta">
          <div class="message-avatar" style="${avatarStyle}">${avatarContent}</div>
          <span class="sender-name">${safeName}</span>
          <span>${timeString}</span>
        </div>
        <div class="message-bubble">${safeText}</div>
      `;
    }

    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag])
    );
  }
});
