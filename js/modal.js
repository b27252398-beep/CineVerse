/* ==========================================================================
   modal.js — handles the premium Movie Details SPA modal overlay
   ========================================================================== */

let _modalGenreList = [];

async function initModal(genreList = []) {
  _modalGenreList = genreList || [];
  
  const modal = document.getElementById('movieModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  
  if (!modal) return;
  
  closeBtn.addEventListener('click', closeMovieModal);
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeMovieModal();
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeMovieModal();
    }
  });

  // Expose globally so createMovieCard can call it
  window.openMovieModal = openMovieModal;
}

async function openMovieModal(movieId) {
  const modal = document.getElementById('movieModal');
  if (!modal) return;
  
  // 1. Show modal in loading state
  document.getElementById('modalTitle').textContent = 'Loading...';
  document.getElementById('modalOverview').textContent = '';
  document.getElementById('modalTagline').textContent = '';
  document.getElementById('modalCast').innerHTML = '';
  document.getElementById('modalSimilarRow').innerHTML = '';
  document.getElementById('modalBackdrop').style.backgroundImage = 'none';
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
  
  modal.removeAttribute('hidden');
  
  // 2. Fetch data
  try {
    const movie = await fetchMovieDetails(movieId);
    
    // 3. Populate UI
    document.getElementById('modalTitle').textContent = movie.title;
    document.getElementById('modalTagline').textContent = movie.tagline || '';
    document.getElementById('modalOverview').textContent = movie.overview;
    
    document.getElementById('modalDirector').textContent = getDirector(movie.credits);
    document.getElementById('modalRelease').textContent = getYear(movie.release_date);
    document.getElementById('modalRuntime').textContent = `${movie.runtime} min`;
    document.getElementById('modalBudget').textContent = movie.budget ? `$${(movie.budget / 1000000).toFixed(1)}M` : '—';
    
    // Backdrop
    if (movie.backdrop_path) {
      document.getElementById('modalBackdrop').style.backgroundImage = `url(${getImageUrl(movie.backdrop_path, 'original')})`;
    }
    
    // Meta (Year + Genres)
    const genres = movie.genres.map(g => g.name).join(' • ');
    document.getElementById('modalMeta').innerHTML = `
      <span>${getYear(movie.release_date)}</span>
      <span>${genres}</span>
      <span class="hero__rating ${getRatingClass(movie.vote_average)}">★ ${formatRating(movie.vote_average)}</span>
    `;
    
    // Cast
    const castContainer = document.getElementById('modalCast');
    const topCast = movie.credits.cast.slice(0, 6);
    if (topCast.length) {
      castContainer.innerHTML = topCast.map(actor => `
        <div class="cast-card">
          <img src="${getImageUrl(actor.profile_path, 'w185')}" alt="${actor.name}" onerror="this.src='https://placehold.co/185x278/151922/6B7280?text=?'">
          <p class="cast-name">${actor.name}</p>
          <p class="cast-char">${actor.character}</p>
        </div>
      `).join('');
    } else {
      castContainer.innerHTML = '<p>No cast information available.</p>';
    }
    
    // Recommendations / Similar
    const similarRow = document.getElementById('modalSimilarRow');
    const recommendations = (movie.recommendations && movie.recommendations.results.length) 
      ? movie.recommendations.results.slice(0, 6) 
      : (movie.similar && movie.similar.results.slice(0, 6)) || [];
      
    similarRow.innerHTML = '';
    if (recommendations.length) {
      recommendations.forEach(rec => {
        similarRow.appendChild(createMovieCard(rec));
      });
    } else {
      similarRow.innerHTML = '<p class="movie-row__placeholder">No similar movies found.</p>';
    }
    
    // Favorites Button Sync
    const favBtn = document.getElementById('modalFavBtn');
    // Replace to strip old listeners
    const newFavBtn = favBtn.cloneNode(true);
    favBtn.replaceWith(newFavBtn);
    syncFavoriteButton(newFavBtn, movie);
    newFavBtn.addEventListener('click', () => {
      toggleFavorite(movie);
      syncFavoriteButton(newFavBtn, movie);
      // Also update the hero if it's the same movie
      if (document.getElementById('heroFavoriteBtn') && document.getElementById('heroTitle').textContent === movie.title) {
         syncFavoriteButton(document.getElementById('heroFavoriteBtn'), movie);
      }
    });

    // History Button Logic
    const histBtn = document.getElementById('modalHistoryBtn');
    if (histBtn) {
      const newHistBtn = histBtn.cloneNode(true);
      histBtn.replaceWith(newHistBtn);
      
      if (typeof syncHistoryButton === 'function') {
         syncHistoryButton(newHistBtn, movie);
      }
      
      newHistBtn.addEventListener('click', async () => {
        if (typeof toggleHistory === 'function') {
           await toggleHistory(movie);
           syncHistoryButton(newHistBtn, movie);
        }
      });
    }

    // Trailer Button Logic
    const playBtn = document.getElementById('modalPlayBtn');
    // Strip old listeners
    const newPlayBtn = playBtn.cloneNode(true);
    playBtn.replaceWith(newPlayBtn);
    
    const trailer = movie.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
    if (trailer) {
      newPlayBtn.style.display = 'inline-block';
      newPlayBtn.addEventListener('click', () => {
        openTrailerOverlay(trailer.key);
      });
    } else {
      newPlayBtn.style.display = 'none';
    }
    
  } catch (error) {
    console.error("Failed to load movie details:", error);
    document.getElementById('modalTitle').textContent = 'Failed to load details.';
  }
}

function closeMovieModal() {
  const modal = document.getElementById('movieModal');
  if (modal) {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = ''; // Restore background scrolling
  }
}

function openTrailerOverlay(youtubeKey) {
  let trailerOverlay = document.getElementById('trailerOverlay');
  if (!trailerOverlay) {
    trailerOverlay = document.createElement('div');
    trailerOverlay.id = 'trailerOverlay';
    trailerOverlay.className = 'trailer-overlay';
    trailerOverlay.innerHTML = `
      <div class="trailer-content">
        <button class="trailer-close" id="trailerCloseBtn">✕</button>
        <div class="trailer-iframe-container">
          <iframe id="trailerIframe" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(trailerOverlay);
    
    document.getElementById('trailerCloseBtn').addEventListener('click', closeTrailerOverlay);
    trailerOverlay.addEventListener('click', (e) => {
      if (e.target === trailerOverlay) closeTrailerOverlay();
    });
  }
  
  const iframe = document.getElementById('trailerIframe');
  iframe.src = `https://www.youtube.com/embed/${youtubeKey}?autoplay=1`;
  trailerOverlay.removeAttribute('hidden');
}

function closeTrailerOverlay() {
  const trailerOverlay = document.getElementById('trailerOverlay');
  if (trailerOverlay) {
    const iframe = document.getElementById('trailerIframe');
    iframe.src = ''; // Stop playback
    trailerOverlay.setAttribute('hidden', '');
  }
}

// Helpers
function getDirector(credits) {
  if (!credits || !credits.crew) return '—';
  const dir = credits.crew.find(c => c.job === 'Director');
  return dir ? dir.name : '—';
}
