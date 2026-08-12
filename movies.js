document.addEventListener('DOMContentLoaded', () => {
  const moviesGrid = document.getElementById('moviesGrid');
  const moviesNotice = document.getElementById('moviesNotice');
  const movieModal = document.getElementById('movieModal');
  const modalTitle = document.getElementById('modalTitle');
  const videoWrapper = document.getElementById('videoWrapper');
  const closeModalBtn = document.getElementById('closeModalBtn');

  // Hardcoded fallback movies if Firebase is empty or fails
  const fallbackMovies = [
    {
      id: 'sample1',
      title: 'Space Documentary (Sample)',
      category: 'Documentary',
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
      // Sample YouTube embed instead of Drive for demonstration
      driveUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' 
    }
  ];

  // Wait for Auth to initialize (auth-guard handles the redirect if not logged in)
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      loadMovies();
    }
  });

  async function loadMovies() {
    try {
      const db = firebase.database();
      const moviesRef = db.ref('movies');
      
      const snapshot = await moviesRef.once('value');
      moviesGrid.innerHTML = ''; // Clear skeletons
      
      let movies = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        movies = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
      } else {
        // Use fallback if database is empty to show how it looks
        movies = fallbackMovies;
      }
      
      if (movies.length === 0) {
        moviesNotice.style.display = 'block';
        return;
      }
      
      movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.onclick = () => openModal(movie);
        
        card.innerHTML = `
          <div class="movie-thumbnail" style="background-image: url('${movie.thumbnail || 'logo.png'}')">
            <div class="movie-play-icon">▶</div>
          </div>
          <div class="movie-info">
            <div class="movie-category">${escapeHTML(movie.category || 'Movie')}</div>
            <div class="movie-title">${escapeHTML(movie.title)}</div>
          </div>
        `;
        
        moviesGrid.appendChild(card);
      });
      
    } catch (error) {
      console.error("Error loading movies:", error);
      moviesGrid.innerHTML = '';
      moviesNotice.style.display = 'block';
      moviesNotice.innerHTML = '<h3>Error loading movies.</h3><p>Please check your connection and try again.</p>';
    }
  }

  function openModal(movie) {
    modalTitle.textContent = movie.title;
    
    // For Google Drive embeds, the URL should look like:
    // https://drive.google.com/file/d/VIDEO_ID/preview
    // Or YouTube embeds: https://www.youtube.com/embed/VIDEO_ID
    
    videoWrapper.innerHTML = `
      <iframe 
        src="${movie.driveUrl}" 
        allow="autoplay; fullscreen; encrypted-media" 
        allowfullscreen>
      </iframe>
    `;
    
    movieModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  function closeModal() {
    movieModal.classList.remove('active');
    videoWrapper.innerHTML = ''; // Stop video playback
    document.body.style.overflow = '';
  }

  // Event Listeners for Modal
  closeModalBtn.addEventListener('click', closeModal);
  
  movieModal.addEventListener('click', (e) => {
    // Close if clicking outside the modal content
    if (e.target === movieModal) {
      closeModal();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && movieModal.classList.contains('active')) {
      closeModal();
    }
  });

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
