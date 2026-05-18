/**
 * Show a sub-info panel (a clicked part / sub-topic). With the new full-screen
 * layout there is no persistent description pane — info always shows in the
 * modal. The lesson body lives in the modal too (main.js refreshes it on
 * lesson change), so restoreLesson just re-populates the modal.
 */
import { LESSONS } from '../lessons.js';

export function showPartInfo({ lessonIdx, title, html }) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <button class="action" id="backBtn" style="margin-bottom:14px;">← Back to lesson</button>
    ${html}
  `;
  document.getElementById('modalScrim').classList.remove('hidden');
  document.getElementById('backBtn').addEventListener('click', () => restoreLesson(lessonIdx));
}

export function restoreLesson(lessonIdx) {
  const l = LESSONS[lessonIdx];
  if (!l) return;
  document.getElementById('modalTitle').textContent = l.title;
  document.getElementById('modalBody').innerHTML = l.bodyHtml;
}

export function clearOriginal() { /* no-op in new layout */ }
