/* ==========================================================================
   history.js — Watch History persistence via Supabase and localStorage.
   ========================================================================== */

let localHistoryCache = [];

window.loadHistoryFromCloud = async function() {
  const user = getCurrentUser();
  if (!user || typeof supabase === 'undefined') {
    localHistoryCache = [];
    return;
  }
  const { data, error } = await supabase.from('watch_history').select('movie_data');
  if (!error && data) {
    localHistoryCache = data.map(d => d.movie_data);
    if (document.getElementById('searchResults') && window.location.hash === '#history') {
      if (typeof renderHistoryView === 'function') renderHistoryView();
    }
  }
}

window.clearHistoryCache = function() {
  localHistoryCache = [];
}

function getHistory() {
  return localHistoryCache;
}

function isWatched(movieId) {
  return localHistoryCache.some(m => m.id === movieId);
}

async function toggleHistory(movie) {
  const user = getCurrentUser();
  if (!user) {
    if (typeof showToast === 'function') showToast('Please log in to mark movies as watched.');
    return false;
  }

  const alreadyWatched = isWatched(movie.id);

  if (alreadyWatched) {
    localHistoryCache = localHistoryCache.filter(m => m.id !== movie.id);
    if (typeof supabase !== 'undefined') {
      supabase.from('watch_history').delete().eq('movie_id', movie.id).eq('user_id', user.id).then();
    }
    if (typeof showToast === 'function') showToast('Removed from Watch History');
  } else {
    localHistoryCache.push(movie);
    if (typeof supabase !== 'undefined') {
      supabase.from('watch_history').insert([{
        user_id: user.id,
        movie_id: movie.id,
        movie_data: movie
      }]).then();
    }
    if (typeof showToast === 'function') showToast('Marked as Watched');
  }

  if (window.location.hash === '#history') {
    if (typeof renderHistoryView === 'function') renderHistoryView();
  }
  
  return !alreadyWatched;
}

function syncHistoryButton(buttonEl, movie) {
  if (!buttonEl || !movie) return;
  const isW = isWatched(movie.id);
  if (isW) {
    buttonEl.innerHTML = '👁 Watched';
    buttonEl.classList.add('active');
    buttonEl.classList.remove('btn--ghost');
    buttonEl.classList.add('btn--gold');
  } else {
    buttonEl.innerHTML = '👁 Mark as Watched';
    buttonEl.classList.remove('active');
    buttonEl.classList.add('btn--ghost');
    buttonEl.classList.remove('btn--gold');
  }
}

// Ensure globally available
window.getHistory = getHistory;
window.isWatched = isWatched;
window.toggleHistory = toggleHistory;
window.syncHistoryButton = syncHistoryButton;
