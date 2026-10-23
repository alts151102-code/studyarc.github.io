/* =======================================================
   MULTI-EXAM PREDICTIVE CALENDAR & 5-YEAR SHIFTS
   ======================================================= */
let calDate = new Date();
let calendarMode = 'year';
let selectedDailyDate = new Date().toISOString().slice(0, 10);

function setCalendarView(mode) {
  if (!['year', 'daily'].includes(mode)) return;
  calendarMode = mode;
  document.getElementById('calendar-year-view')?.classList.toggle('hidden', mode !== 'year');
  document.getElementById('calendar-daily-view')?.classList.toggle('hidden', mode !== 'daily');
  document.getElementById('calendar-view-year')?.setAttribute('aria-selected', String(mode === 'year'));
  document.getElementById('calendar-view-daily')?.setAttribute('aria-selected', String(mode === 'daily'));
  document.querySelectorAll('.calendar-view-tab').forEach(button => button.classList.toggle('active', button.id === `calendar-view-${mode}`));
  renderCalendar();
}

function setCalendarYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return;
  state.calendarYear = year;
  saveState();
}

function renderCalendar() {
  state.trackedExams ||= [];
  state.dailySchedules ||= [];
  const year = Number(state.calendarYear) || new Date().getFullYear();
  const yearTitle = document.getElementById('cal-year-title');
  const yearSelect = document.getElementById('calendar-year-select');
  if (yearTitle) yearTitle.innerText = `${year} exam map`;
  if (yearSelect) {
    const years = new Set([year, new Date().getFullYear()]);
    state.trackedExams.forEach(exam => years.add(Number(exam.date?.slice(0, 4))));
    for (let offset = -1; offset <= 8; offset++) years.add(new Date().getFullYear() + offset);
    yearSelect.innerHTML = [...years].filter(item => item >= 2000 && item <= 2200).sort((a, b) => a - b)
      .map(item => `<option value="${item}" ${item === year ? 'selected' : ''}>${item}</option>`).join('');
  }
  renderYearExamMap(year);
  renderDailySchedule();
  renderTrackedExams();
}

function renderYearExamMap(year) {
  const grid = document.getElementById('calendar-year-grid');
  if (!grid) return;
  grid.innerHTML = Array.from({ length: 12 }, (_, monthIndex) => {
    const exams = state.trackedExams.filter(exam => {
      const date = new Date(`${exam.date}T00:00:00`);
      return date.getFullYear() === year && date.getMonth() === monthIndex;
    });
    const month = new Date(year, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' });
    return `<section class="rounded-lg border bordercol dark:border-darkborder bg-surface dark:bg-darksurface p-3">
      <div class="mb-2 flex items-center justify-between"><h4 class="text-sm font-bold">${month}</h4><span class="text-[10px] font-mono text-ink-500">${exams.length} exams</span></div>
      ${exams.length ? exams.map(exam => `<div class="border-t bordercol dark:border-darkborder py-2 text-xs"><span class="font-mono text-ink-500">${new Date(`${exam.date}T00:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span><span class="ml-2 font-medium">${escapeHtml(exam.name)}</span></div>`).join('') : '<p class="border-t bordercol dark:border-darkborder pt-2 text-[11px] text-ink-400">No exams planned</p>'}
    </section>`;
  }).join('');
}

function renderDailySchedule() {
  const dateInput = document.getElementById('daily-schedule-date');
  const list = document.getElementById('daily-schedule-list');
  const capacity = document.getElementById('daily-schedule-capacity');
  const addButton = document.querySelector('#daily-schedule-form button[type="submit"]');
  if (!dateInput || !list) return;
  if (!dateInput.value) dateInput.value = selectedDailyDate;
  selectedDailyDate = dateInput.value;
  const items = state.dailySchedules.filter(item => item.date === selectedDailyDate).sort((a, b) => a.time.localeCompare(b.time));
  const limit = state.user?.isPro ? Infinity : 4;
  const reachedLimit = items.length >= limit;
  if (capacity) capacity.innerText = state.user?.isPro ? `${items.length} scheduled · unlimited with Pro` : `${items.length} of 4 scheduled for this day`;
  if (addButton) {
    addButton.disabled = reachedLimit;
    addButton.innerText = reachedLimit ? 'Daily limit reached' : 'Add to day';
  }
  list.innerHTML = items.length ? items.map(item => `
    <article class="flex items-center justify-between gap-3 rounded-md border bordercol dark:border-darkborder px-3 py-2.5">
      <div class="min-w-0"><p class="truncate text-xs font-semibold">${escapeHtml(item.title)}</p><p class="text-[11px] font-mono text-ink-500">${item.time} · ${item.duration} min</p></div>
      <button onclick="deleteDailySchedule('${item.id}')" class="shrink-0 rounded px-2 py-1 text-[11px] text-pwred" aria-label="Delete ${escapeHtml(item.title)}">Remove</button>
    </article>`).join('') : '<p class="rounded-md border border-dashed bordercol dark:border-darkborder p-4 text-center text-xs text-ink-400">No study blocks planned for this date.</p>';
}

function addDailySchedule(title, time, duration) {
  const date = document.getElementById('daily-schedule-date')?.value;
  if (!date || !title || !time || !Number.isFinite(Number(duration))) return false;
  state.dailySchedules ||= [];
  const itemsForDay = state.dailySchedules.filter(item => item.date === date).length;
  if (!state.user?.isPro && itemsForDay >= 4) return false;
  state.dailySchedules.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date, title: title.trim(), time, duration: Number(duration) });
  saveState();
  return true;
}

function deleteDailySchedule(id) {
  state.dailySchedules = state.dailySchedules.filter(item => item.id !== id);
  saveState();
}

function renderTrackedExams() {
  const grid = document.getElementById('active-exams-grid');
  if (!grid) return;
  grid.innerHTML = state.trackedExams.map(exam => `
    <article class="flex items-start justify-between gap-3 rounded-lg border bordercol dark:border-darkborder bg-surface dark:bg-darksurface p-3">
      <div class="min-w-0"><p class="truncate text-xs font-semibold">${escapeHtml(exam.name)}</p><p class="mt-1 text-[11px] font-mono text-ink-500">${exam.date}</p></div>
      <button onclick="deleteTrackedExam('${exam.id}')" class="shrink-0 text-[11px] text-pwred" aria-label="Remove ${escapeHtml(exam.name)}">Remove</button>
    </article>`).join('');
}

function deleteTrackedExam(id) {
  state.trackedExams = state.trackedExams.filter(exam => exam.id !== id);
  saveState();
}

function changeCalMonth(d) { calDate.setMonth(calDate.getMonth() + d); renderCalendar(); }
function resetCalMonth() { calDate = new Date(); renderCalendar(); }

function populateCalendarPresets() {
  const sel = document.getElementById('cal-exam-preset');
  const yearSelect = document.getElementById('cal-exam-year');
  if (sel && sel.children.length === 0) {
    sel.innerHTML = Object.keys(HISTORICAL_ENGINE_DB).map(k => `
      <option value="${k}">${HISTORICAL_ENGINE_DB[k].name}</option>
    `).join('') + `<option value="custom">-- Custom Exam Name --</option>`;
  }
  if (yearSelect && yearSelect.children.length <= 2) {
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = Array.from({ length: 13 }, (_, index) => currentYear - 1 + index)
      .map(year => `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`).join('');
  }
  onPresetExamSelected();
}

function onPresetExamSelected() {
  const sel = document.getElementById('cal-exam-preset');
  const nameInput = document.getElementById('cal-exam-name');
  const year = document.getElementById('cal-exam-year').value;
  if (!sel || !nameInput) return;
  if (sel.value !== 'custom' && HISTORICAL_ENGINE_DB[sel.value]) {
    nameInput.value = `${HISTORICAL_ENGINE_DB[sel.value].name} ${year}`;
  } else {
    nameInput.value = '';
  }
}

function autoProjectSelectedExamDate() {
  const sel = document.getElementById('cal-exam-preset');
  const year = parseInt(document.getElementById('cal-exam-year').value) || 2026;
  const dateInput = document.getElementById('cal-exam-date');
  if (sel.value === 'custom') { alert('Enter date manually for custom exams.'); return; }
  const item = HISTORICAL_ENGINE_DB[sel.value];
  const mStr = String(item.targetMonth + 1).padStart(2, '0');
  const dStr = String(item.targetDay).padStart(2, '0');
  dateInput.value = `${year}-${mStr}-${dStr}`;
  alert(`⚡ Projected ${item.name} (${year}): ${year}-${mStr}-${dStr}`);
}