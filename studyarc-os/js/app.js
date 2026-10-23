/* =======================================================
  STUDYARC CORE APPLICATION LOGIC & PWA CONTROLLER
   ======================================================= */

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function logOutToLanding() {
  signOutAccount();
  closeModal('modal-login');
  closeModal('modal-onboarding');
}

function configureFounderPrivileges() {
  const toggle = document.getElementById('founder-toggle-container');
  const badge = document.getElementById('role-status-badge');
  const fndNav = document.getElementById('founder-tab-nav-btn');
  if (state.isFounderUser) {
    toggle?.classList.remove('hidden');
    if (badge) badge.innerText = '👑 OWNER VIP';
    if (state.dashboardView === 'founder') fndNav?.classList.remove('hidden');
  } else {
    toggle?.classList.add('hidden');
    if (badge) badge.innerText = 'Candidate';
    fndNav?.classList.add('hidden');
  }
}

// Onboarding Steps
let currentWizardStep = 1;
let wizardSelectedClass = 'Class 12';

function startOnboardingWizard() {
  setAuthMode('signup');
  openModal('modal-login');
}

function openGoogleOnboarding(user) {
  const nameInput = document.getElementById('google-onboarding-name');
  if (nameInput) nameInput.value = user?.user_metadata?.full_name || state.user?.name || '';
  document.getElementById('google-onboarding-username').value = state.user?.username || '';
  document.getElementById('google-onboarding-stage').value = state.user?.cohortClass || 'Class 12';
  document.getElementById('google-onboarding-goal').value = state.user?.goal === 'National Top Rank' ? '' : state.user?.goal || '';
  document.getElementById('google-onboarding-weakness').value = state.user?.weakness === 'Calculation Speed' ? '' : state.user?.weakness || '';
  document.getElementById('google-onboarding-status').innerText = '';
  setGoogleOnboardingStep(1);
  openModal('modal-google-onboarding');
}

function setGoogleOnboardingStep(step) {
  const currentStep = step === 2 ? 2 : 1;
  document.getElementById('google-onboarding-step-1').classList.toggle('hidden', currentStep !== 1);
  document.getElementById('google-onboarding-step-2').classList.toggle('hidden', currentStep !== 2);
  document.getElementById('google-onboarding-step-label').innerText = `PROFILE · ${currentStep} OF 2`;
}

function advanceGoogleOnboarding() {
  const name = document.getElementById('google-onboarding-name').value.trim();
  const username = document.getElementById('google-onboarding-username').value.trim();
  const status = document.getElementById('google-onboarding-status');
  if (!name || (username && !/^[A-Za-z0-9_]{3,24}$/.test(username))) {
    if (status) status.innerText = 'Enter your real name. Username must be 3-24 letters, numbers, or underscores.';
    return;
  }
  if (status) status.innerText = '';
  setGoogleOnboardingStep(2);
}

function finishGoogleOnboarding() {
  const name = document.getElementById('google-onboarding-name').value.trim();
  const username = document.getElementById('google-onboarding-username').value.trim();
  const status = document.getElementById('google-onboarding-status');
  if (!name || (username && !/^[A-Za-z0-9_]{3,24}$/.test(username))) {
    setGoogleOnboardingStep(1);
    if (status) status.innerText = 'Enter your real name and a valid optional username.';
    return;
  }
  state.user.name = name;
  state.user.username = username;
  state.user.cohortClass = document.getElementById('google-onboarding-stage').value;
  state.user.goal = document.getElementById('google-onboarding-goal').value.trim() || 'National Top Rank';
  state.user.weakness = document.getElementById('google-onboarding-weakness').value.trim() || 'Calculation Speed';
  state.termsAcceptedAt ||= new Date().toISOString();
  saveState();
  closeModal('modal-google-onboarding');
}

function selectWizardClass(cls, btn) {
  wizardSelectedClass = cls;
  document.querySelectorAll('.wizard-class-btn').forEach(b => {
    b.className = 'wizard-class-btn p-3 rounded-xl border bordercol dark:border-darkborder font-bold';
  });
  btn.className = 'wizard-class-btn p-3 rounded-xl border-2 border-mint-700 bg-mint-50/40 dark:bg-mint-950/20 font-bold';
}

function showWizardStep(step) {
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`step-content-${i}`);
    if (el) el.classList.add('hidden');
  }
  const cur = document.getElementById(`step-content-${step}`);
  if (cur) cur.classList.remove('hidden');

  const pill = document.getElementById('onboard-step-pill');
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  if (pill) pill.innerText = `STEP ${step} OF 5`;
  if (step === 1) prevBtn?.classList.add('hidden');
  else prevBtn?.classList.remove('hidden');

  if (step === 5 && nextBtn) nextBtn.innerText = 'Start Clean Workspace ⚡';
  else if (nextBtn) nextBtn.innerText = 'Continue →';
}

function wizardNextStep() {
  startOnboardingWizard();
}

function wizardPrevStep() {
  startOnboardingWizard();
}

// PWA Install Trigger
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('pwa-install-btn-landing')?.classList.remove('hidden');
  document.getElementById('pwa-install-btn-nav')?.classList.remove('hidden');
});

function triggerPwaInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        document.getElementById('pwa-install-btn-landing')?.classList.add('hidden');
        document.getElementById('pwa-install-btn-nav')?.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  } else {
    alert('App install prompt: You can bookmark or select "Add to Home Screen" from your browser settings.');
  }
}

// Render Master
function renderAll() {
  configureFounderPrivileges();
  renderNotebookOverview();
  renderBacklog();
  renderGatekeeper();
  renderRegainShield();
  renderFocusSessionSummary();
  renderCalendar();
  updatePaywallLockDisplay();
  document.body.classList.remove('theme-mint', 'theme-twilight');
  if (state.theme === 'mint') document.body.classList.add('theme-mint');
  if (state.theme === 'twilight') document.body.classList.add('theme-twilight');

  const landing = document.getElementById('landing-intro-screen');
  const reminder = document.getElementById('pro-reminder-banner');
  const ownerBanner = document.getElementById('pro-owner-free-banner');
  const userName = document.getElementById('user-display-name');
  const userGoal = document.getElementById('user-goal-text');
  const userWeakness = document.getElementById('user-weakness-text');
  const userClass = document.getElementById('user-class-badge');
  const userLevel = document.getElementById('user-level-badge');
  const marksPane = document.getElementById('tab-marks');
  const profileDropdown = document.getElementById('profile-dropdown');
  const profileMenuName = document.getElementById('profile-menu-name');
  const profileRealName = document.getElementById('profile-menu-real-name');
  const profileEmail = document.getElementById('profile-menu-email');
  const profileUsername = document.getElementById('profile-menu-username');
  const profileInitial = document.getElementById('profile-avatar-initial');
  const profileAvatar = document.getElementById('profile-avatar-small');
  const profileAvatarLarge = document.getElementById('profile-avatar-large');
  const profileAvatarLargeInitial = document.getElementById('profile-avatar-large-initial');
  const founderAction = document.getElementById('profile-founder-action');
  const themeLabel = document.getElementById('theme-menu-label');

  if (state.isLoggedIn) {
    landing.style.display = 'none';
  } else {
    landing.style.display = 'flex';
  }
  reminder?.classList.toggle('hidden', !state.isLoggedIn || Boolean(state.user?.isPro));
  ownerBanner?.classList.toggle('hidden', !state.isFounderUser);
  profileDropdown?.classList.toggle('hidden', !state.isLoggedIn);
  if (profileMenuName) profileMenuName.innerText = state.user?.name || 'Profile';
  if (profileRealName) profileRealName.innerText = state.user?.name || 'Student';
  if (profileEmail) profileEmail.innerText = state.userEmail || '';
  if (profileUsername) profileUsername.innerText = state.user?.username ? `@${state.user.username}` : '';
  if (profileInitial) profileInitial.innerText = (state.user?.name || 'S').trim().charAt(0).toUpperCase();
  if (profileAvatar) {
    if (state.user?.avatarUrl) {
      profileAvatar.src = state.user.avatarUrl;
      profileAvatar.classList.remove('hidden');
      profileInitial?.classList.add('hidden');
    } else {
      profileAvatar.removeAttribute('src');
      profileAvatar.classList.add('hidden');
      profileInitial?.classList.remove('hidden');
    }
  }
  if (profileAvatarLarge) {
    if (state.user?.avatarUrl) {
      profileAvatarLarge.src = state.user.avatarUrl;
      profileAvatarLarge.classList.remove('hidden');
      profileAvatarLargeInitial?.classList.add('hidden');
    } else {
      profileAvatarLarge.removeAttribute('src');
      profileAvatarLarge.classList.add('hidden');
      profileAvatarLargeInitial?.classList.remove('hidden');
    }
  }
  founderAction?.classList.toggle('hidden', !state.isFounderUser);
  if (themeLabel) themeLabel.innerText = state.isDarkMode ? 'Use light theme' : 'Use dark theme';
  if (userName) userName.innerText = state.user?.name || 'Student';
  if (userGoal) userGoal.innerText = state.user?.goal || 'Set your target';
  if (userWeakness) userWeakness.innerText = state.user?.weakness || 'No focus gap yet';
  if (userClass) userClass.innerText = state.user?.cohortClass || 'Student';
  if (userLevel) userLevel.innerText = `Lvl ${state.user?.level || 1} • ${state.user?.exp || 0} EXP`;
  if (marksPane?.classList.contains('hidden') === false) renderAllLineCharts();
}

function switchTab(tabId) {
  const selectedPane = document.getElementById(tabId);
  if (!selectedPane || !selectedPane.classList.contains('tab-pane')) return false;
  if (tabId === 'tab-founder' && !state.isFounderUser) return false;

  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.toggle('hidden', pane !== selectedPane);
  });

  document.querySelectorAll('#nav-tabs-bar .tab-btn').forEach((button) => {
    const isActive = button.dataset.tab === tabId;
    button.setAttribute('aria-selected', String(isActive));
    button.classList.toggle('bg-ink-900', isActive);
    button.classList.toggle('dark:bg-surface', isActive);
    button.classList.toggle('text-white', isActive);
    button.classList.toggle('dark:text-ink-900', isActive);
    button.classList.toggle('text-ink-500', !isActive && !button.classList.contains('text-indigo-700') && !button.classList.contains('text-amber-700'));
  });

  if (tabId === 'tab-marks') renderAllLineCharts();
  if (tabId === 'tab-calendar') renderCalendar();
  return true;
}

function setAuthMode(mode) {
  const isSignup = mode === 'signup';
  const signinTab = document.getElementById('auth-tab-signin');
  const signupTab = document.getElementById('auth-tab-signup');
  document.getElementById('auth-signin-panel')?.classList.toggle('hidden', isSignup);
  document.getElementById('auth-signup-panel')?.classList.toggle('hidden', !isSignup);
  signinTab?.setAttribute('aria-selected', String(!isSignup));
  signupTab?.setAttribute('aria-selected', String(isSignup));
  signinTab?.classList.toggle('border-mint-700', !isSignup);
  signinTab?.classList.toggle('border-transparent', isSignup);
  signupTab?.classList.toggle('border-mint-700', isSignup);
  signupTab?.classList.toggle('border-transparent', !isSignup);
  document.getElementById('auth-provider-notice').innerText = '';
}

function showAuthProviderNotice(provider) {
  const notice = document.getElementById('auth-provider-notice');
  if (notice) notice.innerText = provider;
}

function syncThemeControls() {
  document.documentElement.classList.toggle('dark', state.isDarkMode);
  const icon = state.isDarkMode ? '☀️' : '🌙';
  document.getElementById('theme-icon')?.replaceChildren(icon);
  document.getElementById('theme-icon-nav')?.replaceChildren(icon);
}

function toggleDarkMode() {
  state.isDarkMode = !state.isDarkMode;
  syncThemeControls();
  saveState();
}

function setDashboardView(view) {
  if (!state.isFounderUser || !['student', 'founder'].includes(view)) return;
  state.dashboardView = view;
  saveState();
  switchTab(view === 'founder' ? 'tab-founder' : 'tab-modules');
}

function dismissProBanner() {
  document.getElementById('pro-reminder-banner')?.classList.add('hidden');
}

function openStudyPlan() {
  if (!state.user?.isPro && !state.isFounderUser) {
    switchTab('tab-pro');
    return;
  }
  renderPersonalizedStudyPlan();
  openModal('modal-ai-prescription');
}

function renderPersonalizedStudyPlan() {
  const goalInput = document.getElementById('study-plan-goal');
  const planList = document.getElementById('study-plan-items');
  const goal = String(state.user?.goal || 'your study target').trim();
  if (goalInput) goalInput.value = goal;

  const chapters = state.notebooks.flatMap(notebook =>
    (notebook.chapters || []).map(chapter => ({ ...chapter, notebookName: notebook.name }))
  );
  const priority = chapters
    .map(chapter => {
      const sections = state.customSections.filter(section => section.id !== 'train_brain');
      const solved = sections.reduce((total, section) => total + (chapter.sectionsData?.[section.id]?.solved || 0), 0);
      const target = sections.reduce((total, section) => total + (chapter.sectionsData?.[section.id]?.limit ?? section.defaultLimit ?? 0), 0);
      return { chapter, progress: target ? solved / target : 0 };
    })
    .sort((left, right) => left.progress - right.progress)[0];
  const recentMarks = state.marks.slice(0, 3);
  const averageAccuracy = recentMarks.length
    ? Math.round(recentMarks.reduce((total, mark) => total + (Number(mark.accuracy) || 0), 0) / recentMarks.length)
    : null;
  const focus = priority
    ? `Practice ${priority.chapter.name} from ${priority.chapter.notebookName}`
    : 'Add a module and chapters to identify your highest-priority practice';
  const accuracy = averageAccuracy === null
    ? 'Log a test to establish an accuracy baseline'
    : `Review errors from recent tests (${averageAccuracy}% average accuracy)`;

  if (planList) {
    planList.innerHTML = [
      { time: '30 min', task: focus },
      { time: '20 min', task: accuracy },
      { time: '10 min', task: `Review progress toward ${goal}` }
    ].map(item => `<li class="p-3 rounded border bordercol dark:border-darkborder"><strong>${item.time}</strong><span class="ml-2">${escapeHtml(item.task)}</span></li>`).join('');
  }
}

function saveStudyPlanGoal() {
  const goal = document.getElementById('study-plan-goal').value.trim();
  if (goal) state.user.goal = goal;
  saveState();
  renderPersonalizedStudyPlan();
}

function renderGatekeeper() {
  const notes = document.getElementById('gate-notes-cb');
  const dpp = document.getElementById('gate-dpp-cb');
  const badge = document.getElementById('gatekeeper-status-badge');
  const chamber = document.getElementById('backlog-chamber-unlocked');
  if (!notes || !dpp || !badge || !chamber) return;

  notes.checked = Boolean(state.gatekeeper?.notesRevised);
  dpp.checked = Boolean(state.gatekeeper?.dppCompleted);
  const completed = Number(notes.checked) + Number(dpp.checked);
  const unlocked = completed === 2;
  badge.innerText = unlocked ? 'UNLOCKED (2/2 Completed)' : `LOCKED (${completed}/2 Completed)`;
  badge.classList.toggle('bg-emerald-100', unlocked);
  badge.classList.toggle('text-emerald-800', unlocked);
  badge.classList.toggle('bg-rose-100', !unlocked);
  badge.classList.toggle('text-rose-800', !unlocked);
  chamber.classList.toggle('opacity-50', !unlocked);
  chamber.classList.toggle('pointer-events-none', !unlocked);
}

function toggleGatekeeper() {
  state.gatekeeper = {
    notesRevised: document.getElementById('gate-notes-cb').checked,
    dppCompleted: document.getElementById('gate-dpp-cb').checked
  };
  saveState();
}

let caveDurationSeconds = 25 * 60;
let caveRemainingSeconds = caveDurationSeconds;
let caveTimerInterval = null;
let caveSolvedCount = 0;
let cavePhase = 'focus';
let focusAudioContext = null;
let focusAudioSource = null;
let focusAudioGain = null;

function renderCaveTimer() {
  const clock = document.getElementById('cave-clock');
  const button = document.getElementById('cave-timer-btn');
  const alertBox = document.getElementById('cave-3min-alert');
  const resetButton = document.getElementById('cave-reset-btn');
  const phaseLabel = document.getElementById('cave-phase-label');
  const strictToggle = document.getElementById('focus-strict-toggle');
  const durationButtons = document.querySelectorAll('.cave-duration-btn');
  if (clock) {
    const minutes = Math.floor(caveRemainingSeconds / 60);
    const seconds = caveRemainingSeconds % 60;
    clock.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (phaseLabel) phaseLabel.innerText = cavePhase === 'focus' ? 'Focus block' : 'Break';
  if (button) {
    button.innerText = caveTimerInterval ? (state.focusStrictMode ? 'Strict session running' : 'Pause') : `Start ${cavePhase === 'focus' ? 'focus' : 'break'}`;
    button.disabled = Boolean(caveTimerInterval && state.focusStrictMode);
  }
  if (resetButton) resetButton.disabled = Boolean(caveTimerInterval && state.focusStrictMode);
  durationButtons.forEach(preset => { preset.disabled = Boolean(caveTimerInterval && state.focusStrictMode); });
  if (strictToggle) strictToggle.checked = Boolean(state.focusStrictMode);
  alertBox?.classList.toggle('hidden', cavePhase !== 'focus' || caveRemainingSeconds > 180 || caveRemainingSeconds === 0);
}

function openCave() {
  document.getElementById('study-cave-modal')?.classList.remove('hidden');
  renderCaveTimer();
}

function closeCave() {
  if (state.focusStrictMode && caveTimerInterval) {
    const status = document.getElementById('focus-session-status');
    if (status) status.innerText = 'Strict session is running. Exit will be available when this timer ends.';
    return;
  }
  if (caveTimerInterval) clearInterval(caveTimerInterval);
  caveTimerInterval = null;
  renderCaveTimer();
  document.getElementById('study-cave-modal')?.classList.add('hidden');
}

function toggleTimer() {
  if (caveTimerInterval && state.focusStrictMode) return;
  if (caveTimerInterval) {
    clearInterval(caveTimerInterval);
    caveTimerInterval = null;
  } else if (caveRemainingSeconds > 0) {
    caveTimerInterval = setInterval(() => {
      caveRemainingSeconds = Math.max(0, caveRemainingSeconds - 1);
      if (caveRemainingSeconds === 0) {
        clearInterval(caveTimerInterval);
        caveTimerInterval = null;
        if (cavePhase === 'focus') {
          state.focusSessions ||= [];
          state.focusSessions.push({ date: new Date().toISOString().slice(0, 10), minutes: Math.round(caveDurationSeconds / 60) });
          saveState();
          cavePhase = 'break';
          caveRemainingSeconds = caveDurationSeconds >= 50 * 60 ? 10 * 60 : 5 * 60;
        } else {
          cavePhase = 'focus';
          caveRemainingSeconds = caveDurationSeconds;
        }
        const status = document.getElementById('focus-session-status');
        if (status) status.innerText = cavePhase === 'break' ? 'Focus block complete. Take the scheduled break.' : 'Break complete. Ready for the next focus block.';
      }
      renderCaveTimer();
    }, 1000);
  }
  renderCaveTimer();
}

function resetTimer() {
  if (caveTimerInterval && state.focusStrictMode) return;
  if (caveTimerInterval) clearInterval(caveTimerInterval);
  caveTimerInterval = null;
  cavePhase = 'focus';
  caveRemainingSeconds = caveDurationSeconds;
  renderCaveTimer();
}

function setTimerDuration(minutes) {
  if (caveTimerInterval && state.focusStrictMode) return;
  const parsedMinutes = Number(minutes);
  if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) return;
  caveDurationSeconds = Math.floor(parsedMinutes * 60);
  resetTimer();
}

function setStrictFocusMode(enabled) {
  if (enabled && !state.user?.isPro && !state.isFounderUser) {
    state.focusStrictMode = false;
    const status = document.getElementById('focus-session-status');
    if (status) status.innerText = 'Strict mode is a Pro feature.';
    switchTab('tab-pro');
    renderCaveTimer();
    return;
  }
  state.focusStrictMode = Boolean(enabled);
  renderCaveTimer();
  saveState();
}

function renderFocusSessionSummary() {
  const summary = document.getElementById('focus-time-summary');
  if (!summary) return;
  state.focusSessions ||= [];
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const todayMinutes = state.focusSessions.filter(session => session.date === today).reduce((total, session) => total + session.minutes, 0);
  const weekMinutes = state.focusSessions.filter(session => new Date(`${session.date}T00:00:00Z`).getTime() >= weekStart).reduce((total, session) => total + session.minutes, 0);
  summary.innerText = `${todayMinutes} min today · ${weekMinutes} min this week`;
}

function toggleFocusSound() {
  const button = document.getElementById('focus-sound-toggle');
  const status = document.getElementById('focus-session-status');
  if (focusAudioSource) {
    focusAudioSource.stop();
    focusAudioSource = null;
    focusAudioGain = null;
    if (button) button.innerText = 'Start sound';
    return;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    if (status) status.innerText = 'Focus sound is not supported by this browser.';
    return;
  }
  focusAudioContext ||= new AudioContextClass();
  const buffer = focusAudioContext.createBuffer(1, focusAudioContext.sampleRate * 2, focusAudioContext.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < channel.length; index++) channel[index] = (Math.random() * 2 - 1) * 0.25;
  const source = focusAudioContext.createBufferSource();
  const filter = focusAudioContext.createBiquadFilter();
  focusAudioGain = focusAudioContext.createGain();
  source.buffer = buffer;
  source.loop = true;
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  focusAudioGain.gain.value = 0.035;
  source.connect(filter).connect(focusAudioGain).connect(focusAudioContext.destination);
  source.start();
  focusAudioSource = source;
  if (button) button.innerText = 'Stop sound';
  if (status) status.innerText = 'Generated low-volume noise is playing. Use the button to stop it.';
}

function addSessionProblem(correct) {
  caveSolvedCount++;
  const count = document.getElementById('cave-solved-count');
  if (count) count.innerText = caveSolvedCount;
  if (!correct) return;
  state.user.exp += 4;
  state.user.level = Math.floor(state.user.exp / 200) + 1;
  saveState();
}

function launchSprint(minutes) {
  openCave();
  setTimerDuration(minutes);
}

function renderRegainShield() {
  const button = document.getElementById('regain-shield-toggle-btn');
  if (button) button.innerText = 'Start Focus Session';
}

function toggleRegainShield() {
  state.regainShieldActive = !state.regainShieldActive;
  renderRegainShield();
  saveState();
}

// Lifecycle Init
window.addEventListener('DOMContentLoaded', () => {
  // Service Worker Registration for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration skipped', err));
  }

  syncThemeControls();
  populateCalendarPresets();
  const dailyDateInput = document.getElementById('daily-schedule-date');
  if (dailyDateInput) dailyDateInput.value = new Date().toISOString().slice(0, 10);
  renderAll();
  initializeSupabaseAuth().catch(error => showAccountStatus(error.message || 'Account setup could not be completed.'));

  document.getElementById('multi-exam-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.authUserId) {
      showAccountStatus('Sign in to save exam dates to your account.');
      return;
    }
    const name = document.getElementById('cal-exam-name').value.trim();
    const date = document.getElementById('cal-exam-date').value;
    if (!name || !date) return;
    state.trackedExams.unshift({ id: `exam-${Date.now()}`, name, date, color: HISTORICAL_ENGINE_DB[document.getElementById('cal-exam-preset').value]?.color || '#C92A2A' });
    saveState();
  });

  document.getElementById('daily-schedule-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const status = document.getElementById('daily-schedule-status');
    if (!state.authUserId) {
      if (status) status.innerText = 'Sign in to save schedules to your account.';
      return;
    }
    const added = addDailySchedule(
      document.getElementById('daily-schedule-title').value.trim(),
      document.getElementById('daily-schedule-time').value,
      document.getElementById('daily-schedule-duration').value
    );
    if (!added) {
      if (status) status.innerText = 'This day has reached the 4-item free limit.';
      return;
    }
    event.currentTarget.reset();
    document.getElementById('daily-schedule-date').value = selectedDailyDate;
    if (status) status.innerText = '';
  });

  // Keyboard shortcut for Cave
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'f' || e.key === 'F') {
      const cave = document.getElementById('study-cave-modal');
      if (cave.classList.contains('hidden')) openCave();
      else closeCave();
    }
    if (e.key === 'Escape') closeCave();
  });

  // Form Submissions
  document.getElementById('new-notebook-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('nb-input-name').value.trim();
    const subject = document.getElementById('nb-input-subject').value;
    const id = 'nb_' + Date.now();
    state.notebooks.push({ id, name, subject, chapters: [] });
    state.activeNotebookId = id;
    closeModal('modal-new-notebook');
    saveState();
  });

  document.getElementById('add-chapter-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nb = getActiveNotebook();
    const name = document.getElementById('chap-input-name').value.trim();
    const isBlocker = document.getElementById('chap-input-blocker').checked;
    if (!nb || !name) return;
    if (!nb.chapters) nb.chapters = [];
    nb.chapters.push({ id: 'chap_' + Date.now(), name, isBlocker, sectionsData: {} });
    closeModal('modal-add-chapter');
    saveState();
  });

  document.getElementById('marks-entry-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cor = parseInt(document.getElementById('m-correct-qs').value) || 0;
    const incor = parseInt(document.getElementById('m-incorrect-qs').value) || 0;
    const net = parseInt(document.getElementById('m-net-score').value) || (cor * 4 - incor);
    const tot = parseInt(document.getElementById('m-total-marks').value) || 300;
    const att = cor + incor;
    const acc = att > 0 ? parseFloat(((cor / att) * 100).toFixed(1)) : 0;

    state.marks.unshift({
      name: document.getElementById('m-test-name').value.trim(),
      track: document.getElementById('m-test-track').value,
      date: document.getElementById('m-test-date').value,
      scored: net,
      total: tot,
      correctQs: cor,
      incorrectQs: incor,
      correctMarks: cor * 4,
      negatives: incor,
      accuracy: acc
    });
    saveState();
    renderAllLineCharts();
  });

  document.getElementById('feedback-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.feedbacks.unshift({
      author: document.getElementById('fb-author').value.trim(),
      type: document.getElementById('fb-type').value,
      message: document.getElementById('fb-message').value.trim()
    });
    alert('Feedback delivered to Founder Desk.');
    closeModal('modal-feedback');
    saveState();
  });
});