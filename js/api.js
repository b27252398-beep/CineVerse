/* ==========================================================================
   api.js — all TMDb API calls live here. Nothing in this file touches
   the DOM; it only fetches data and returns it. Keeping fetch logic
   separate from render logic means we can swap the data source later
   without touching app.js, search.js, or movie.js.
   ========================================================================== */

/* !! Replace with your own free TMDb API key: themoviedb.org -> Settings -> API */
const TMDB_API_KEY = 'e397c28c621902e36c15f5808fb62719';

const BASE_URL = 'https://api.tmdb.org/3';

/**
 * Internal helper: builds the URL and handles the fetch + error pattern
 * once, so every exported function below stays a one-liner.
 */
async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url);

  if (!response.ok) {
    // Throwing here lets every caller use a single try/catch instead of
    // checking response.ok everywhere individually.
    throw new Error(`TMDb request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchTrending(page = 1) {
  const data = await tmdbFetch('/trending/movie/week', { page });
  return data.results;
}

async function fetchPopular(page = 1) {
  const data = await tmdbFetch('/movie/popular', { page });
  return data.results;
}

/* --- BOLLYWOOD SPECIFIC FUNCTIONS --- */
async function fetchBollywoodTrending(page = 1) {
  const data = await tmdbFetch('/discover/movie', {
    with_original_language: 'hi',
    sort_by: 'popularity.desc',
    include_adult: false,
    page
  });
  return data.results;
}

async function fetchBollywoodTopRated(page = 1) {
  const data = await tmdbFetch('/discover/movie', {
    with_original_language: 'hi',
    sort_by: 'vote_average.desc',
    'vote_count.gte': 100,
    include_adult: false,
    page
  });
  return data.results;
}

async function fetchBollywoodAction(page = 1) {
  const data = await tmdbFetch('/discover/movie', {
    with_original_language: 'hi',
    with_genres: '28,53', // Action and Thriller
    sort_by: 'popularity.desc',
    include_adult: false,
    page
  });
  return data.results;
}

async function fetchMovieDetails(id) {
  return tmdbFetch(`/movie/${id}`, { append_to_response: 'credits,videos,recommendations,similar' });
}

async function searchMovies(query, page = 1) {
  if (!query || !query.trim()) return [];
  const data = await tmdbFetch('/search/movie', { query, include_adult: false, page });
  return data.results;
}

/* ==========================================================================
   NEW API ENDPOINTS FOR PREMIUM FEATURES
   ========================================================================== */

/**
 * Fetch and cache genres to avoid redundant API calls.
 * Used for displaying genre tags on movie cards.
 */
async function fetchGenres() {
  const cached = localStorage.getItem('cineverse_genres');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }
  try {
    const data = await tmdbFetch('/genre/movie/list');
    localStorage.setItem('cineverse_genres', JSON.stringify(data.genres));
    return data.genres;
  } catch (error) {
    console.error("Failed to fetch genres:", error);
    return [];
  }
}

/**
 * Advanced filtering via Discover API.
 * filters object can contain: with_genres, primary_release_year, sort_by, vote_average.gte
 */
async function discoverMovies(filters = {}, page = 1) {
  const data = await tmdbFetch('/discover/movie', {
    ...filters,
    include_adult: false,
    include_video: false,
    page
  });
  return data.results;
}

/**
 * Helper to get a genre name from its ID using cached genres.
 */
function getGenreName(id, genreList = []) {
  const genre = genreList.find(g => g.id === id);
  return genre ? genre.name : '';
}
