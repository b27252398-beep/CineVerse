/* ==========================================================================
   auth.js — Handles Supabase authentication and UI state
   ========================================================================== */

let currentUser = null;

async function initAuth() {
  const authLink = document.getElementById('authLink');
  const authModal = document.getElementById('authModal');
  const authCloseBtn = document.getElementById('authCloseBtn');
  const authForm = document.getElementById('authForm');
  const authLoginBtn = document.getElementById('authLoginBtn');
  const authSignupBtn = document.getElementById('authSignupBtn');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authErrorMsg = document.getElementById('authErrorMsg');

  let isSupabaseLoaded = typeof supabase !== 'undefined';
  if (!isSupabaseLoaded) {
    console.error("Supabase client is not initialized. Auth features will be disabled.");
    // We do NOT return early here, because we still want to attach event listeners 
    // to the UI buttons so they show a helpful error instead of doing nothing.
  }

  // Check initial session (only if loaded)
  if (isSupabaseLoaded) {
    const { data: { session } } = await supabase.auth.getSession();
    updateAuthState(session?.user || null);

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      updateAuthState(session?.user || null);
      if (event === 'SIGNED_IN') {
        closeAuthModal();
        if (window.loadFavoritesFromCloud) window.loadFavoritesFromCloud();
      } else if (event === 'SIGNED_OUT') {
        if (window.clearFavoritesCache) window.clearFavoritesCache();
        if (window.location.hash === '#favorites') {
           window.location.hash = '';
           document.querySelector('.navbar__link[href="index.html"]')?.click();
        }
      }
    });
  }

  function updateAuthState(user) {
    currentUser = user;
    if (user) {
      authLink.textContent = 'Logout';
    } else {
      authLink.textContent = 'Login / Sign Up';
    }
  }

  function openAuthModal() {
    authErrorMsg.style.display = 'none';
    authForm.reset();
    authModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  if (authLink) {
    authLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!isSupabaseLoaded) {
        showToast('Authentication is currently unavailable. (AdBlocker might be blocking Supabase)');
        return;
      }
      if (currentUser) {
        await supabase.auth.signOut();
        showToast('Logged out successfully');
      } else {
        openAuthModal();
      }
    });
  }

  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);

  // Close on outside click
  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Login handler
  if (authLoginBtn) {
    authLoginBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Don't submit form natively
    if (!authEmail.value || !authPassword.value) {
       showAuthError('Please enter both email and password.');
       return;
    }
    
    authLoginBtn.textContent = 'Logging in...';
    authLoginBtn.disabled = true;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.value,
      password: authPassword.value,
    });
    
    authLoginBtn.textContent = 'Login';
    authLoginBtn.disabled = false;
    
    if (error) {
      showAuthError(error.message);
    } else {
      showToast('Welcome back!');
    }
  });

  // Sign up handler
  if (authSignupBtn) {
    authSignupBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!authEmail.value || !authPassword.value) {
         showAuthError('Please enter both email and password.');
         return;
      }
      
      authSignupBtn.textContent = 'Signing up...';
      authSignupBtn.disabled = true;
      
      const { data, error } = await supabase.auth.signUp({
        email: authEmail.value,
        password: authPassword.value,
      });
      
      authSignupBtn.textContent = 'Sign Up';
      authSignupBtn.disabled = false;
      
      if (error) {
        showAuthError(error.message);
      } else {
        // Supabase auto signs in if email confirmation is off (default for tests)
        showToast('Account created successfully!');
        if (!data.session) {
           showToast('Please check your email to confirm your account.');
           closeAuthModal();
        }
      }
    });
  }

  function showAuthError(msg) {
    authErrorMsg.textContent = msg;
    authErrorMsg.style.display = 'block';
  }
}

// Allow external scripts to check user
function getCurrentUser() {
  return currentUser;
}
