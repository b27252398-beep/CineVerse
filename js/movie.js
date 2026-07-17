/* ==========================================================================
   movie.js — entry point for movie.html.
   Reads the ?id= query param, fetches all data in parallel, renders each
   piece. Depends on: utils.js, api.js, favorites.js, search.js.
   ========================================================================== */

/* --------------------------------------------------------------------------
   GENRE PILLS — XSS-safe via textContent
   -------------------------------------------------------------------------- */
function renderGenres(genres) {
  const container = document.getElementById('detailGenres');
  container.innerHTML = '';
  if (!genres || genres.length === 0) return;

  genres.forEach((g, i) => {
    const pill = document.createElement('span');
    pill.className   = 'detail__genre-pill';
    pill.textContent = g.name;
    pill.style.setProperty('--pill-index', i); // drives stagger in animations.css
    container.appendChild(pill);
  });
}

/* --------------------------------------------------------------------------
   CAST CARDS — XSS-safe via DOM methods
   -------------------------------------------------------------------------- */
function renderCast(cast) {
  const section = document.getElementById('castSection');
  const row     = document.getElementById('castRow');

  if (!cast || cast.length === 0) {
    row.innerHTML = '<p class="movie-row__placeholder">No cast information available.</p>';
    section.removeAttribute('hidden');
    return;
  }

  row.innerHTML = '';
  const frag = document.createDocumentFragment();

  cast.forEach((person, i) => {
    const card = document.createElement('div');
    card.className = 'cast-card';
    card.style.setProperty('--card-index', i); // drives stagger in animations.css

    const img = document.createElement('img');
    img.className = 'cast-card__photo';
    if (person.profile_path) {
      img.src = `https://image.tmdb.org/t/p/w185${person.profile_path}`;
    } else {
      img.src = 'https://placehold.co/185x278/151922/6B7280?text=?';
    }
    img.alt = person.name;
    img.loading = 'lazy';

    /* Error fallback for broken images */
    img.onerror = function() {
      this.src = 'https://placehold.co/185x278/151922/6B7280?text=?';
      this.onerror = null;
    };

    const name = document.createElement('p');
    name.className   = 'cast-card__name';
    name.textContent = person.name;

    const character = document.createElement('p');
    character.className   = 'cast-card__character';
    character.textContent = person.character || '';

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(character);
    frag.appendChild(card);
  });

  row.appendChild(frag);
  section.removeAttribute('hidden');
  enableHorizontalScroll(row);
}

/* --------------------------------------------------------------------------
   SIMILAR MOVIES
   -------------------------------------------------------------------------- */
function renderSimilar(movies, titleText = 'You Might Also Like') {
  const section = document.getElementById('similarSection');
  const row     = document.getElementById('similarRow');
  const titleEl = section.querySelector('.movie-section__title');

  if (titleEl) {
    titleEl.textContent = titleText;
  }

  if (!movies || movies.length === 0) {
    row.innerHTML = '<p class="movie-row__placeholder">No similar movies found.</p>';
    section.removeAttribute('hidden');
    return;
  }

  renderMovieRow(row, movies);
  section.removeAttribute('hidden');
  enableHorizontalScroll(row);
}

/* --------------------------------------------------------------------------
   TRAILER MODAL
   -------------------------------------------------------------------------- */
function initTrailerModal(video) {
  const trailerBtn = document.getElementById('trailerBtn');
  const modal      = document.getElementById('trailerModal');
  const modalVideo = document.getElementById('modalVideo');
  const closeBtn   = document.getElementById('modalClose');
  const backdrop   = document.getElementById('modalBackdrop');

  if (!video) {
    trailerBtn.setAttribute('hidden', '');
    return;
  }

  trailerBtn.removeAttribute('hidden');

  function openModal() {
    modalVideo.innerHTML = `<iframe
      src="https://www.youtube.com/embed/${sanitize(video.key)}?autoplay=1&rel=0"
      title="${sanitize(video.name)}"
      allow="autoplay; encrypted-media"
      allowfullscreen
    ></iframe>`;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    modalVideo.innerHTML = ''; // stops playback
    document.body.style.overflow = '';
    trailerBtn.focus();
  }

  trailerBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeModal();
  });
}

/* --------------------------------------------------------------------------
   NAVBAR (movie.html copy — same logic as app.js)
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('navbar--scrolled', window.scrollY > 60);
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('navbar__links--open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.classList.toggle('hamburger--open', isOpen);
  });
}

/* --------------------------------------------------------------------------
   THEME — same as app.js but loaded separately for movie.html
   -------------------------------------------------------------------------- */
function initTheme() {
  const btn   = document.getElementById('themeToggle');
  const saved = localStorage.getItem('cineverse_theme');
  const theme = saved || 'dark';
  applyTheme(theme);
  btn?.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('light-theme');
    applyTheme(isDark ? 'light' : 'dark');
    localStorage.setItem('cineverse_theme', isDark ? 'light' : 'dark');
  });
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  btn.innerHTML = theme === 'light'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/>
         <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
         <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
         <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
         <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
       </svg>`;
}

/* --------------------------------------------------------------------------
   SCROLL-TO-TOP
   -------------------------------------------------------------------------- */
function initScrollToTop() {
  const btn = document.getElementById('scrollToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('scroll-top--visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* --------------------------------------------------------------------------
   MAIN — initMovieDetail
   -------------------------------------------------------------------------- */
async function initMovieDetail() {
  document.getElementById('year').textContent = new Date().getFullYear();

  initTheme();
  initNavbar();
  initScrollToTop();

  const movieId   = getQueryParam('id');
  const loadingEl = document.getElementById('movieDetailLoading');
  const detailEl  = document.getElementById('movieDetail');

  if (!movieId) {
    loadingEl.innerHTML = `
      <div class="detail-error">
        <p class="detail-error__code">404</p>
        <p class="detail-error__msg">No movie selected.</p>
        <a href="index.html" class="btn btn--gold">← Back to Home</a>
      </div>`;
    return;
  }

  try {
    const [movie, cast, video, similar] = await Promise.all([
      fetchMovieDetails(movieId),
      fetchMovieCredits(movieId),
      fetchMovieVideos(movieId),
      fetchSimilarMovies(movieId),
    ]);

    /* SEO */
    document.title = `${movie.title} — CineVerse`;
    document.querySelector('meta[name="description"]').setAttribute(
      'content',
      `${movie.title} (${getYear(movie.release_date)}) — ${(movie.overview || '').slice(0, 155)}…`
    );

    /* Backdrop with full overlay */
    const backdropEl = document.getElementById('detailBackdrop');
    if (movie.backdrop_path) {
      backdropEl.style.backgroundImage = `url(${getImageUrl(movie.backdrop_path, 'original')})`;
    }

    /* Poster */
    const posterEl = document.getElementById('detailPoster');
    posterEl.src   = getImageUrl(movie.poster_path, 'w500');
    posterEl.alt   = `${movie.title} poster`;
    posterEl.onerror = function () {
      this.src = 'https://placehold.co/500x750/151922/6B7280?text=No+Poster';
      this.onerror = null;
    };

    /* Title & meta */
    document.getElementById('detailTitle').textContent = movie.title;

    const ratingClass = getRatingClass(movie.vote_average);
    document.getElementById('detailMeta').innerHTML = `
      <span>${getYear(movie.release_date)}</span>
      <span>${formatRuntime(movie.runtime)}</span>
      <span class="detail__rating ${ratingClass}">★ ${formatRating(movie.vote_average)}</span>
      ${movie.tagline ? `<span class="detail__tagline">"${sanitize(movie.tagline)}"</span>` : ''}
    `;

    document.getElementById('detailOverview').textContent = movie.overview || 'No overview available.';
    renderGenres(movie.genres);

    /* Favorite button */
    const favBtn = document.getElementById('detailFavoriteBtn');
    syncFavoriteButton(favBtn, movie);
    favBtn.addEventListener('click', () => {
      toggleFavorite(movie);
      syncFavoriteButton(favBtn, movie);
    });

    initTrailerModal(video);
    renderCast(cast);
    let finalRecommendations = similar;
    let recommendTitle = 'You Might Also Like';

    if (!finalRecommendations || finalRecommendations.length === 0) {
      finalRecommendations = await fetchPopular();
      recommendTitle = 'Popular Movies';
    }

    renderSimilar(finalRecommendations, recommendTitle);

    /* Reveal */
    loadingEl.setAttribute('hidden', '');
    detailEl.removeAttribute('hidden');

    /* Animate in + rating count-up */
    requestAnimationFrame(() => {
      detailEl.classList.add('detail--revealed');

      // Count-up animation for the rating badge
      const ratingEl = detailEl.querySelector('.detail__rating');
      if (ratingEl) {
        const target = movie.vote_average || 0;
        const prefix = '\u2605 ';
        let start = null;
        const duration = 950;
        function countUp(ts) {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          const eased    = 1 - Math.pow(1 - progress, 3);
          ratingEl.textContent = `${prefix}${(target * eased).toFixed(1)}`;
          if (progress < 1) requestAnimationFrame(countUp);
        }
        requestAnimationFrame(countUp);
      }
    });

    /* Button ripple — delegated */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const ripple  = document.createElement('span');
      ripple.className = 'btn__ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      ripple.style.width  = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left   = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top    = `${e.clientY - rect.top  - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });

    /* Reveal sections on scroll */
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section--revealed');
          sectionIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.movie-section').forEach((el) => sectionIO.observe(el));

    /* Footer reveal */
    const footer = document.querySelector('.footer');
    if (footer) {
      const footerIO = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { footer.classList.add('footer--visible'); footerIO.disconnect(); }
        });
      }, { threshold: 0.15 });
      footerIO.observe(footer);
    }

  } catch (err) {
    console.error('Failed to load movie:', err);
    loadingEl.innerHTML = `
      <div class="detail-error">
        <p class="detail-error__code">Error</p>
        <p class="detail-error__msg">Could not load this movie. Check your API key.</p>
        <a href="index.html" class="btn btn--gold">← Back to Home</a>
      </div>`;
    showToast('Failed to load movie details.', 'error', 5000);
  }
}

document.addEventListener('DOMContentLoaded', initMovieDetail);
