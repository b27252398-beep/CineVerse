/* ==========================================================================
   favorites.js — favorites/watchlist persistence via localStorage.
   Also owns the global Toast notification system (used by other modules).
   ========================================================================== */

let localFavoritesCache = [];

window.loadFavoritesFromCloud = async function() {
  const user = getCurrentUser();
  if (!user) {
    localFavoritesCache = [];
    return;
  }
  const { data, error } = await supabase.from('favorites').select('movie_data');
  if (!error && data) {
    localFavoritesCache = data.map(d => d.movie_data);
    // Refresh the UI if they are on the favorites page
    if (document.getElementById('searchResults') && !document.getElementById('searchResults').hasAttribute('hidden')) {
      if (typeof renderFavoritesView === 'function') renderFavoritesView();
    }
  }
}

window.clearFavoritesCache = function() {
  localFavoritesCache = [];
}

/* ---------- Storage helpers ---------- */

function getFavorites() {
  return localFavoritesCache;
}

function isFavorite(movieId) {
  return localFavoritesCache.some((m) => m.id === movieId);
}

async function addFavorite(movie) {
  const user = getCurrentUser();
  if (!user) return;
  if (localFavoritesCache.some((m) => m.id === movie.id)) return;
  
  // Optimistic UI update
  localFavoritesCache.push(movie);
  
  // Sync to Cloud
  await supabase.from('favorites').insert([{
    user_id: user.id,
    movie_id: movie.id,
    movie_data: movie
  }]);
}

async function removeFavorite(movieId) {
  const user = getCurrentUser();
  if (!user) return;
  
  // Optimistic UI update
  localFavoritesCache = localFavoritesCache.filter((m) => m.id !== movieId);
  
  // Sync to Cloud
  await supabase.from('favorites').delete().eq('movie_id', movieId).eq('user_id', user.id);
}

/**
 * Adds if absent, removes if present.
 * Shows a toast notification automatically.
 * Returns true if movie was added, false if removed.
 */
function toggleFavorite(movie) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please Login to save favorites!', 'error');
    document.getElementById('authLink')?.click();
    return false;
  }

  const nowAdded = !isFavorite(movie.id);
  if (nowAdded) {
    addFavorite(movie);
    showToast(`Saved to Cloud Favorites ★`, 'success');
  } else {
    removeFavorite(movie.id);
    showToast(`Removed from Cloud`, 'info');
  }
  return nowAdded;
}

/** Updates a favorite-button element's label/state to match localStorage. */
function syncFavoriteButton(buttonEl, movie) {
  const favorited = isFavorite(movie.id);
  buttonEl.textContent = favorited ? '★ In Favorites' : '+ Add to Favorites';
  buttonEl.classList.toggle('btn--gold', favorited);
  buttonEl.classList.toggle('btn--ghost', !favorited);
}

/* ==========================================================================
   TOAST NOTIFICATION SYSTEM
   A lightweight, accessible toast stack rendered into #toastContainer.
   showToast(message, type, duration) — callable from any module.
   ========================================================================== */

let _toastContainer = null;

function _getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.getElementById('toastContainer');
  }
  return _toastContainer;
}

/**
 * @param {string} message  - Text to display
 * @param {'success'|'info'|'error'} type - Visual variant
 * @param {number} duration - Auto-dismiss delay in ms
 */
function showToast(message, type = 'info', duration = 3200) {
  const container = _getToastContainer();
  if (!container) return;

  const icons = { success: '★', info: 'ℹ', error: '✕' };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const icon = document.createElement('span');
  icon.className   = 'toast__icon';
  icon.textContent = icons[type] ?? 'ℹ';

  const msg = document.createElement('span');
  msg.className   = 'toast__message';
  msg.textContent = message;

  const progress = document.createElement('div');
  progress.className = 'toast__progress';

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(progress);
  container.appendChild(toast);

  // Animate progress bar
  progress.style.animationDuration = `${duration}ms`;

  // Trigger enter animation on next paint
  requestAnimationFrame(() => requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
    progress.classList.add('toast__progress--running');
  }));

  function dismiss() {
    toast.classList.remove('toast--visible');
    toast.classList.add('toast--leaving');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  const timer = setTimeout(dismiss, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}
