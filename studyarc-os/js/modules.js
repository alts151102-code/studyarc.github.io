/* =======================================================
   MULTIPLE MODULE NOTEBOOKS & TRANSIENT PRACTICE UNITS
  Train Ur Brain (#2): 0 EXP, never synced to the account database.
   ======================================================= */

function getActiveNotebook() {
  let nb = state.notebooks.find(n => n.id === state.activeNotebookId);
  if (!nb && state.notebooks.length > 0) {
    nb = state.notebooks[0];
    state.activeNotebookId = nb.id;
  }
  return nb;
}

function renderNotebookOverview() {
  const grid = document.getElementById('module-shelf-grid');
  const countEl = document.getElementById('module-shelf-count');
  if (countEl) countEl.innerText = state.notebooks.length;

  if (grid) {
    grid.innerHTML = state.notebooks.map(nb => {
      const isActive = nb.id === state.activeNotebookId;
      const chapCount = (nb.chapters || []).length;
      return `
        <div onclick="state.activeNotebookId='${nb.id}'; saveState();" class="p-4 rounded-xl border ${isActive ? 'border-2 border-mint-700 bg-mint-50/20' : 'bordercol dark:border-darkborder'} cursor-pointer card-shadow flex flex-col justify-between transition space-y-2">
          <div>
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-ink-100 dark:bg-darkcanvas text-ink-700 dark:text-ink-300 font-bold">${nb.subject}</span>
            <h4 class="font-bold text-sm mt-1.5 line-clamp-1">${escapeHtml(nb.name)}</h4>
            <p class="text-[11px] text-ink-500 font-mono">${chapCount} Chapters</p>
          </div>
          <div class="pt-2 flex items-center justify-between border-t bordercol dark:border-darkborder text-[11px] font-mono">
            <span>Select to View</span>
            <button onclick="event.stopPropagation(); deleteModuleNotebook('${nb.id}')" class="text-ink-400 hover:text-pwred p-0.5">Delete</button>
          </div>
        </div>
      `;
    }).join('') + `
      <div onclick="openModal('modal-new-notebook')" class="p-4 rounded-xl border border-dashed bordercol dark:border-darkborder hover:bg-ink-100/50 dark:hover:bg-darksurface cursor-pointer card-shadow flex flex-col items-center justify-center text-center transition min-h-[110px] space-y-1">
        <div class="w-7 h-7 rounded-full bg-ink-100 dark:bg-darkcanvas flex items-center justify-center font-bold text-sm">+</div>
        <span class="text-xs font-bold">+ Add Multiple Module</span>
        <span class="text-[10px] text-ink-500">Physics, Chemistry, Maths</span>
      </div>
    `;
  }

  const nb = getActiveNotebook();
  const list = document.getElementById('chapters-accordion-list');
  if (!list) return;

  if (!nb) {
    document.getElementById('nb-title-display').innerText = 'No Module Selected';
    document.getElementById('nb-overall-percentage').innerText = '0%';
    list.innerHTML = `
      <div class="py-8 text-center text-xs text-ink-400 border border-dashed bordercol dark:border-darkborder rounded-xl">
        Clean workspace. Click "+ Add Multiple Module" above to add your first book or sheet.
      </div>
    `;
    return;
  }

  document.getElementById('nb-title-display').innerText = nb.name;
  document.getElementById('nb-subject-tag').innerText = nb.subject;

  if (!nb.chapters || nb.chapters.length === 0) {
    list.innerHTML = `
      <div class="py-8 text-center text-xs text-ink-400 border border-dashed bordercol dark:border-darkborder rounded-xl">
        No chapters in this module. Click "+ Add Chapter" above.
      </div>
    `;
    document.getElementById('nb-overall-percentage').innerText = '0%';
    return;
  }

  list.innerHTML = nb.chapters.map(chap => {
    const sectionsHtml = state.customSections.map(sec => {
      let sData;
      if (sec.id === 'train_brain') {
        const key = `${chap.id}_train_brain`;
        if (!sessionTransientBrainData[key]) sessionTransientBrainData[key] = { limit: 10, solved: 0 };
        sData = sessionTransientBrainData[key];
      } else {
        sData = (chap.sectionsData && chap.sectionsData[sec.id]) 
          ? chap.sectionsData[sec.id] 
          : { limit: sec.defaultLimit || 20, solved: 0 };
      }

      const pct = sData.limit > 0 ? Math.min(100, Math.round((sData.solved / sData.limit) * 100)) : 0;

      return `
        <div class="p-3 rounded-lg border bordercol dark:border-darkborder bg-canvas dark:bg-darkcanvas space-y-1.5 ${sec.id === 'train_brain' ? 'border-amber-300 dark:border-amber-800' : ''}">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-xs">${escapeHtml(sec.name)}</span>
              ${sec.id === 'train_brain' 
                ? '<span class="text-[9px] font-mono text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-1 py-0.2 rounded ml-1 font-bold">0 EXP • Transient</span>'
                : `<span class="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded ml-1">+${sec.exp} EXP</span>`
              }
            </div>
            <div class="flex items-center gap-1 font-mono text-xs">
              <input type="number" min="0" value="${sData.solved}" onchange="updateSectionCount('${chap.id}', '${sec.id}', 'solved', this.value)" class="w-11 px-1 py-0.5 rounded border bordercol dark:border-darkborder text-center font-bold bg-surface dark:bg-darksurface">
              <span class="text-ink-400">/</span>
              <input type="number" min="1" value="${sData.limit}" onchange="updateSectionCount('${chap.id}', '${sec.id}', 'limit', this.value)" class="w-11 px-1 py-0.5 rounded border bordercol dark:border-darkborder text-center text-ink-500 bg-surface dark:bg-darksurface">
              <button onclick="incSectionSolved('${chap.id}', '${sec.id}', 1)" class="px-1.5 py-0.5 rounded border bordercol dark:border-darkborder text-[10px]">+1</button>
            </div>
          </div>

          <div class="flex items-center gap-2 text-[10px] font-mono text-ink-500">
            <div class="w-full bg-ink-200/60 dark:bg-darkborder h-1.5 rounded-full overflow-hidden">
              <div class="${sec.id === 'train_brain' ? 'bg-amber-600' : 'bg-mint-700'} h-full rounded-full transition-all duration-300" style="width: ${pct}%;"></div>
            </div>
            <span class="w-9 text-right font-bold">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="p-4 rounded-xl border bordercol dark:border-darkborder bg-surface dark:bg-darksurface card-shadow space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-bold text-sm flex items-center gap-2">
              <span>${escapeHtml(chap.name)}</span>
              ${chap.isBlocker ? '<span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/40 text-pwred font-bold">Blocker</span>' : ''}
            </h4>
          </div>
          <button onclick="deleteChapter('${chap.id}')" class="text-ink-400 hover:text-pwred text-xs font-mono">Delete</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          ${sectionsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderBacklog() {
  const blockersContainer = document.getElementById('blockers-backlog-container');
  const independentContainer = document.getElementById('independent-backlog-container');
  if (!blockersContainer || !independentContainer) return;

  const chapters = state.notebooks.flatMap(notebook =>
    (notebook.chapters || []).map(chapter => ({ ...chapter, notebookName: notebook.name }))
  );

  const renderChapter = chapter => {
    const sections = state.customSections.filter(section => section.id !== 'train_brain');
    const solved = sections.reduce((total, section) =>
      total + (chapter.sectionsData?.[section.id]?.solved || 0), 0
    );
    const target = sections.reduce((total, section) =>
      total + (chapter.sectionsData?.[section.id]?.limit ?? section.defaultLimit ?? 0), 0
    );

    return `
      <div class="flex items-center justify-between gap-3 p-2.5 rounded border bordercol dark:border-darkborder">
        <div class="min-w-0">
          <strong class="block truncate">${escapeHtml(chapter.name)}</strong>
          <span class="text-[10px] text-ink-500">${escapeHtml(chapter.notebookName)}</span>
        </div>
        <span class="shrink-0 font-mono text-[11px]">${solved}/${target}</span>
      </div>
    `;
  };

  const blockers = chapters.filter(chapter => chapter.isBlocker);
  const independent = chapters.filter(chapter => !chapter.isBlocker);
  blockersContainer.innerHTML = blockers.length
    ? blockers.map(renderChapter).join('')
    : '<p class="text-ink-400">No prerequisite blockers.</p>';
  independentContainer.innerHTML = independent.length
    ? independent.map(renderChapter).join('')
    : '<p class="text-ink-400">No independent units yet.</p>';
}

function updateSectionCount(chapId, secId, field, val) {
  const num = parseInt(val) || 0;
  if (secId === 'train_brain') {
    const key = `${chapId}_train_brain`;
    if (!sessionTransientBrainData[key]) sessionTransientBrainData[key] = { limit: 10, solved: 0 };
    sessionTransientBrainData[key][field] = Math.max(0, num);
    renderNotebookOverview();
    return; // 0 EXP & excluded from storage
  }

  const nb = getActiveNotebook();
  const chap = nb.chapters.find(c => c.id === chapId);
  if (!chap) return;
  if (!chap.sectionsData) chap.sectionsData = {};
  if (!chap.sectionsData[secId]) chap.sectionsData[secId] = { limit: 20, solved: 0 };
  
  chap.sectionsData[secId][field] = Math.max(0, num);

  if (field === 'solved') {
    const sec = state.customSections.find(s => s.id === secId);
    state.user.exp += sec ? sec.exp : 1;
    state.user.level = Math.floor(state.user.exp / 200) + 1;
  }
  saveState();
}

function incSectionSolved(chapId, secId, delta) {
  if (secId === 'train_brain') {
    const key = `${chapId}_train_brain`;
    if (!sessionTransientBrainData[key]) sessionTransientBrainData[key] = { limit: 10, solved: 0 };
    sessionTransientBrainData[key].solved = Math.max(0, (sessionTransientBrainData[key].solved || 0) + delta);
    renderNotebookOverview();
    return; // 0 EXP & excluded from storage
  }

  const nb = getActiveNotebook();
  const chap = nb.chapters.find(c => c.id === chapId);
  if (!chap) return;
  if (!chap.sectionsData) chap.sectionsData = {};
  if (!chap.sectionsData[secId]) chap.sectionsData[secId] = { limit: 20, solved: 0 };

  chap.sectionsData[secId].solved = Math.max(0, (chap.sectionsData[secId].solved || 0) + delta);
  const sec = state.customSections.find(s => s.id === secId);
  state.user.exp += (sec ? sec.exp : 1) * delta;
  state.user.level = Math.floor(state.user.exp / 200) + 1;
  saveState();
}

function deleteChapter(chapId) {
  const nb = getActiveNotebook();
  if (!confirm('Delete this chapter unit?')) return;
  nb.chapters = nb.chapters.filter(c => c.id !== chapId);
  saveState();
}

function deleteModuleNotebook(nbId) {
  if (state.notebooks.length <= 1) {
    alert('At least one module notebook must remain active.');
    return;
  }
  if (!confirm('Delete this entire module?')) return;
  state.notebooks = state.notebooks.filter(n => n.id !== nbId);
  state.activeNotebookId = state.notebooks[0].id;
  saveState();
}