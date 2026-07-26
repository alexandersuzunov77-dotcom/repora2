import { getState, update, activeProgram, newProgramDays } from '../store.js';
import { bindClicks, bindInputs, escapeHtml } from '../components/dom.js';
import { uid } from '../utils.js';
import { openExercisePicker } from '../components/exercisePicker.js';

export function render(container) {
  const s = getState();
  const programs = s.programs;
  const p = activeProgram(s);

  container.innerHTML = `
    <div style="margin-bottom:18px;">
      <div class="eyebrow">PROGRAM BUILDER</div>
      <div class="flex" style="flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;">
        ${programs.map((prog) => `
          <button data-action="select-program" data-id="${prog.id}" class="pill ${prog.id === p.id ? '' : 'outline'}" style="cursor:pointer;border:none;font-size:12px;padding:8px 15px;">${escapeHtml(prog.name)}</button>
        `).join('')}
        <button data-action="new-program" class="btn" style="padding:7px 12px;">+ New program</button>
      </div>
    </div>

    <!-- Active program: rename GUI + delete -->
    <div class="card" style="padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <label class="stat-label" style="margin:0;">PROGRAM NAME</label>
      <input type="text" data-field="prog-name" value="${escapeHtml(p.name)}" placeholder="Name this program…"
        style="flex:1;min-width:220px;font-family:'Oswald';font-size:20px;font-weight:700;color:var(--text-heading);background:var(--surface);border:1px solid var(--chip-border);border-radius:8px;padding:9px 13px;">
      <button class="btn" data-action="delete-program" ${programs.length <= 1 ? 'disabled style="opacity:.4;cursor:default;"' : ''}>Delete program</button>
    </div>

    <!-- Day rows (each day laid out horizontally) -->
    <div class="flex-col gap-8">
      ${p.days.map((day, di) => `
        <div class="card" style="overflow:hidden;display:flex;align-items:stretch;">
          <div style="flex:0 0 152px;padding:10px 12px;border-right:1px solid #1c212b;display:flex;flex-direction:column;justify-content:center;gap:5px;">
            <div style="font-family:'Oswald';font-weight:600;font-size:11px;letter-spacing:1.5px;color:var(--text-ghost);">${day.day}</div>
            <input type="text" data-field="day-focus" data-day="${di}" value="${escapeHtml(day.focus)}" placeholder="Workout name"
              title="Rename this day's workout"
              style="width:100%;font-family:'Oswald';font-weight:700;font-size:14px;color:var(--text-heading);background:var(--surface);border:1px solid var(--surface-border);border-radius:6px;padding:5px 8px;">
          </div>
          <div style="flex:1;min-width:0;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
            ${day.exercises.map((it, ei) => `
              <div class="chip" style="cursor:pointer;position:relative;display:flex;align-items:center;gap:6px;max-width:230px;" data-action="edit-exercise" data-day="${di}" data-ex="${ei}">
                <span style="min-width:0;">${escapeHtml(it.name)}</span>
                <button class="chip-del" title="Delete exercise" data-action="delete-exercise" data-day="${di}" data-ex="${ei}">✕</button>
              </div>
            `).join('')}
            ${day.off ? `<span class="mono" style="color:var(--text-disabled);font-size:11px;padding:4px 8px;">— rest day —</span>` : ''}
            <button class="mono" style="color:var(--text-ghost);font-size:11px;padding:5px 9px;background:none;border:1px dashed var(--dash-border);border-radius:6px;cursor:pointer;" data-action="add-exercise" data-day="${di}">+ add</button>
            <button class="mono" style="color:var(--text-ghost);font-size:10px;padding:4px 6px;background:none;border:none;cursor:pointer;text-decoration:underline;margin-left:auto;" data-action="toggle-off" data-day="${di}">${day.off ? 'make training day' : 'mark rest day'}</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  bindClicks(container, {
    'select-program': (el) => {
      update((draft) => { draft.activeProgramId = el.dataset.id; });
      render(container);
    },
    'new-program': () => {
      const id = uid('prog');
      update((draft) => {
        draft.programs.push({ id, name: `Program ${draft.programs.length + 1}`, days: newProgramDays() });
        draft.activeProgramId = id;
      });
      render(container);
    },
    'delete-program': () => {
      if (s.programs.length <= 1) return;
      if (!confirm(`Delete “${p.name}”? This can’t be undone.`)) return;
      update((draft) => {
        draft.programs = draft.programs.filter((prog) => prog.id !== draft.activeProgramId);
        draft.activeProgramId = draft.programs[0].id;
      });
      render(container);
    },
    'edit-exercise': (el) => {
      const di = parseInt(el.dataset.day, 10);
      const ei = parseInt(el.dataset.ex, 10);
      const current = p.days[di].exercises[ei];
      const val = prompt('Exercise (blank to remove):', current.name);
      if (val === null) return;
      update((draft) => {
        const days = activeProgram(draft).days;
        if (val.trim() === '') days[di].exercises.splice(ei, 1);
        else days[di].exercises[ei].name = val.trim();
      });
      render(container);
    },
    'delete-exercise': (el, e) => {
      e.stopPropagation();
      const di = parseInt(el.dataset.day, 10);
      const ei = parseInt(el.dataset.ex, 10);
      update((draft) => { activeProgram(draft).days[di].exercises.splice(ei, 1); });
      render(container);
    },
    'add-exercise': (el) => {
      const di = parseInt(el.dataset.day, 10);
      openExercisePicker({
        title: `Add exercise · ${p.days[di].day}`,
        onSelect: (ex) => {
          update((draft) => {
            const day = activeProgram(draft).days[di];
            day.exercises.push({
              id: uid('ex'), name: ex.name, target: `${ex.muscle} · ${ex.equipment}`,
              weight: '0 lb', sets: '3', reps: '8', rpe: '',
            });
            day.off = false;
          });
          render(container);
        },
      });
    },
    'toggle-off': (el) => {
      const di = parseInt(el.dataset.day, 10);
      update((draft) => {
        const day = activeProgram(draft).days[di];
        day.off = !day.off;
      });
      render(container);
    },
  });

  // Live edits: write on every keystroke without re-rendering so the field
  // keeps focus (and you can tab across all seven day inputs freely).
  bindInputs(container, (el, e) => {
    const field = el.dataset.field;
    if (field === 'prog-name') {
      update((draft) => { activeProgram(draft).name = el.value; });
      // Re-render on blur/enter so the program tabs pick up the new name.
      if (e.type === 'change') render(container);
    } else if (field === 'day-focus') {
      const di = parseInt(el.dataset.day, 10);
      update((draft) => { activeProgram(draft).days[di].focus = el.value; });
    }
  });
}
