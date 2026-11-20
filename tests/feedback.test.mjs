// v3.2 — tab global „Feedback”: formular mailto, copiere, listă roadmap.
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { html, css, js, data, readme, gc } from './helpers/bundle.mjs';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const context = readFileSync(join(DIR, 'docs/CONTEXT.md'), 'utf8');
const metodologie = readFileSync(join(DIR, 'docs/METODOLOGIE.md'), 'utf8');
const v3test = readFileSync(join(DIR, 'tests/v3.test.mjs'), 'utf8');

function includes(haystack, needle, label) {
  assert.ok(haystack.includes(needle), `${label}: lipsește „${needle}”`);
}

/* ── 1. Navigare ────────────────────────────────────────── */
test('Feedback — link în sidebar imediat după „Despre”', () => {
  includes(html, '<a class="side-global-link" id="nav-feedback" href="#feedback" data-global="feedback">Feedback</a>', 'link Feedback');
  assert.ok(html.indexOf('id="nav-despre"') < html.indexOf('id="nav-feedback"'), 'Feedback trebuie după Despre');
  includes(html, '<section id="panel-feedback" class="global-panel" role="region" aria-labelledby="feedback-title" tabindex="-1" hidden>', 'panou Feedback');
  assert.ok(html.indexOf('id="panel-despre"') < html.indexOf('id="panel-feedback"'), 'panoul Feedback trebuie după Despre');
  includes(html, 'id="feedback-title"', 'titlu Feedback');
  assert.equal(gc.GLOBAL_PANELS.map((g) => g.id).join(','), 'glosar,faq,mituri,despre,feedback');
  assert.equal(gc.globalName('feedback'), 'Feedback');
  assert.equal(gc.parseHash('#feedback').type, 'global');
  assert.equal(gc.parseHash('#feedback').id, 'feedback');
});

/* ── 2. Formularul ──────────────────────────────────────── */
test('Formular — tip, mesaj, email opțional, butoane și regiuni ARIA', () => {
  for (const id of ['feedback-form', 'feedback-tip', 'feedback-mesaj', 'feedback-email',
    'feedback-error', 'feedback-trimite', 'feedback-copiaza', 'feedback-live']) {
    includes(html, `id="${id}"`, `element ${id}`);
  }
  for (const opt of ['value="bug"', 'value="idee"', 'value="intrebare"']) {
    includes(html, opt, `opțiune ${opt}`);
  }
  assert.match(html, /<textarea id="feedback-mesaj"[^>]*required[^>]*minlength="10"/);
  assert.match(html, /<input id="feedback-email"[^>]*type="email"/);
  includes(html, 'Trimite pe mail', 'buton de trimitere');
  includes(html, 'Copiază textul', 'buton de copiere');
  includes(html, 'id="feedback-error" role="alert"', 'eroare vizibilă');
  includes(html, 'id="feedback-live" role="status" aria-live="polite"', 'confirmare aria-live');

  const block = js.slice(js.indexOf('/* ── Feedback (v3.2)'), js.indexOf('/* ── Hash `#categorie/tab`'));
  assert.ok(block.length > 1000, 'blocul Feedback e prea scurt sau lipsă');
  assert.ok(!block.includes('alert('), 'formularul nu trebuie să folosească alert()');
  includes(js, 'feedbackOpenMail(feedbackMailto(', 'trimite prin mailto');
  includes(js, 'location.href = href;', 'deschidere prin location.href');
  includes(js, "const FEEDBACK_EMAIL = 'narcis101993@yahoo.ro';", 'destinatarul feedback-ului e configurat');
  includes(css, '.feedback-error', 'stil eroare');
  includes(css, '.roadmap-item', 'stil roadmap');
});

/* ── 3. Funcții pure ────────────────────────────────────── */
test('Validare — mesaj gol sau prea scurt dă eroare, fără alert()', () => {
  assert.equal(gc.feedbackValidate(''), 'Scrie un mesaj înainte de a trimite.');
  assert.equal(gc.feedbackValidate('     '), 'Scrie un mesaj înainte de a trimite.');
  assert.match(gc.feedbackValidate('scurt'), /minimum 10 caractere/);
  assert.equal(gc.feedbackValidate('un mesaj destul de lung'), '');
  assert.equal(gc.FEEDBACK_MIN_MESAJ, 10);
});

test('Subiect — tipul și primele cuvinte din mesaj', () => {
  assert.equal(gc.feedbackSubject('bug', 'Header-ul se mișcă la scroll'),
    '[GlitchCoin] Bug: Header-ul se mișcă la scroll');
  assert.equal(gc.feedbackSubject('idee', 'adaugă un nou tab'),
    '[GlitchCoin] Idee: adaugă un nou tab');
  assert.equal(gc.feedbackSubject('intrebare', 'De ce lipsesc datele'),
    '[GlitchCoin] Întrebare: De ce lipsesc datele');
  const lung = 'unu doi trei patru cinci șapte opt nouă zece';
  const subiect = gc.feedbackSubject('bug', lung);
  assert.ok(!subiect.includes('zece'), 'subiectul păstrează doar primele 6 cuvinte');
  assert.ok(subiect.startsWith('[GlitchCoin] Bug: unu doi trei patru cinci șapte'));
});

test('Corpul mailului — mesaj, email, versiune și adresa paginii', () => {
  const body = gc.feedbackBody('idee', '  o idee clară  ', '  user@example.com  ',
    { versiune: '3.2.1', pagina: 'file:///GlitchCoin/index.html#feedback' });
  includes(body, 'Tip: Idee', 'tip');
  includes(body, 'Mesaj:\no idee clară', 'mesaj trimis');
  includes(body, 'Email: user@example.com', 'email');
  includes(body, 'Versiune aplicație: v3.2.1', 'versiune');
  includes(body, 'Pagina: file:///GlitchCoin/index.html#feedback', 'adresa paginii');
  const faraEmail = gc.feedbackBody('bug', 'mesaj suficient de lung', '', { versiune: '3.2.1', pagina: 'x' });
  includes(faraEmail, 'Email: (opțional, nefurnizat)', 'email absent');
  assert.ok(!faraEmail.includes('undefined'), 'fără valori undefined în corp');
});

test('mailto: — destinatar configurat, subiect și corp codate corect', () => {
  const link = gc.feedbackMailto('bug', 'Butonul nu merge', '',
    { versiune: '3.2.1', pagina: 'https://exemplu.ro/#feedback' });
  assert.ok(link.startsWith('mailto:narcis101993@yahoo.ro?subject='), 'destinatarul trebuie în mailto:');
  const params = new URLSearchParams(link.slice(link.indexOf('?') + 1));
  assert.equal(params.get('subject'), '[GlitchCoin] Bug: Butonul nu merge');
  includes(params.get('body'), 'Butonul nu merge');
  includes(params.get('body'), 'Versiune aplicație: v3.2.1');
  includes(params.get('body'), 'https://exemplu.ro/#feedback');
  assert.ok(!link.includes(' '), 'spațiile trebuie codate');
  const copy = gc.feedbackCopyText('bug', 'Butonul nu merge', '', { versiune: '3.2.1', pagina: 'x' });
  includes(copy, '[GlitchCoin] Bug: Butonul nu merge\n\n', 'copierea include subiectul');
  includes(copy, 'Mesaj:\nButonul nu merge', 'copierea include corpul');
});

/* ── 4. Roadmap — doar elemente documentate ─────────────── */
test('Îmbunătățiri planulate — 3 planificate, 3 terminate, surse reale', () => {
  assert.equal((html.match(/data-stare="planificat"/g) || []).length, 3);
  assert.equal((html.match(/data-stare="terminat"/g) || []).length, 3);
  assert.equal((html.match(/data-stare="in-lucru"/g) || []).length, 0);
  for (const eticheta of ['Planificat', 'Terminat']) {
    includes(html, `>${eticheta}</span>`, `stare ${eticheta}`);
  }
  includes(html, 'Stări folosite: Planificat · În lucru · Terminat', 'vocabularul stărilor');
  includes(css, '.status-in-lucru', 'stil pentru starea În lucru');
  includes(html, 'Îmbunătățiri planulate', 'titlu secțiune');
  for (const sursa of ['t_26c18d0f', 'docs/METODOLOGIE.md', 't_e66e4039', 't_8446f449', 't_34d0eb8d']) {
    includes(html, sursa, `sursă ${sursa}`);
  }
  includes(html, 'nu promisiuni', 'limitarea listei');
  assert.ok(!/<time\s/.test(html.slice(html.indexOf('id="panel-feedback"'), html.indexOf('class="panel-nav"'))),
    'nu inventăm date pentru roadmap');
});

/* ── 5. Versiunea (6 locuri + istoric + README) ─────────── */
test('Versiunea e v3.2.1 în cele 6 locuri + istoric', () => {
  assert.equal(gc.CONFIG_AN.versiune, '3.2.1');
  includes(data, "versiune: '3.2.1'", 'data.js');
  includes(html, 'id="versiune-app">v3.2.1</span>', 'footer index.html');
  includes(v3test, "'3.2.1'", 'tests/v3.test.mjs');
  includes(readme, '## v3.2.1 — ce e nou', 'README');
  includes(context, 'v3.2.1', 'docs/CONTEXT.md');
  includes(metodologie, 'v3.2.1', 'docs/METODOLOGIE.md');
  includes(html, 'Istoric de versiuni (v1 → v3.2.1)', 'sumar istoric');
  includes(html, '<span class="v-tag">v3.2.1</span>', 'intrare istoric');
});
