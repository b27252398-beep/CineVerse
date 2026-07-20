/* ==========================================================================
   search.js — live suggestions dropdown + full search results.
   Depends on: utils.js (debounce, createMovieCard), api.js (searchMovies).
   ========================================================================== */

const SEARCH_HISTORY_KEY = 'cineverse_search_history';
const MAX_HISTORY = 5;

function getSearchHistory() {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToSearchHistory(query) {
  const history = getSearchHistory().filter((q) => q.toLowerCase() !== query.toLowerCase());
  history.unshift(query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function initSearch() {
  const searchInput    = document.getElementById('searchInput');
  const searchForm     = document.getElementById('searchForm');
  const suggestionsBox = document.getElementById('searchSuggestions');
  const resultsSection = document.getElementById('searchResults');
  const resultsRow     = document.getElementById('searchResultsRow');
  const resultsTitle   = document.getElementById('searchResultsTitle');
  const clearBtn       = document.getElementById('clearSearchBtn');

  // Guard: search UI only exists on index.html
  if (!searchInput) return;

  /* ---- Ensure [hidden] works even if CSS sets display on the element ---- */
  suggestionsBox.style.display = '';

  /* ---- Live suggestions dropdown ---- */
  async function showSuggestions(query) {
    const trimmed = query.trim();

    if (!trimmed) {
      hideSuggestions();
      return;
    }

    try {
      const results = await searchMovies(trimmed);

      if (results.length === 0) {
        suggestionsBox.innerHTML = '<div class="search-suggestions__empty">No matches found.</div>';
        suggestionsBox.removeAttribute('hidden');
        return;
      }

      suggestionsBox.innerHTML = '';

      results.slice(0, 6).forEach((movie) => {
        const item = document.createElement('a');
        item.href      = `#`;
        item.className = 'search-suggestions__item';
        item.addEventListener('click', (e) => {
          e.preventDefault();
          hideSuggestions();
          if (window.openMovieModal) {
            window.openMovieModal(movie.id);
          } else {
            window.location.href = `movie.html?id=${movie.id}`;
          }
        });

        const img = document.createElement('img');
        img.className = 'search-suggestions__poster';
        img.src       = getImageUrl(movie.poster_path, 'w92');
        img.alt       = '';
        img.onerror   = () => { img.src = 'https://placehold.co/60x90/151922/6B7280?text=?'; };

        const info = document.createElement('div');
        info.className = 'search-suggestions__info';

        const title = document.createElement('p');
        title.className  = 'search-suggestions__title';
        title.textContent = movie.title;

        const meta = document.createElement('p');
        meta.className   = 'search-suggestions__year';
        meta.textContent = `${getYear(movie.release_date)} · ★ ${formatRating(movie.vote_average)}`;

        info.appendChild(title);
        info.appendChild(meta);
        item.appendChild(img);
        item.appendChild(info);
        suggestionsBox.appendChild(item);
      });

      suggestionsBox.removeAttribute('hidden');
    } catch (err) {
      console.error('Search suggestion fetch failed:', err);
      hideSuggestions();
    }
  }

  function hideSuggestions() {
    suggestionsBox.setAttribute('hidden', '');
    suggestionsBox.innerHTML = '';
  }

  const debouncedSuggestions = debounce((q) => showSuggestions(q), 380);

  searchInput.addEventListener('input', (e) => {
    debouncedSuggestions(e.target.value);
  });

  /* Close dropdown when clicking outside the search widget */
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar__search-wrap')) {
      hideSuggestions();
    }
  });

  /* Escape key closes suggestions */
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideSuggestions();
  });

  /* ---- Full search on form submit ---- */
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    hideSuggestions();
    addToSearchHistory(query);

    resultsTitle.textContent = `Results for "${query}"`;
    renderSkeletons(resultsRow, 10);
    resultsSection.removeAttribute('hidden');
    document.getElementById('trending').setAttribute('hidden', '');
    document.getElementById('popular').setAttribute('hidden', '');

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const results = await searchMovies(query);
      renderMovieRow(resultsRow, results);
      enableHorizontalScroll(resultsRow);
    } catch (err) {
      console.error('Search failed:', err);
      resultsRow.innerHTML = '<p class="movie-row__placeholder">Something went wrong. Try again.</p>';
    }
  });

  /* ---- Clear button ---- */
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    resultsSection.setAttribute('hidden', '');
    document.getElementById('trending').removeAttribute('hidden');
    document.getElementById('popular').removeAttribute('hidden');
    searchInput.focus();
  });
}
