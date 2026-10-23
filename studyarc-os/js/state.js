/* =======================================================
   CENTRAL STATE PERSISTENCE & TRANSIENT STORAGE
   ======================================================= */
// Temporary runtime memory for Train Ur Brain (never synced to the account database)
let sessionTransientBrainData = {};

const defaultState = {
  isLoggedIn: false,
  userEmail: '',
  authUserId: null,
  isFounderUser: false,
  isDarkMode: false,
  dashboardView: 'student',
  activeStudentCount: 0,
  user: {
    name: 'Candidate',
    age: 17,
    cohortClass: 'Class 12',
    goal: 'National Top Rank',
    weakness: 'Calculation Speed',
    exp: 0,
    level: 1,
    isPro: false,
    username: '',
    avatarPath: '',
    avatarUrl: ''
  },
  regainShieldActive: false,
  focusStrictMode: false,
  theme: 'rose',
  focusSessions: [],
  feedbacks: [],
  customSections: [...APP_CONFIG.DEFAULT_SECTIONS],
  activeNotebookId: null,
  notebooks: [],
  marksTrackFilter: 'Milestone',
  marks: [],
  trackedExams: [
    { id: 'ex-1', name: 'Target Exam Mock #1', date: '2026-01-23', color: '#0B7A53' }
  ],
  calendarYear: new Date().getFullYear(),
  dailySchedules: [],
  gatekeeper: { notesRevised: false, dppCompleted: false },
  calendarEvents: {}
};

let state = loadState();

function loadState() {
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  if (state.authUserId && typeof persistAccountState === 'function') {
    persistAccountState().catch(error => showAccountStatus(error.message));
  }
  renderAll();
}