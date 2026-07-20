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
  
  function updateAuthState(user) {
    currentUser = user;
    if (user) {
      if (authLink) authLink.textContent = 'Logout';
    } else {
      if (authLink) authLink.textContent = 'Login / Sign Up';
    }
  }

  function openAuthModal() {
    if (authErrorMsg) authErrorMsg.style.display = 'none';
    if (authForm) authForm.reset();
    if (authModal) authModal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    if (!authModal) return;
    authModal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function showAuthError(msg) {
    if (authErrorMsg) {
      authErrorMsg.textContent = msg;
      authErrorMsg.style.display = 'block';
    }
  }

  // --- 1. ATTACH ALL UI EVENT LISTENERS FIRST ---
  if (authLink) {
    authLink.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!isSupabaseLoaded) {
        if (typeof showToast === 'function') {
           showToast('Authentication is currently unavailable. (AdBlocker might be blocking Supabase)');
        }
        return;
      }
      if (currentUser) {
        try {
          await supabase.auth.signOut();
          if (typeof showToast === 'function') showToast('Logged out successfully');
        } catch(err) {
          console.error("Logout failed", err);
        }
      } else {
        openAuthModal();
      }
    });
  }

  if (authCloseBtn) authCloseBtn.addEventListener('click', closeAuthModal);

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  if (authLoginBtn) {
    authLoginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!authEmail.value || !authPassword.value) {
         showAuthError('Please enter both email and password.');
         return;
      }
      
      authLoginBtn.textContent = 'Logging in...';
      authLoginBtn.disabled = true;

      // SECRET TEST MODE: Bypass Supabase completely to avoid rate limits
      if (authEmail.value === 'test@test.com' && authPassword.value === 'password') {
        const dummyUser = { id: 'test-user-123', email: 'test@test.com' };
        updateAuthState(dummyUser);
        closeAuthModal();
        if (typeof showToast === 'function') showToast("Logged in successfully via Test Mode!");
        authLoginBtn.textContent = 'Login';
        authLoginBtn.disabled = false;
        return;
      }
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.value,
          password: authPassword.value,
        });
        
        if (error) throw error;
        if (typeof showToast === 'function') showToast('Welcome back!');
      } catch (err) {
        showAuthError(err.message || 'Login failed');
      } finally {
        authLoginBtn.textContent = 'Login';
        authLoginBtn.disabled = false;
      }
    });
  }

  if (authSignupBtn) {
    authSignupBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!authEmail.value || !authPassword.value) {
         showAuthError('Please enter both email and password.');
         return;
      }
      
      authSignupBtn.textContent = 'Signing up...';
      authSignupBtn.disabled = true;
      
      try {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.value,
          password: authPassword.value,
        });
        
        if (error) throw error;
        
        if (typeof showToast === 'function') showToast('Account created successfully!');
        if (!data.session) {
           if (typeof showToast === 'function') showToast('Please check your email to confirm your account.');
           closeAuthModal();
        }
      } catch (err) {
        showAuthError(err.message || 'Signup failed');
      } finally {
        authSignupBtn.textContent = 'Sign Up';
        authSignupBtn.disabled = false;
      }
    });
  }

  // --- 2. INITIALIZE SUPABASE SESSION ---
  if (isSupabaseLoaded) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      updateAuthState(session?.user || null);

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
    } catch (err) {
      console.error("Failed to initialize Supabase session. Local storage may be blocked.", err);
      isSupabaseLoaded = false; // Disable auth features if it crashes
    }
  } else {
    console.warn("Supabase client is not initialized. Auth features will be disabled.");
  }
}

// Allow external scripts to check user
function getCurrentUser() {
  return currentUser;
}
