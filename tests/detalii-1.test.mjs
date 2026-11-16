// Verificări pentru „Detalii 1" (2026-11-16):
//   1. click pe un tab din sidebar derulează la începutul panoului, nu la mijloc;
//   2. butoanele „Deschide …" nu se suprapun peste textul de dedesubt.
// Verificarea cu browser real (click pe toate cele 24 de taburi + cele 20 de
// butoane „Deschide/Vezi/Testează", 1440px și 390px) a rulat pe disc.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { css, js } from './helpers/bundle.mjs';

/* ── 1. Derularea la începutul panoului ─────────────────────
   `activateTab` ascundea panoul „Acasă" DUPA `scrollIntoView`. Atunci
   ținta se calcula cu „Acasă" încă vizibil (docH mai mare) și, la
   ascundere, pagina rămânea prea jos — click pe „Inflație" arăta
   „Prețurile la alimentele de bază" în vârful ecranului. */

test('activateTab — „Acasă" se ascunde înainte de scrollIntoView', () => {
  const start = js.indexOf('function activateTab(');
  assert.ok(start !== -1, 'activateTab există');
  const end = js.indexOf('\nfunction ', start + 10);
  const body = js.slice(start, end === -1 ? undefined : end);

  const hide = body.indexOf('homePanel.hidden = true');
  const scroll = body.indexOf('panel.scrollIntoView(');
  assert.ok(hide !== -1, 'activateTab ascunde panoul „Acasă"');
  assert.ok(scroll !== -1, 'activateTab apelează scrollIntoView pe panou');
  assert.ok(hide < scroll, '„Acasă" trebuie ascuns înainte de derulare');
});

test('activateHome / activateGlobal — ascund panoul celălalt înainte de derulare', () => {
  // Aceste două căi erau deja corecte; le păstrăm aici ca gard.
  const homeBody = js.slice(js.indexOf('function activateHome('), js.indexOf('function activateGlobal('));
  assert.ok(homeBody.indexOf('pnl.setAttribute(\'hidden\', \'\')') < homeBody.indexOf('home.scrollIntoView('),
    'activateHome ascunde taburile înainte de derulare');

  const globalBody = js.slice(js.indexOf('function activateGlobal('), js.indexOf('/* ── Săgeți Precedent/Următor'));
  assert.ok(globalBody.indexOf('home.hidden = true') < globalBody.indexOf('panel.scrollIntoView('),
    'activateGlobal ascunde „Acasă" înainte de derulare');
});

/* ── 2. Spațierea butoanelor „Deschide …" ──────────────────
   `.note` are `margin-top: -8px` (se lipiște de tabelul de deasupra),
   dar un rând de chip-uri `.presets` nu avea niciun margin-bottom —
   notele de sub ele se suprapuneau exact 8 px peste butoane. */

test('.presets are margin-bottom (nu se suprapune peste .note)', () => {
  const block = css.slice(css.indexOf('.presets {'), css.indexOf('.chip {'));
  assert.match(block, /margin-bottom:\s*18px/, '.presets are margin-bottom');
  assert.match(css, /\.inputs \.presets\s*\{\s*margin-bottom:\s*0/, 
    '.inputs .presets nu trebuie să ridice rândul de presete (flex align-end)');
});

test('.note păstrează margin-top: -8px (de aceea e nevoie de margin pe .presets)', () => {
  assert.match(css, /\.note\s*\{[^}]*margin:\s*-8px 0 18px/, '.note rămâne lipit de tabel');
});
