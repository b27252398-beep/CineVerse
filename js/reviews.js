/* ==========================================================================
   reviews.js — Logic for fetching and submitting movie ratings & reviews.
   ========================================================================== */

async function fetchReviews(movieId) {
  if (typeof supabase === 'undefined') return [];
  const { data, error } = await supabase
    .from('reviews')
    .select('id, user_id, rating, review_text, created_at')
    .eq('movie_id', movieId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
  return data || [];
}

async function submitReview(movieId, rating, reviewText) {
  const user = getCurrentUser();
  if (!user || typeof supabase === 'undefined') return { error: 'Not logged in' };
  
  if (!rating || rating < 1 || rating > 5) {
    return { error: 'Please provide a rating between 1 and 5 stars.' };
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert([{
      user_id: user.id,
      movie_id: movieId,
      rating: parseInt(rating),
      review_text: reviewText || ''
    }]);

  if (error) {
    console.error("Error submitting review:", error);
    return { error: error.message };
  }
  return { success: true };
}

window.fetchReviews = fetchReviews;
window.submitReview = submitReview;

async function renderReviewsForMovie(movieId) {
  const reviewsList = document.getElementById('reviewsList');
  const reviewForm = document.getElementById('reviewFormContainer');
  const loginPrompt = document.getElementById('loginToReviewPrompt');
  const submitBtn = document.getElementById('submitReviewBtn');
  const textInput = document.getElementById('reviewTextInput');
  
  if (!reviewsList) return;
  reviewsList.innerHTML = '<p style="color: var(--color-gray-400);">Loading reviews...</p>';
  
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (user) {
    loginPrompt.style.display = 'none';
    reviewForm.style.display = 'block';
  } else {
    loginPrompt.style.display = 'block';
    reviewForm.style.display = 'none';
  }

  // Handle Stars
  let selectedRating = 0;
  const stars = document.querySelectorAll('#starRating .star');
  stars.forEach(star => {
    star.addEventListener('click', (e) => {
      selectedRating = parseInt(e.target.getAttribute('data-val'));
      stars.forEach(s => {
        if (parseInt(s.getAttribute('data-val')) <= selectedRating) {
          s.style.color = 'var(--color-gold)';
        } else {
          s.style.color = 'var(--color-gray-600)';
        }
      });
    });
  });

  // Handle Submit
  if (submitBtn) {
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.replaceWith(newSubmitBtn);
    newSubmitBtn.addEventListener('click', async () => {
      if (selectedRating === 0) {
        if (typeof showToast === 'function') showToast("Please select a star rating");
        return;
      }
      newSubmitBtn.textContent = 'Submitting...';
      newSubmitBtn.disabled = true;
      const res = await submitReview(movieId, selectedRating, textInput.value);
      if (res.error) {
        if (typeof showToast === 'function') showToast(res.error);
      } else {
        if (typeof showToast === 'function') showToast("Review submitted!");
        textInput.value = '';
        selectedRating = 0;
        stars.forEach(s => s.style.color = 'var(--color-gray-600)');
        // Refresh reviews
        await loadAndDisplayReviews(movieId, reviewsList);
      }
      newSubmitBtn.textContent = 'Submit Review';
      newSubmitBtn.disabled = false;
    });
  }

  await loadAndDisplayReviews(movieId, reviewsList);
}

async function loadAndDisplayReviews(movieId, container) {
  const reviews = await fetchReviews(movieId);
  container.innerHTML = '';
  
  if (reviews.length === 0) {
    container.innerHTML = '<p style="color: var(--color-gray-400); font-style: italic;">No reviews yet. Be the first to review!</p>';
    return;
  }
  
  reviews.forEach(r => {
    const d = new Date(r.created_at).toLocaleDateString();
    const div = document.createElement('div');
    div.style = "background: var(--color-gray-900); padding: var(--space-3); border-radius: var(--radius-md);";
    
    let starsHtml = '';
    for(let i=1; i<=5; i++) {
      starsHtml += `<span style="color: ${i <= r.rating ? 'var(--color-gold)' : 'var(--color-gray-600)'}">★</span>`;
    }
    
    div.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
        <div>${starsHtml}</div>
        <div style="color: var(--color-gray-500); font-size: 0.8rem;">${d}</div>
      </div>
      <p style="color: var(--color-gray-200); font-size: 0.95rem; line-height: 1.4;">${r.review_text || ''}</p>
    `;
    container.appendChild(div);
  });
}

window.renderReviewsForMovie = renderReviewsForMovie;
