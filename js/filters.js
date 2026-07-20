/* ==========================================================================
   filters.js — handles the advanced UI filtering and sorting 
   ========================================================================== */

let _filterGenreList = [];

async function initFilters() {
  const toggleBtn = document.getElementById('filtersToggleBtn');
  const panel     = document.getElementById('filtersPanel');
  const genreSel  = document.getElementById('filterGenre');
  const yearSel   = document.getElementById('filterYear');
  const applyBtn  = document.getElementById('applyFiltersBtn');
  const resetBtn  = document.getElementById('resetFiltersBtn');
  
  if (!toggleBtn) return;

  // Populate Years
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1970; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    yearSel.appendChild(opt);
  }

  // Fetch & Populate Genres
  _filterGenreList = await fetchGenres();
  _filterGenreList.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.name;
    genreSel.appendChild(opt);
  });

  // Toggle Panel
  toggleBtn.addEventListener('click', () => {
    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) {
      panel.removeAttribute('hidden');
      toggleBtn.innerHTML = 'Filters <span>▲</span>';
    } else {
      panel.setAttribute('hidden', '');
      toggleBtn.innerHTML = 'Filters <span>▼</span>';
    }
  });

  // Apply Filters
  applyBtn.addEventListener('click', async () => {
    const filters = {};
    if (genreSel.value) filters.with_genres = genreSel.value;
    if (yearSel.value) filters.primary_release_year = yearSel.value;
    if (document.getElementById('filterSort').value) {
      filters.sort_by = document.getElementById('filterSort').value;
    }

    const resultsSection = document.getElementById('discoverResultsSection');
    const resultsRow     = document.getElementById('discoverResultsRow');
    
    // UI state
    document.getElementById('trending').setAttribute('hidden', '');
    document.getElementById('popular').setAttribute('hidden', '');
    resultsSection.removeAttribute('hidden');
    
    renderSkeletons(resultsRow, 10);
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const results = await discoverMovies(filters);
      renderMovieRow(resultsRow, results);
      enableHorizontalScroll(resultsRow);
    } catch (err) {
      resultsRow.innerHTML = '<p class="movie-row__placeholder">Failed to discover movies.</p>';
    }
  });

  // Reset Filters
  resetBtn.addEventListener('click', () => {
    genreSel.value = '';
    yearSel.value = '';
    document.getElementById('filterSort').value = 'popularity.desc';
    
    document.getElementById('discoverResultsSection').setAttribute('hidden', '');
    document.getElementById('trending').removeAttribute('hidden');
    document.getElementById('popular').removeAttribute('hidden');
  });
}
