// P1/4 — Scenarii A/B salvate local + tabel comparativ.
// Teste în stilul `tests/detalii-*.test.mjs`: verifică atât codul sursă
// (montare, accesibilitate, neîntreruperea lui resetAll), cât și logica
// pură a componentului (salvare / încărcare / comparare / ștergere).
// Rulează: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { html, js, css, gc, readme } from './helpers/bundle.mjs';

// Obiectele vin din contextul vm; le aducem în prototype-ul gazdă pentru
// deepStrictEqual (aceeași precauție ca în tests/config-guard.test.mjs).
const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeStore() {
  const data = new Map();
  return {
    data,
    setItem(k, v) { data.set(k, String(v)); },
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    removeItem(k) { data.delete(k); },
  };
}

const snapA = {
  panel: 'buget',
  fields: [
    { id: 'bg-venit', label: 'Venit', value: '5000' },
    { id: 'bg-nevoi', label: 'Nevoi', value: '2500' },
  ],
  outputs: [{ id: 'bg-summary', label: 'Rezumat · Buget', text: 'Rezultat A' }],
};
const snapB = {
  panel: 'buget',
  fields: [
    { id: 'bg-venit', label: 'Venit', value: '5000' },
    { id: 'bg-nevoi', label: 'Nevoi', value: '1500' },
    { id: 'bg-economii', label: 'Economii', value: '1000' },
  ],
  outputs: [{ id: 'bg-summary', label: 'Rezumat · Buget', text: 'Rezultat B' }],
};

/* ── 1. Montare pe cele 6 taburi nucleu ──────────────────── */

test('cele 6 taburi nucleu au câte o gazdă .ab-widget, fără duplicare', () => {
  assert.deepEqual(plain(gc.AB_CORE_TABS),
    ['inflatie', 'timp', 'dobanda', 'compusa', 'randament', 'buget']);
  for (const id of gc.AB_CORE_TABS) {
    assert.ok(html.includes(`id="panel-${id}"`), `lipsește panoul ${id}`);
    assert.equal((html.match(new RegExp(`data-ab-panel="${id}"`, 'g')) || []).length, 1,
      `gazda widgetului pentru ${id} trebuie să fie unică`);
  }
  const hosts = html.match(/class="ab-widget" data-ab-panel="/g) || [];
  assert.equal(hosts.length, 6, 'exact 6 gazde în HTML');
  assert.match(js, /const AB_CORE_TABS = \['inflatie', 'timp', 'dobanda', 'compusa', 'randament', 'buget'\]/);
});

test('widgetul se montează automat dintr-un singur punct (initScenarii)', () => {
  const init = js.slice(js.indexOf('function init()'), js.indexOf("document.addEventListener('DOMContentLoaded', init)"));
  assert.match(init, /initScenarii\(\);/, 'init montează scenariile');
  const mount = js.slice(js.indexOf('function initScenarii('), js.indexOf('function initScenarii(') + 400);
  assert.match(mount, /querySelectorAll\('\.ab-widget\[data-ab-panel\]'\)\.forEach\(abBuildWidget\)/);
  // Nicio înregistrare manuală per tab: nu există apelări abBuildWidget în init.
  assert.ok(!init.includes('abBuildWidget'), 'extinderea nu cere cod per tab');
});

test('fiecare panou nucleu are un summary etichetat pentru tabel', () => {
  const summaryIds = { inflatie: 'sim-summary', timp: 'timp-summary', dobanda: 'dob-summary', compusa: 'comp-a-summary', randament: 'rand-summary', buget: 'bg-summary' };
  for (const [tab, id] of Object.entries(summaryIds)) {
    const tag = html.match(new RegExp(`<p id="${id}"[^>]*>`));
    assert.ok(tag, `lipsește summary-ul #${id}`);
    assert.match(tag[0], /class="summary"/, '#summary trebuie să aibă clasa summary');
    assert.match(tag[0], /data-ab-label="/, `${tab}: summary-ul trebuie etichetat`);
  }
});

/* ── 2. Butoane, tastatură, tabel cu anteturi asociate ───── */

test('widgetul are exact 4 butoane native, focalizabile', () => {
  const widget = js.slice(js.indexOf('function abBuildWidget('), js.indexOf('function initScenarii('));
  // 3 situri de apel: unul în bucla A/B (→ 2 butoane) + două explicite (→ 4).
  const calls = widget.match(/\baddButton\(/g) || [];
  assert.equal(calls.length, 3);
  assert.match(widget, /AB_SLOTS\.forEach\(\(slot\) => addButton\('Salvează ' \+ slot/);
  assert.match(widget, /btn\.type = 'button'/, 'butoanele nu submit forme');
  assert.match(widget, /btn\.textContent = text/);
  for (const text of ['Salvează ', 'Arată comparația', 'Șterge scenariile']) {
    assert.ok(widget.includes(text), `lipsește butonul „${text}”`);
  }
  assert.match(widget, /addEventListener\('click', onClick\)/);
  assert.ok(!widget.includes('tabindex'), 'nu scoatem butoanele de la navigarea cu Tab');
  assert.match(widget, /diff\.panel !== panelId/, 'widgetul nu afișează scenarii din alt panou');
});

test('tabelul are caption și anteturi scope=col / scope=row, fără innerHTML', () => {
  const render = js.slice(js.indexOf('function abRenderComparison('), js.indexOf('function abBuildWidget('));
  assert.match(render, /document\.createElement\('caption'\)/);
  assert.match(render, /th\.setAttribute\('scope', 'col'\)/);
  assert.match(render, /th\.setAttribute\('scope', 'row'\)/);
  assert.match(render, /td\.textContent = value/, 'valorile sunt text, nu HTML');
  assert.ok(!render.includes('innerHTML'), 'nu injectăm snapshotul ca HTML');
  assert.match(render, /Nicio diferență/, 'stare explicită când scenariile sunt identice');
});

test('CSS: butoane mici, focus vizibil, tabel care nu face overflow la 390px', () => {
  assert.match(css, /\.ab-btn\s*\{[\s\S]*?min-height: 32px/);
  assert.match(css, /\.ab-btn:focus-visible\s*\{\s*outline:/);
  assert.match(css, /\.ab-table\s*\{[\s\S]*?table-layout: fixed/);
  assert.match(css, /\.ab-table th,\s*\.ab-table td\s*\{[\s\S]*?white-space: normal/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /@media print\s*\{[\s\S]*?\.ab-actions[\s\S]*?display: none/);
});

/* ── 3. Chei, salvare, încărcare, ștergere ───────────────── */

test('cheile de stocare sunt exact glitchcoin-scenario:A / :B', () => {
  assert.equal(gc.AB_PREFIX, 'glitchcoin-scenario:');
  assert.deepEqual(plain(gc.AB_SLOTS), ['A', 'B']);
  assert.equal(gc.abScenarioKey('A'), 'glitchcoin-scenario:A');
  assert.equal(gc.abScenarioKey('B'), 'glitchcoin-scenario:B');
});

test('salvare + încărcare păstrează snapshotul complet (câmpuri și summary)', () => {
  const store = fakeStore();
  assert.equal(gc.abSaveScenario('A', snapA, store), true);
  assert.equal(store.data.get('glitchcoin-scenario:A'), JSON.stringify(snapA));
  const loaded = plain(gc.abLoadScenario('A', store));
  assert.deepEqual(loaded, plain(snapA));
  assert.equal(loaded.fields.length, 2);
  assert.equal(loaded.outputs[0].text, 'Rezultat A');
});

test('salvarea e refuzată pentru slot necunoscut; datele corupte sunt ignorate', () => {
  const store = fakeStore();
  assert.equal(gc.abSaveScenario('C', snapA, store), false);
  assert.equal(store.data.size, 0);
  assert.equal(gc.abLoadScenario('A', store), null);
  store.setItem('glitchcoin-scenario:A', '{nu e json');
  assert.equal(gc.abLoadScenario('A', store), null);
  store.setItem('glitchcoin-scenario:A', JSON.stringify({ panel: 'buget' }));
  assert.equal(gc.abLoadScenario('A', store), null, 'shape invalid respins');
});

test('stocarea blocată nu aruncă erori: salvarea pine, încărcarea dă null', () => {
  const blocked = {
    setItem() { throw new Error('blocked'); },
    getItem() { throw new Error('blocked'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.equal(gc.abSaveScenario('A', snapA, blocked), false);
  assert.equal(gc.abLoadScenario('A', blocked), null);
  assert.doesNotThrow(() => gc.abClearScenarios(blocked));
});

test('ștergerea elimină doar cheile A/B, nu și inputurile salvate', () => {
  const store = fakeStore();
  gc.abSaveScenario('A', snapA, store);
  gc.abSaveScenario('B', snapB, store);
  store.setItem('glitchcoin-input:bg-venit', '5000');
  gc.abClearScenarios(store);
  assert.equal(gc.abLoadScenario('A', store), null);
  assert.equal(gc.abLoadScenario('B', store), null);
  assert.equal(store.getItem('glitchcoin-input:bg-venit'), '5000');
  assert.equal(store.data.size, 1);
});

/* ── 4. Comparația: doar câmpurile care diferă + rezultatele ── */

test('comparatia include doar câmpurile diferite, dar toate summary-urile', () => {
  const diff = plain(gc.abDiffSnapshots(snapA, snapB));
  assert.equal(diff.panel, 'buget');
  assert.deepEqual(diff.fields.map((f) => f.id), ['bg-nevoi', 'bg-economii']);
  assert.equal(diff.fields.find((f) => f.id === 'bg-nevoi').a, '2500');
  assert.equal(diff.fields.find((f) => f.id === 'bg-nevoi').b, '1500');
  assert.equal(diff.fields.find((f) => f.id === 'bg-economii').a, '—');
  assert.ok(!diff.fields.some((f) => f.id === 'bg-venit'), 'câmp identic exclus');
  assert.deepEqual(diff.outputs.map((o) => [o.a, o.b]), [['Rezultat A', 'Rezultat B']]);
});

test('comparatia refuză scenarii din panouri diferite sau lipsă', () => {
  assert.equal(gc.abDiffSnapshots(null, snapB), null);
  assert.equal(gc.abDiffSnapshots(snapA, null), null);
  assert.equal(gc.abDiffSnapshots({ ...snapA, panel: 'timp' }, snapB), null);
  const identical = plain(gc.abDiffSnapshots(snapA, snapA));
  assert.deepEqual(identical.fields, [], 'identice → niciun câmp de arătat');
  assert.equal(identical.outputs.length, 1, 'rezultatul se arată oricum');
});

test('snapshotul colectează toate inputurile/selecturile panoului și summary-ul', () => {
  const el = (id, type, value) => ({ id, type, value, dataset: {}, getAttribute: () => null });
  const input = el('timp-venit', 'number', '5000');
  const select = el('rand-tip-venit', 'select-one', 'dobanda');
  const hiddenBtn = el('btn', 'button', 'x');
  const summary = {
    id: 'timp-summary',
    dataset: { abLabel: 'Rezumat · Timp vs dorințe' },
    textContent: '  32.141 minute  ',
  };
  const panel = {
    querySelectorAll(selector) {
      if (selector === 'input[id], select[id]') return [input, select, hiddenBtn];
      if (selector === '.summary[id]') return [summary];
      if (selector === 'label[for]') {
        return [{
          getAttribute: () => 'timp-venit',
          textContent: ' Venit lunar ?tooltip lung care nu trebuie să apară',
          childNodes: {
            0: { nodeType: 3, textContent: ' Venit lunar ' },
            1: { nodeType: 1, textContent: '?tooltip lung care nu trebuie să apară' },
            length: 2, // NodeList, nu Array — ca în DOM-ul real
          },
        }];
      }
      return [];
    },
  };
  const snap = plain(gc.abCollectSnapshot(panel, 'timp'));
  assert.equal(snap.panel, 'timp');
  assert.deepEqual(snap.fields, [
    { id: 'timp-venit', label: 'Venit lunar', value: '5000' },
    { id: 'rand-tip-venit', label: 'rand-tip-venit', value: 'dobanda' },
  ]);
  assert.ok(!snap.fields.some((f) => f.id === 'btn'), 'butoanele nu sunt câmpuri');
  assert.deepEqual(snap.outputs, [{ id: 'timp-summary', label: 'Rezumat · Timp vs dorințe', text: '32.141 minute' }]);
});

/* ── 5. resetAll păstrează scenariile; fără rețea ────────── */

test('resetAll nu șterge scenariile (prefix exclus din persistClear)', () => {
  const clear = js.slice(js.indexOf('function persistClear('), js.indexOf('/* ── Buton „Resetează tot\"'));
  assert.match(clear, /startsWith\(PERSIST_PREFIX\) && !k\.startsWith\(AB_PREFIX\)/);
  const reset = js.slice(js.indexOf('function resetAll('), js.indexOf('/* ── Temă'));
  assert.ok(!reset.includes('abClearScenarios'), 'resetAll nu cheamă ștergerea explicită');
  assert.match(reset, /persistClear\(\)/);
  assert.match(readme, /„Resetează tot” NU șterge scenariile A\/B/, 'decizia e documentată în README');
});

test('componentul e complet local: fără fetch / XHR / formular', () => {
  const component = js.slice(js.indexOf('/* ═══ 27. Scenarii A/B'), js.indexOf('/* ═══ Inițializare'));
  for (const banned of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'action=', 'navigator.sendBeacon']) {
    assert.ok(!component.includes(banned), `componentul nu trebuie să folosească ${banned}`);
  }
  assert.ok(js.includes('glitchcoin-scenario:A` / `:B'), 'cheile sunt documentate în cod');
});
