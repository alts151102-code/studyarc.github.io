/* =======================================================
   ESCROW PIGGY BANK & AUTOMATED MONTHLY DISBURSEMENTS
   ======================================================= */

function getDynamicPricing() {
  const priceOnce = APP_CONFIG.BASE_PRICE_ONCE;
  const priceAnnualMonthly = APP_CONFIG.BASE_PRICE_MONTHLY_ANNUAL;
  const priceMonthly = Math.round(priceAnnualMonthly / 12);

  return { priceOnce, priceAnnualMonthly, priceMonthly };
}

function getDynamicLockPercentage() {
  const activeStudents = Math.max(0, Number(state.activeStudentCount) || 0);
  const thousands = Math.floor(activeStudents / APP_CONFIG.PRO_LOCK_INTERVAL);
  const computed = APP_CONFIG.BASE_LOCK_PCT + (thousands * APP_CONFIG.PRO_LOCK_GROWTH);
  return Math.min(computed, APP_CONFIG.MAX_LOCK_PCT);
}

function updatePaywallLockDisplay() {
  const pricing = getDynamicPricing();
  const lockPct = getDynamicLockPercentage();

  const badge = document.getElementById('current-lock-badge');
  const lockText = document.getElementById('lock-pct-text');
  const lockBar = document.getElementById('lock-progress-bar');
  const trackedEl = document.getElementById('pro-tracked-users');
  const bumpEl = document.getElementById('pro-next-bump');

  if (badge) badge.innerText = `${lockPct}% Locked`;
  if (lockText) lockText.innerText = `${lockPct}% / ${APP_CONFIG.MAX_LOCK_PCT}% Max Lock`;
  if (lockBar) lockBar.style.width = `${lockPct}%`;

  if (trackedEl) trackedEl.innerText = `${(Number(state.activeStudentCount) || 0).toLocaleString()} Active Students`;
  const nextBumpPro = (Math.floor((Number(state.activeStudentCount) || 0) / APP_CONFIG.PRO_LOCK_INTERVAL) + 1) * APP_CONFIG.PRO_LOCK_INTERVAL;
  if (bumpEl) bumpEl.innerText = `at ${nextBumpPro.toLocaleString()} active students`;

  const tierOnceEl = document.getElementById('tier-price-once');
  const tierMoEl = document.getElementById('tier-price-monthly');
  const tierAnnualMoEl = document.getElementById('tier-price-annual-monthly');

  if (tierOnceEl) tierOnceEl.innerText = pricing.priceOnce;
  if (tierMoEl) tierMoEl.innerText = pricing.priceMonthly;
  if (tierAnnualMoEl) tierAnnualMoEl.innerText = pricing.priceAnnualMonthly;

  const selectedPlan = document.querySelector('input[name="pro-plan-type"]:checked')?.value || 'once';
  updateVaultPaymentAmount(selectedPlan);

  updateVaultPlanSelection();
  updatePaymentControls();
}

function updateVaultPaymentAmount(planType) {
  const pricing = getDynamicPricing();
  const amt = planType === 'once' ? pricing.priceOnce : pricing.priceMonthly;
  const amtEl = document.getElementById('pay-btn-amt');
  if (amtEl) amtEl.innerText = amt;
}

function updateVaultPlanSelection() {
  const selectedPlan = document.querySelector('input[name="pro-plan-type"]:checked')?.value || 'once';
  const onceCard = document.getElementById('plan-card-once');
  const monthlyCard = document.getElementById('plan-card-monthly');
  [onceCard, monthlyCard].forEach(card => {
    if (!card) return;
    const selected = card.id === `plan-card-${selectedPlan}`;
    card.classList.toggle('border-2', selected);
    card.classList.toggle('border-emerald-600', selected);
    card.classList.toggle('bg-emerald-50/40', selected);
    card.classList.toggle('dark:bg-emerald-950/20', selected);
    card.classList.toggle('bordercol', !selected);
    card.classList.toggle('dark:border-darkborder', !selected);
  });
}

function updatePaymentControls() {
  const button = document.getElementById('vault-pay-btn');
  if (!button) return;
  button.disabled = !state.authUserId || !APP_CONFIG.PAYMENT_CHECKOUT_ENDPOINT;
  button.classList.toggle('bg-ink-400', button.disabled);
  button.classList.toggle('cursor-not-allowed', button.disabled);
  button.classList.toggle('bg-mint-700', !button.disabled);
  button.classList.toggle('hover:bg-mint-800', !button.disabled);
  button.innerText = button.disabled ? 'Checkout unavailable' : 'Continue to secure checkout';
}

async function startPaymentCheckout() {
  const status = document.getElementById('vault-payment-status');
  if (!state.authUserId || !currentSession?.access_token) {
    if (status) status.innerText = 'Sign in before starting checkout.';
    return;
  }
  if (!APP_CONFIG.PAYMENT_CHECKOUT_ENDPOINT) {
    if (status) status.innerText = 'Checkout is disabled until the server-side payment gateway is configured.';
    return;
  }

  try {
    const response = await fetch(APP_CONFIG.PAYMENT_CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({
        plan: document.querySelector('input[name="pro-plan-type"]:checked')?.value || 'once'
      })
    });
    if (!response.ok) throw new Error('Secure checkout could not be started.');
    const result = await response.json();
    const checkoutUrl = new URL(result.checkoutUrl);
    if (checkoutUrl.protocol !== 'https:') throw new Error('The payment provider returned an insecure checkout URL.');
    window.location.assign(checkoutUrl.href);
  } catch (error) {
    if (status) status.innerText = error.message || 'Secure checkout could not be started.';
  }
}

function showPaymentVerificationStatus() {
  const status = document.getElementById('vault-payment-status');
  if (status) status.innerText = 'Payment status is only confirmed by the payment provider server after its verified callback.';
}