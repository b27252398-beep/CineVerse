/* ==========================================================================
   utils.js — shared helpers, no dependencies on other files.
   Must load first (see index.html script order).
   ========================================================================== */

const IMG_BASE = 'https://image.tmdb.org/t/p';

/* --------------------------------------------------------------------------
   XSS PROTECTION — always run untrusted strings through sanitize() before
   inserting into innerHTML. For textContent assignments, it's not needed but
   we expose it so every module can use the same pattern consistently.
   -------------------------------------------------------------------------- */
function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/** Builds a full TMDb image URL from a path, or returns a placeholder if null. */
function getImageUrl(path, size = 'w342') {
  if (!path) return 'https://placehold.co/342x513/151922/6B7280?text=No+Poster';
  return `${IMG_BASE}/${size}${path}`;
}

/** Formats "2024-03-15" -> "2024". */
function getYear(dateStr) {
  if (!dateStr) return '—';
  return dateStr.split('-')[0];
}

/** Formats a runtime in minutes -> "2h 14m". */
function formatRuntime(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`;
}

/** Formats a 0-10 TMDb rating -> "8.4". */
function formatRating(rating) {
  if (rating === undefined || rating === null) return '—';
  return Number(rating).toFixed(1);
}

/**
 * Returns a CSS modifier class based on how good the rating is.
 * Used to color-code ratings: green / amber / red.
 */
function getRatingClass(rating) {
  if (!rating || rating === 0) return 'rating--none';
  if (rating >= 7.5) return 'rating--high';
  if (rating >= 6)   return 'rating--mid';
  return 'rating--low';
}

/**
 * Debounce: delays calling `fn` until `delay` ms have passed with no new calls.
 * Used on the search input so we don't fire an API request on every keystroke.
 */
function debounce(fn, delay = 400) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* --------------------------------------------------------------------------
   SKELETON LOADER — ghost cards shown while real data is fetching.
   -------------------------------------------------------------------------- */
function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'movie-card movie-card--skeleton';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `
    <div class="movie-card__poster skeleton-block"></div>
    <div class="movie-card__body">
      <div class="skeleton-line skeleton-line--lg"></div>
      <div class="skeleton-line skeleton-line--sm"></div>
    </div>
  `;
  return card;
}

function renderSkeletons(containerEl, count = 10) {
  containerEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) frag.appendChild(createSkeletonCard());
  containerEl.appendChild(frag);
}

/* --------------------------------------------------------------------------
   MOVIE CARD — XSS-safe build using DOM methods, not innerHTML for data.
   -------------------------------------------------------------------------- */
function createMovieCard(movie) {
  const card = document.createElement('a');
  card.href       = `movie.html?id=${movie.id}`;
  card.className  = 'movie-card';
  card.setAttribute('data-id', movie.id);

  /* Poster */
  const img = document.createElement('img');
  img.className   = 'movie-card__poster';
  img.src         = getImageUrl(movie.poster_path);
  img.loading     = 'lazy';
  img.alt         = '';   // decorative; title text below is sufficient
  img.onerror     = function () {
    this.src = 'https://placehold.co/342x513/151922/6B7280?text=No+Poster';
    this.onerror = null;
  };

  /* Overlay badge */
  const badge = document.createElement('div');
  badge.className = `movie-card__badge ${getRatingClass(movie.vote_average)}`;
  badge.textContent = `★ ${formatRating(movie.vote_average)}`;

  /* Body */
  const body = document.createElement('div');
  body.className = 'movie-card__body';

  const title = document.createElement('p');
  title.className  = 'movie-card__title';
  title.textContent = movie.title;

  const year = document.createElement('span');
  year.className  = 'movie-card__year';
  year.textContent = getYear(movie.release_date);

  body.appendChild(title);
  body.appendChild(year);

  card.appendChild(img);
  card.appendChild(badge);
  card.appendChild(body);

  /* 3-D tilt on desktop hover */
  card.addEventListener('mousemove', handleCardTilt);
  card.addEventListener('mouseleave', resetCardTilt);

  return card;
}

function handleCardTilt(e) {
  const rect  = this.getBoundingClientRect();
  const x     = (e.clientX - rect.left) / rect.width  - 0.5;   // -0.5 → 0.5
  const y     = (e.clientY - rect.top)  / rect.height - 0.5;
  this.style.transform = `translateY(-6px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
}

function resetCardTilt() {
  this.style.transform = '';
}

/** Clears a container and renders a list of movie cards into it. */
function renderMovieRow(containerEl, movies) {
  containerEl.innerHTML = '';

  if (!movies || movies.length === 0) {
    containerEl.innerHTML = '<p class="movie-row__placeholder">No movies found.</p>';
    return;
  }

  const frag = document.createDocumentFragment();
  movies.forEach((m) => frag.appendChild(createMovieCard(m)));
  containerEl.appendChild(frag);
}

/** Reads a query param from the current URL, e.g. getQueryParam('id'). */
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/** Enables mouse-drag & mouse-wheel horizontal scrolling on a .movie-row. */
function enableHorizontalScroll(el) {
  // Mouse wheel → horizontal scroll
  el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY * 2;
    }
  }, { passive: false });

  // Click-drag
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', (e) => {
    isDown     = true;
    startX     = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
    el.style.cursor = 'grabbing';
  });
  el.addEventListener('mouseleave', () => { isDown = false; el.style.cursor = ''; });
  el.addEventListener('mouseup',    () => { isDown = false; el.style.cursor = ''; });
  el.addEventListener('mousemove',  (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x    = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    el.scrollLeft = scrollLeft - walk;
  });
}
