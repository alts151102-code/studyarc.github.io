let supabaseClient = null;
let currentSession = null;
const loadingAccountIds = new Set();

function showAccountStatus(message) {
  const status = document.getElementById('account-status');
  if (!status) return;
  status.innerText = message;
  status.classList.toggle('hidden', !message);
}

function isSupabaseConfigured() {
  return Boolean(APP_CONFIG.SUPABASE_URL && APP_CONFIG.SUPABASE_ANON_KEY);
}

async function startAuthProvider(provider) {
  if (!['google', 'apple'].includes(provider)) return;
  const isSignup = document.getElementById('auth-tab-signup')?.getAttribute('aria-selected') === 'true';
  if (isSignup && !document.getElementById('terms-consent')?.checked) {
    showAuthProviderNotice('Accept the Terms and Conditions before creating an account.');
    return;
  }
  if (isSignup) {
    if (window.location.protocol === 'file:') {
      showAuthProviderNotice('Run this app on localhost or HTTPS to use account sign-in.');
      return;
    }
  } else if (window.location.protocol === 'file:') {
    showAuthProviderNotice('Run this app on localhost or HTTPS to use account sign-in.');
    return;
  }
  if (!isSupabaseConfigured() || !window.supabase?.createClient) {
    showAuthProviderNotice('Account sign-in is not configured yet. Set up Supabase and its OAuth provider first.');
    return;
  }

  try {
    if (isSignup) {
      sessionStorage.setItem('studyArcNeedsOAuthProfile', 'true');
      sessionStorage.setItem('zenithTermsAcceptedAt', new Date().toISOString());
    }
    supabaseClient ||= window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href.split(/[?#]/)[0] }
    });
    if (error) throw error;
  } catch (error) {
    if (isSignup) {
      sessionStorage.removeItem('studyArcNeedsOAuthProfile');
      sessionStorage.removeItem('zenithTermsAcceptedAt');
    }
    showAuthProviderNotice(error.message || 'Account sign-in could not be started.');
  }
}

function getSupabaseClient() {
  if (!isSupabaseConfigured() || !window.supabase?.createClient) return null;
  supabaseClient ||= window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
  return supabaseClient;
}

async function signInWithPassword(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) {
    showAuthProviderNotice('Email/password login is not configured. Set up Supabase Auth first.');
    return;
  }
  const { error } = await client.auth.signInWithPassword({
    email: document.getElementById('signin-email').value.trim(),
    password: document.getElementById('signin-password').value
  });
  if (error) showAuthProviderNotice(error.message);
  else closeModal('modal-login');
}

async function signUpWithPassword(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) {
    showAuthProviderNotice('Account creation is not configured. Set up Supabase Auth first.');
    return;
  }
  if (!document.getElementById('terms-consent').checked) {
    showAuthProviderNotice('Accept the Terms and Conditions before creating an account.');
    return;
  }
  const fullName = document.getElementById('signup-real-name').value.trim();
  const username = document.getElementById('signup-username').value.trim();
  const cohortClass = document.getElementById('signup-study-stage').value;
  const { data, error } = await client.auth.signUp({
    email: document.getElementById('signup-email').value.trim(),
    password: document.getElementById('signup-password').value,
    options: {
      data: { full_name: fullName, username, cohort_class: cohortClass, terms_accepted_at: new Date().toISOString() },
      emailRedirectTo: window.location.href.split(/[?#]/)[0]
    }
  });
  if (error) {
    showAuthProviderNotice(error.message);
    return;
  }
  if (data.session?.user) {
    await loadAuthenticatedAccount(data.session.user);
    closeModal('modal-login');
  } else {
    showAuthProviderNotice('Check your email to confirm your account, then log in.');
  }
}

function getAccountStatePayload() {
  const payload = JSON.parse(JSON.stringify(state));
  delete payload.isLoggedIn;
  delete payload.userEmail;
  delete payload.authUserId;
  delete payload.isFounderUser;
  delete payload.activeStudentCount;
  delete payload.proCustomerCount;
  if (payload.user) delete payload.user.isPro;
  payload.notebooks?.forEach(notebook => {
    notebook.chapters?.forEach(chapter => delete chapter.sectionsData?.train_brain);
  });
  if (payload.user) delete payload.user.avatarUrl;
  return payload;
}

async function persistAccountState() {
  if (!supabaseClient || !state.authUserId) return;
  const { error } = await supabaseClient.from('student_state').upsert({
    user_id: state.authUserId,
    state: getAccountStatePayload(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) throw error;
  await recordUsageEvent();
}

async function recordUsageEvent() {
  if (!supabaseClient || !state.authUserId) return;
  const { error } = await supabaseClient.rpc('record_student_activity');
  if (error) throw error;
  await refreshUsageMetrics();
}

async function refreshUsageMetrics() {
  if (!supabaseClient || !state.authUserId) return;
  const { data, error } = await supabaseClient.rpc('get_public_usage_metrics');
  if (error) {
    showAccountStatus('Could not refresh usage-based access metrics.');
    return;
  }
  const metrics = Array.isArray(data) ? data[0] : data;
  state.activeStudentCount = Number(metrics?.active_students) || 0;
  updatePaywallLockDisplay();
  const ownerCount = document.getElementById('founder-active-students');
  if (ownerCount) ownerCount.innerText = state.activeStudentCount.toLocaleString();
}

async function loadAuthenticatedAccount(user) {
  if (!supabaseClient || !user?.id || state.authUserId === user.id || loadingAccountIds.has(user.id)) return;
  loadingAccountIds.add(user.id);
  try {
  const [stateResult, ownerResult, proResult] = await Promise.all([
    supabaseClient.from('student_state').select('state').eq('user_id', user.id).maybeSingle(),
    supabaseClient.from('owner_accounts').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabaseClient.rpc('get_current_user_pro')
  ]);
  const failure = stateResult.error || ownerResult.error || proResult.error;
  if (failure) {
    showAccountStatus('Account database is not ready. Apply supabase/schema.sql and try again.');
    await supabaseClient.auth.signOut();
    return;
  }

  const accountPayload = stateResult.data?.state;
  if (accountPayload && typeof accountPayload === 'object') {
    Object.assign(state, accountPayload);
  } else {
    const { error } = await supabaseClient.from('student_state').insert({ user_id: user.id, state: {} });
    if (error) {
      showAccountStatus('Could not create your account record. Please retry sign-in.');
      await supabaseClient.auth.signOut();
      return;
    }
  }

  state.authUserId = user.id;
  state.userEmail = user.email || '';
  state.isLoggedIn = true;
  state.isFounderUser = Boolean(ownerResult.data);
  state.user ||= {};
  state.user.name = state.user.name && state.user.name !== 'Candidate'
    ? state.user.name
    : user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student';
  state.user.username ||= user.user_metadata?.username || '';
  if (!accountPayload) state.user.cohortClass = user.user_metadata?.cohort_class || 'Class 12';
  state.termsAcceptedAt ||= user.user_metadata?.terms_accepted_at || sessionStorage.getItem('zenithTermsAcceptedAt') || '';
  state.user.isPro = state.isFounderUser || Boolean(proResult.data);
  if (!state.user.isPro) {
    state.focusStrictMode = false;
    if (state.theme !== 'rose') state.theme = 'rose';
  }
  await refreshProfilePicture();
  if (!accountPayload || state.termsAcceptedAt) await persistAccountState();
  sessionStorage.removeItem('zenithTermsAcceptedAt');
  const needsOAuthProfile = sessionStorage.getItem('studyArcNeedsOAuthProfile') === 'true';
  if (needsOAuthProfile) sessionStorage.removeItem('studyArcNeedsOAuthProfile');
  showAccountStatus('');
  await refreshUsageMetrics();
  renderAll();
  if (needsOAuthProfile && !accountPayload) openGoogleOnboarding(user);
  } finally {
    loadingAccountIds.delete(user.id);
  }
}

async function initializeSupabaseAuth() {
  if (!isSupabaseConfigured() || !window.supabase?.createClient) return;
  supabaseClient = window.supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
  supabaseClient.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    if (session?.user) {
      queueMicrotask(() => loadAuthenticatedAccount(session.user));
    } else if (event === 'SIGNED_OUT') {
      state.authUserId = null;
      state.userEmail = '';
      state.isLoggedIn = false;
      state.isFounderUser = false;
      state.user.isPro = false;
      renderAll();
    }
  });
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showAccountStatus('Could not restore your account session.');
    return;
  }
  currentSession = data.session;
  if (currentSession?.user) await loadAuthenticatedAccount(currentSession.user);
}

async function signOutAccount() {
  if (supabaseClient) {
    const { error } = await supabaseClient.auth.signOut();
    if (error) showAccountStatus('Could not end the account session. Please retry.');
  }
  state.authUserId = null;
  state.userEmail = '';
  state.isLoggedIn = false;
  state.isFounderUser = false;
  state.user.isPro = false;
  renderAll();
}

async function requestPaymentDestinationChange() {
  const input = document.getElementById('payment-change-upi');
  const status = document.getElementById('payment-change-status');
  const requestedUpi = input?.value.trim() || '';
  if (!state.isFounderUser || !currentSession?.access_token) {
    if (status) status.innerText = 'Only the provisioned owner can request this change.';
    return;
  }
  if (!/^[\w.-]{2,64}@[\w.-]{2,64}$/.test(requestedUpi)) {
    if (status) status.innerText = 'Enter a valid UPI ID.';
    return;
  }

  try {
    const endpoint = `${APP_CONFIG.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/request-payment-change`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ requestedUpi })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The change request could not be sent.');
    if (status) status.innerText = result.message;
    if (input) input.value = '';
  } catch (error) {
    if (status) status.innerText = error.message || 'The change request could not be sent.';
  }
}

function openProfileSettings() {
  document.getElementById('profile-real-name').value = state.user?.name || '';
  document.getElementById('profile-username-input').value = state.user?.username || '';
  document.getElementById('profile-study-stage').value = state.user?.cohortClass || 'Class 12';
  document.getElementById('profile-theme').value = state.theme || 'rose';
  document.getElementById('profile-study-goal').value = state.user?.goal || '';
  document.getElementById('profile-weakness').value = state.user?.weakness || '';
  document.getElementById('profile-settings-status').innerText = '';
  openModal('modal-profile-settings');
}

async function refreshProfilePicture() {
  if (!supabaseClient || !state.authUserId || !state.user?.avatarPath) return;
  const { data, error } = await supabaseClient.storage.from('student-avatars').createSignedUrl(state.user.avatarPath, 3600);
  if (!error && data?.signedUrl) state.user.avatarUrl = data.signedUrl;
}

async function uploadProfilePicture(file) {
  if (!file) return;
  const status = document.getElementById('profile-settings-status');
  if (!state.authUserId || !supabaseClient) {
    if (status) status.innerText = 'Sign in to upload a profile picture.';
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    if (status) status.innerText = 'Choose a JPG, PNG, or WebP image under 2 MB.';
    return;
  }
  const extension = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${state.authUserId}/avatar.${extension}`;
  const { error } = await supabaseClient.storage.from('student-avatars').upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    if (status) status.innerText = error.message;
    return;
  }
  state.user.avatarPath = path;
  await refreshProfilePicture();
}

async function saveProfileSettings(event) {
  event.preventDefault();
  const status = document.getElementById('profile-settings-status');
  const realName = document.getElementById('profile-real-name').value.trim();
  const username = document.getElementById('profile-username-input').value.trim();
  if (!realName || (username && !/^[A-Za-z0-9_]{3,24}$/.test(username))) {
    if (status) status.innerText = 'Use a real name and a username with 3-24 letters, numbers, or underscores.';
    return;
  }
  const requestedTheme = document.getElementById('profile-theme').value;
  if (requestedTheme !== 'rose' && !state.user?.isPro) {
    if (status) status.innerText = 'Premium themes require Pro. Choose Rose or view Pro plans.';
    return;
  }
  state.user.name = realName;
  state.user.username = username;
  state.user.cohortClass = document.getElementById('profile-study-stage').value;
  state.user.goal = document.getElementById('profile-study-goal').value.trim();
  state.user.weakness = document.getElementById('profile-weakness').value.trim();
  state.theme = requestedTheme;
  await uploadProfilePicture(document.getElementById('profile-picture-input').files[0]);
  saveState();
  if (status) status.innerText = 'Profile saved.';
}

async function manageProWhitelist(action) {
  const input = document.getElementById('friend-pro-email');
  const status = document.getElementById('friend-pro-status');
  const email = input?.value.trim().toLowerCase() || '';
  if (!state.isFounderUser || !currentSession?.access_token) {
    if (status) status.innerText = 'Only the provisioned owner can manage Pro access.';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['grant', 'revoke'].includes(action)) {
    if (status) status.innerText = 'Enter a valid account email.';
    return;
  }

  try {
    const endpoint = `${APP_CONFIG.SUPABASE_URL.replace(/\/$/, '')}/functions/v1/manage-pro-allowlist`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ email, action })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Pro access could not be updated.');
    if (status) status.innerText = result.message;
  } catch (error) {
    if (status) status.innerText = error.message || 'Pro access could not be updated.';
  }
}