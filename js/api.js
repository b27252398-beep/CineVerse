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

async function fetchTrending() {
  const data = await tmdbFetch('/trending/movie/week');
  return data.results;
}

async function fetchPopular() {
  const data = await tmdbFetch('/movie/popular');
  return data.results;
}

async function fetchMovieDetails(id) {
  return tmdbFetch(`/movie/${id}`);
}

async function fetchMovieCredits(id) {
  const data = await tmdbFetch(`/movie/${id}/credits`);
  return data.cast.slice(0, 10); // top 10 billed cast
}

async function fetchMovieVideos(id) {
  const data = await tmdbFetch(`/movie/${id}/videos`);
  // Prefer an official YouTube trailer; fall back to the first video available.
  return (
    data.results.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    data.results[0] ||
    null
  );
}

async function fetchSimilarMovies(id) {
  const data = await tmdbFetch(`/movie/${id}/similar`);
  return data.results.slice(0, 12);
}

async function searchMovies(query) {
  if (!query || !query.trim()) return [];
  const data = await tmdbFetch('/search/movie', { query, include_adult: false });
  return data.results;
}
