	/* =======================================================
   CENTRAL APP CONFIGURATION
   ======================================================= */
const APP_CONFIG = {
  APP_NAME: 'StudyArc',
  FOUNDER_NAME: 'Tirth Solanki',
  FOUNDER_AGE: 15,
  FOUNDER_GOOGLE_EMAIL: 'alt.s151102@gmail.com',
  INSTAGRAM_URL: 'https://www.instagram.com/preg.tirth.nant?srtk=MXBxbnd4cmxoemZ2aA==',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  PAYMENT_CHECKOUT_ENDPOINT: '',

  BASE_PRICE_ONCE: 200,            // ₹200 / year paid once
  BASE_PRICE_MONTHLY_ANNUAL: 300,  // ₹300 / year total in monthly installments
  BASE_LOCK_PCT: 10,               // 10% base lock
  PRO_LOCK_INTERVAL: 1000,         // +5% lock every 1,000 active students
  PRO_LOCK_GROWTH: 5,
  MAX_LOCK_PCT: 60,                // 60% lock cap

  // Question sections (#2 is Train Ur Brain, 0 EXP, transient memory)
  DEFAULT_SECTIONS: [
    { id: 'dpp', name: '0. Problem Sheets (DPPs)', exp: 1, defaultLimit: 15 },
    { id: 'solved', name: '1. Solved Examples', exp: 1, defaultLimit: 20 },
    { id: 'train_brain', name: '2. Train Ur Brain', exp: 0, defaultLimit: 10, isTransient: true },
    { id: 'conceptual', name: '3. Conceptual Problems', exp: 2, defaultLimit: 25 },
    { id: 'school', name: '4. Standard Subjective Practice', exp: 1, defaultLimit: 20 },
    { id: 'prabal', name: '5. Core National Practice (Ex 1)', exp: 3, defaultLimit: 40 },
    { id: 'parikshit', name: '6. High-Difficulty Problem Unit (Ex 2)', exp: 5, defaultLimit: 30 },
    { id: 'pyq', name: '7. Previous Year Archive (PYQs)', exp: 4, defaultLimit: 50 },
    { id: 'challengers', name: '8. Challenge / Olympiad Units', exp: 8, defaultLimit: 15 }
  ]
};

const HISTORICAL_ENGINE_DB = {
  'jee-main-s1': { name: 'Main Target - Session 1', targetMonth: 0, targetDay: 23, color: '#0B7A53' },
  'jee-main-s2': { name: 'Main Target - Session 2', targetMonth: 3, targetDay: 4, color: '#1D4ED8' },
  'jee-adv': { name: 'Advanced Competitive Stage', targetMonth: 4, targetDay: 17, color: '#C92A2A' },
  'bitsat-s1': { name: 'Standard Technical Entrance', targetMonth: 4, targetDay: 20, color: '#B45309' }
};