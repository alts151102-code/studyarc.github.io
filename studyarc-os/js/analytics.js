/* =======================================================
   PURE LINE GRAPH ANALYTICS
   ======================================================= */
let lineChart1 = null, lineChart2 = null, lineChart3 = null, lineChart4 = null;

function setMarksExamTrack(track) {
  state.marksTrackFilter = track;
  renderAllLineCharts();
}

function renderAllLineCharts() {
  if (typeof Chart === 'undefined') return;
  const pane = document.getElementById('tab-marks');
  if (pane && pane.classList.contains('hidden')) return;

  const track = state.marksTrackFilter;
  const data = track === 'All' ? state.marks : state.marks.filter(m => m.track === track);

  const labels = data.map(m => m.name || m.date);
  const netMarks = data.map(m => m.scored);
  const correctMarks = data.map(m => m.correctMarks || (m.correctQs * 4));
  const incorrectMarks = data.map(m => m.negatives || m.incorrectQs);
  const accuracies = data.map(m => m.accuracy);

  const c1 = document.getElementById('lineChartNetScore');
  if (c1) {
    if (lineChart1) { try { lineChart1.destroy(); } catch(e){} }
    lineChart1 = new Chart(c1.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Mock 1', 'Mock 2'],
        datasets: [{
          label: 'Net Score',
          data: labels.length ? netMarks : [145, 185],
          borderColor: '#0B7A53',
          backgroundColor: 'rgba(11, 122, 83, 0.08)',
          fill: true,
          tension: 0.35
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const c2 = document.getElementById('lineChartCorrectMarks');
  if (c2) {
    if (lineChart2) { try { lineChart2.destroy(); } catch(e){} }
    lineChart2 = new Chart(c2.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Mock 1', 'Mock 2'],
        datasets: [{
          label: 'Correct (+4)',
          data: labels.length ? correctMarks : [160, 200],
          borderColor: '#1D4ED8',
          backgroundColor: 'rgba(29, 78, 216, 0.08)',
          fill: true,
          tension: 0.35
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const c3 = document.getElementById('lineChartIncorrectMarks');
  if (c3) {
    if (lineChart3) { try { lineChart3.destroy(); } catch(e){} }
    lineChart3 = new Chart(c3.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Mock 1', 'Mock 2'],
        datasets: [{
          label: 'Penalties (-1)',
          data: labels.length ? incorrectMarks : [12, 6],
          borderColor: '#C92A2A',
          backgroundColor: 'rgba(201, 42, 42, 0.08)',
          fill: true,
          tension: 0.35
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const c4 = document.getElementById('lineChartAccuracy');
  if (c4) {
    if (lineChart4) { try { lineChart4.destroy(); } catch(e){} }
    lineChart4 = new Chart(c4.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Mock 1', 'Mock 2'],
        datasets: [{
          label: 'Accuracy %',
          data: labels.length ? accuracies : [80, 88],
          borderColor: '#6D28D9',
          backgroundColor: 'rgba(109, 40, 217, 0.08)',
          fill: true,
          tension: 0.35
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  const tbody = document.getElementById('marks-table-tbody');
  if (tbody) {
    tbody.innerHTML = data.map((m, idx) => `
      <tr class="hover:bg-ink-100/40 dark:hover:bg-darkcanvas">
        <td class="py-2.5 px-2 font-mono">${m.date}</td>
        <td class="py-2.5 px-2 font-medium">${escapeHtml(m.name)}</td>
        <td class="py-2.5 px-2 font-mono font-bold">${m.scored}/${m.total}</td>
        <td class="py-2.5 px-2 font-mono text-blue-700">+${m.correctMarks || (m.correctQs*4)}</td>
        <td class="py-2.5 px-2 font-mono text-pwred">-${m.negatives || m.incorrectQs}</td>
        <td class="py-2.5 px-2 font-mono font-bold">${m.accuracy}%</td>
        <td class="py-2.5 px-2 text-right">
          <button onclick="state.marks.splice(${idx}, 1); saveState();" class="text-ink-400 hover:text-pwred font-mono text-xs">Delete</button>
        </td>
      </tr>
    `).join('');
  }
}

function recalcMarksForm() {
  const cor = parseInt(document.getElementById('m-correct-qs').value) || 0;
  const incor = parseInt(document.getElementById('m-incorrect-qs').value) || 0;
  document.getElementById('m-net-score').value = (cor * 4) - incor;
}