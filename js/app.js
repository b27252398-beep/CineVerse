/* ==========================================================================
   app.js — entry point for index.html.
   Runs last (utils.js → api.js → favorites.js → search.js → app.js).
   ========================================================================== */

/* --------------------------------------------------------------------------
   HERO AUTO-ROTATION
   Cycles through the top N trending movies with a smooth crossfade.
   -------------------------------------------------------------------------- */
let _heroMovies     = [];
let _heroIndex      = 0;
let _heroTimer      = null;
const HERO_INTERVAL = 7000; // ms between auto-advances

function renderHero(movie) {
  document.getElementById('heroTitle').textContent    = movie.title;
  document.getElementById('heroOverview').textContent = movie.overview || '';

  const year    = getYear(movie.release_date);
  const rating  = formatRating(movie.vote_average);
  const ratingClass = getRatingClass(movie.vote_average);

  document.getElementById('heroMeta').innerHTML = `
    <span>${year}</span>
    <span class="hero__rating ${ratingClass}">★ ${rating}</span>
  `;

  const spotlight = document.querySelector('.hero__spotlight');
  if (movie.backdrop_path) {
    // Fade out → update → fade in for smooth transition
    spotlight.style.opacity = '0';
    setTimeout(() => {
      spotlight.style.backgroundImage = `
        radial-gradient(ellipse at 30% 20%, rgba(232, 178, 77, 0.2), transparent 60%),
        linear-gradient(90deg, rgba(9,12,18,0.97) 0%, rgba(9,12,18,0.78) 55%, rgba(9,12,18,0.35) 100%),
        linear-gradient(180deg, rgba(9,12,18,0.3) 0%, rgba(9,12,18,0.94) 100%),
        url(${getImageUrl(movie.backdrop_path, 'original')})
      `;
      spotlight.style.backgroundSize     = 'cover';
      spotlight.style.backgroundPosition = 'center 30%';
      spotlight.style.opacity = '1';
    }, 300);
  }

  /* Wire buttons — replace with fresh clones to prevent duplicate listeners */
  const oldDetailsBtn  = document.getElementById('heroDetailsBtn');
  const oldFavBtn      = document.getElementById('heroFavoriteBtn');
  const detailsBtn     = oldDetailsBtn.cloneNode(true);
  const favBtn         = oldFavBtn.cloneNode(true);
  oldDetailsBtn.replaceWith(detailsBtn);
  oldFavBtn.replaceWith(favBtn);

  detailsBtn.addEventListener('click', () => {
    document.body.classList.add('page-transition-out');
    setTimeout(() => { window.location.href = `movie.html?id=${movie.id}`; }, 350);
  });

  syncFavoriteButton(favBtn, movie);
  favBtn.addEventListener('click', () => {
    toggleFavorite(movie);
    syncFavoriteButton(document.getElementById('heroFavoriteBtn'), movie);
  });

  /* Update dot indicators */
  updateHeroDots();
}

function startHeroRotation(movies) {
  _heroMovies = movies.slice(0, 8);
  _heroIndex  = 0;
  renderHero(_heroMovies[0]);
  buildHeroDots();
  _heroTimer = setInterval(advanceHero, HERO_INTERVAL);
}

function advanceHero(direction = 1) {
  clearInterval(_heroTimer);
  _heroIndex = (_heroIndex + direction + _heroMovies.length) % _heroMovies.length;
  renderHero(_heroMovies[_heroIndex]);
  _heroTimer = setInterval(advanceHero, HERO_INTERVAL);
}

function buildHeroDots() {
  const dotsEl = document.getElementById('heroDots');
  if (!dotsEl) return;
  dotsEl.innerHTML = '';
  _heroMovies.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className  = 'hero__dot';
    dot.setAttribute('aria-label', `Show movie ${i + 1}`);
    dot.addEventListener('click', () => {
      clearInterval(_heroTimer);
      _heroIndex = i;
      renderHero(_heroMovies[i]);
      _heroTimer = setInterval(advanceHero, HERO_INTERVAL);
    });
    dotsEl.appendChild(dot);
  });
  updateHeroDots();

  /* Arrow controls */
  document.getElementById('heroPrev')?.addEventListener('click', () => advanceHero(-1));
  document.getElementById('heroNext')?.addEventListener('click', () => advanceHero(1));
}

function updateHeroDots() {
  const dotsEl = document.getElementById('heroDots');
  if (!dotsEl) return;
  dotsEl.querySelectorAll('.hero__dot').forEach((dot, i) => {
    dot.classList.toggle('hero__dot--active', i === _heroIndex);
  });
}

/* --------------------------------------------------------------------------
   NAVBAR — scroll-shrink + active link highlighting
   -------------------------------------------------------------------------- */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  /* Sticky shrink on scroll */
  const scrollHandler = () => {
    navbar.classList.toggle('navbar--scrolled', window.scrollY > 60);
  };
  window.addEventListener('scroll', scrollHandler, { passive: true });

  /* Mobile hamburger */
  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('navbar__links--open');
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.classList.toggle('hamburger--open', isOpen);
  });

  /* Close mobile nav on outside click */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar__inner') && navLinks.classList.contains('navbar__links--open')) {
      navLinks.classList.remove('navbar__links--open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.classList.remove('hamburger--open');
    }
  });
}

/* --------------------------------------------------------------------------
   THEME TOGGLE — persisted to localStorage
   -------------------------------------------------------------------------- */
function initTheme() {
  const btn     = document.getElementById('themeToggle');
  const saved   = localStorage.getItem('cineverse_theme');
  const useDark = saved ? saved === 'dark' : true; // default dark

  applyTheme(useDark ? 'dark' : 'light');

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
  // Swap icon between sun ☀ and moon ☾
  btn.querySelector('svg')?.remove();
  btn.innerHTML = theme === 'light'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
       </svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
         <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
         <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
         <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
         <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
         <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
       </svg>`;
}

/* --------------------------------------------------------------------------
   SCROLL-TO-TOP BUTTON
   -------------------------------------------------------------------------- */
function initScrollToTop() {
  const btn = document.getElementById('scrollToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('scroll-top--visible', window.scrollY > 500);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* --------------------------------------------------------------------------
   INTERSECTION OBSERVER — section entrance animations + footer reveal
   -------------------------------------------------------------------------- */
function initRevealAnimations() {
  // Sections
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section--revealed');
        sectionIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.movie-section').forEach((el) => sectionIO.observe(el));

  // Footer
  const footer = document.querySelector('.footer');
  if (footer) {
    const footerIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          footer.classList.add('footer--visible');
          footerIO.unobserve(footer);
        }
      });
    }, { threshold: 0.15 });
    footerIO.observe(footer);
  }
}

/* --------------------------------------------------------------------------
   SHARED VIEW HELPER — restores trending/popular, hides search/favorites
   Called by Home, Trending, and Popular nav links.
   -------------------------------------------------------------------------- */
function showMainSections() {
  document.getElementById('searchResults').setAttribute('hidden', '');
  document.getElementById('trending').removeAttribute('hidden');
  document.getElementById('popular').removeAttribute('hidden');
  // Clear the search input so it doesn't look like results are still active
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
}

/* --------------------------------------------------------------------------
   FAVORITES VIEW
   -------------------------------------------------------------------------- */
function renderFavoritesView() {
  const resultsSection = document.getElementById('searchResults');
  const resultsRow     = document.getElementById('searchResultsRow');
  const resultsTitle   = document.getElementById('searchResultsTitle');
  const favs           = getFavorites();

  resultsTitle.textContent = favs.length === 0 ? 'No Favorites Yet' : 'Your Favorites';
  renderMovieRow(resultsRow, favs);
  if (favs.length > 0) enableHorizontalScroll(resultsRow);
  resultsSection.removeAttribute('hidden');
  document.getElementById('trending').setAttribute('hidden', '');
  document.getElementById('popular').setAttribute('hidden', '');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function initFavoritesLink() {
  document.getElementById('favoritesLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    renderFavoritesView();
  });
}

/* --------------------------------------------------------------------------
   NAV LINKS — Trending, Popular, and Home
   These need explicit click handlers because the sections can be hidden
   (by a search or favorites view). A plain href="#trending" won't scroll
   to a hidden element, so we unhide first, then scroll.
   -------------------------------------------------------------------------- */
function initNavLinks() {
  // Home link — restore trending/popular view and scroll to top
  document.querySelector('.navbar__link[href="index.html"]')?.addEventListener('click', (e) => {
    // Only intercept if we're already on index.html (not navigating from movie page)
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
      e.preventDefault();
      showMainSections();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // Trending link
  document.querySelector('.navbar__link[href="#trending"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    showMainSections();
    // Small delay so the section is visible before scrollIntoView fires
    setTimeout(() => {
      document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });

  // Popular link
  document.querySelector('.navbar__link[href="#popular"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    showMainSections();
    setTimeout(() => {
      document.getElementById('popular')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });
}

/* --------------------------------------------------------------------------
   INTERACTIVE ANIMATIONS
   Hero parallax, button ripple, rating count-up.
   -------------------------------------------------------------------------- */
function initAnimations() {
  /* ---- Hero mouse parallax ---- */
  const heroEl    = document.getElementById('hero');
  const spotlight = document.querySelector('.hero__spotlight');

  if (heroEl && spotlight) {
    heroEl.addEventListener('mousemove', (e) => {
      const rect = heroEl.getBoundingClientRect();
      const x    = (e.clientX - rect.left)  / rect.width  - 0.5;
      const y    = (e.clientY - rect.top)   / rect.height - 0.5;
      spotlight.style.transform = `scale(1.06) translate(${x * -14}px, ${y * -10}px)`;
    });
    heroEl.addEventListener('mouseleave', () => {
      spotlight.style.transform = 'scale(1) translate(0px, 0px)';
    });
  }

  /* ---- Button ripple — event delegation on the whole document ---- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const ripple = document.createElement('span');
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
}

/* --------------------------------------------------------------------------
   MAIN BOOT — runs once DOM is ready
   -------------------------------------------------------------------------- */
async function initApp() {
  /* Year in footer */
  document.getElementById('year').textContent = new Date().getFullYear();

  initTheme();
  initNavbar();
  initNavLinks();      // ← fixes Trending/Popular/Home nav click behaviour
  initSearch();
  initFavoritesLink();
  initScrollToTop();
  initAnimations();    // ← parallax, ripple, reveal effects

  const trendingRow = document.getElementById('trendingRow');
  const popularRow  = document.getElementById('popularRow');

  if (trendingRow && popularRow) {
    /* Show skeletons immediately so users see activity right away */
    renderSkeletons(trendingRow, 10);
    renderSkeletons(popularRow, 10);

    try {
      const [trending, popular] = await Promise.all([fetchTrending(), fetchPopular()]);

      if (trending.length > 0) {
        startHeroRotation(trending);
        /* Trigger staggered hero content entrance after first movie renders */
        requestAnimationFrame(() => {
          document.getElementById('hero')?.classList.add('hero--loaded');
        });
      }

      renderMovieRow(trendingRow, trending);
      renderMovieRow(popularRow, popular);

      // Initialize swipe/scroll on the new rows
      enableHorizontalScroll(trendingRow);
      enableHorizontalScroll(popularRow);

      initRevealAnimations();

      /* Handle ?view=favorites deep-link */
      if (getQueryParam('view') === 'favorites') {
        renderFavoritesView();
      }
    } catch (error) {
      console.error('Failed to initialize app content:', error);
      const msg = '<p class="movie-row__placeholder error-msg">Could not connect to TMDb. Check your API key in api.js.</p>';
      trendingRow.innerHTML = msg;
      popularRow.innerHTML = msg;
    }
  }
}

document.addEventListener('DOMContentLoaded', initApp);
