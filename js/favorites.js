/* ==========================================================================
   favorites.js — favorites/watchlist persistence via localStorage.
   Also owns the global Toast notification system (used by other modules).
   ========================================================================== */

const FAVORITES_KEY = 'cineverse_favorites';

/* ---------- Storage helpers ---------- */

function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function isFavorite(movieId) {
  return getFavorites().some((m) => m.id === movieId);
}

function _saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function addFavorite(movie) {
  const favs = getFavorites();
  if (favs.some((m) => m.id === movie.id)) return;
  favs.push(movie);
  _saveFavorites(favs);
}

function removeFavorite(movieId) {
  _saveFavorites(getFavorites().filter((m) => m.id !== movieId));
}

/**
 * Adds if absent, removes if present.
 * Shows a toast notification automatically.
 * Returns true if movie was added, false if removed.
 */
function toggleFavorite(movie) {
  const nowAdded = !isFavorite(movie.id);
  if (nowAdded) {
    addFavorite(movie);
    showToast(`Added to Favorites ★`, 'success');
  } else {
    removeFavorite(movie.id);
    showToast(`Removed from Favorites`, 'info');
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
