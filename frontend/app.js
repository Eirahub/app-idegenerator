const form = document.getElementById('idea-form');
const generateButton = document.getElementById('generate');
const providerSelect = document.getElementById('provider');
const providerNote = document.getElementById('provider-note');
const ideasEl = document.getElementById('ideas');
const titleEl = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const canvas = document.getElementById('canvas');

const TITLES = { mod: 'Minecraft-modder', app: 'Apper' };
const LEVEL_NAMES = { nybegynner: 'Nybegynner', litt: 'Litt erfaren', erfaren: 'Erfaren' };

// Shown before the first generation, so the screen shows what you will get.
const EXAMPLES = {
  mod: [{
    title: 'Glødende sopphage',
    pitch: 'En mod med sopp som lyser i mørket og vokser til trapper du kan klatre på. Perfekt for hemmelige huler.',
    features: ['Ny soppblokk som gir lys', 'Beinmel får soppen til å vokse i høyden', 'Oppskrift på lyssuppe som gir nattsyn'],
    tools: ['MCreator', 'Minecraft Java Edition'],
    difficulty: 2,
    steps: ['Lag den nye soppblokken og gi den lys', 'Tegn en egen tekstur med sterke farger', 'La beinmel gjøre soppen høyere', 'Legg til oppskriften på lyssuppe'],
    challenge: 'Få soppen til å spre seg sakte til blokkene rundt.',
  }, {
    title: 'Vulkanske verktøy',
    pitch: 'Smi verktøy av lavastein som graver raskere, men slites fort. Du må velge mellom fart og holdbarhet.',
    features: ['Ny malm som finnes nær lava', 'Hakke og spade av lavastein', 'Verktøyene setter fyr på treblokker'],
    tools: ['MCreator', 'Minecraft Java Edition'],
    difficulty: 3,
    steps: ['Lag malmen og plasser den i en testverden', 'Lag hakken og gi den høy gravefart', 'Legg til oppskrifter for begge verktøyene', 'Sett fyr på treblokker som blir truffet'],
    challenge: 'Lag en rustning av lavastein som tåler ild.',
  }],
  app: [{
    title: 'Klassens hundedagbok',
    pitch: 'En app der klassen følger en oppdiktet hund gjennom uka. Alle kan mate, lufte og gi den nye triks.',
    features: ['Hunden blir sulten og trøtt over tid', 'Knapper for å mate, lufte og trene', 'Lagrer framgangen i nettleseren'],
    tools: ['HTML', 'CSS', 'JavaScript'],
    difficulty: 1,
    steps: ['Tegn hunden og vis den på siden', 'Lag knapper som endrer humøret', 'Få sult og trøtthet til å telle over tid', 'Lagre tilstanden så den er der neste gang'],
    challenge: 'Legg til tre triks som må læres i riktig rekkefølge.',
  }, {
    title: 'Lunsjjakten',
    pitch: 'Et spill i nettleseren der du tar imot bestillinger i en travel kantine. Bestillingene kommer stadig raskere.',
    features: ['Tilfeldige bestillinger på skjermen', 'Poeng for riktig mat i tide', 'Vanskeligere for hver runde'],
    tools: ['HTML', 'CSS', 'JavaScript'],
    difficulty: 2,
    steps: ['Vis en bestilling og tre matknapper', 'Gi poeng når riktig knapp trykkes', 'Legg til en nedtelling for hver bestilling', 'Gjør runden raskere når poengene øker'],
    challenge: 'Lagre den beste poengsummen på maskinen.',
  }],
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function list(className, items) {
  const ul = el('ul', className);
  for (const item of items) ul.append(el('li', '', item));
  return ul;
}

function blocksMeter(level) {
  const meter = el('span', 'blocks');
  meter.setAttribute('role', 'img');
  meter.setAttribute('aria-label', `Vanskelighet ${level} av 5`);
  const row = el('i');
  for (let n = 1; n <= 5; n++) row.append(el('b', n <= level ? 'on' : ''));
  meter.append(row, el('span', '', `Vanskelighet ${level} av 5`));
  return meter;
}

// Model output is only inserted with textContent, never as HTML.
function ideaCard(idea, badge) {
  const card = el('article', 'idea');

  const main = el('div', 'idea-main');
  const head = el('div', 'idea-head');
  const heading = el('h2', '', idea.title);
  head.append(heading, blocksMeter(idea.difficulty));
  main.append(head);
  if (badge) {
    const badgeRow = el('div', 'tools');
    badgeRow.append(el('span', 'pill', badge));
    main.append(badgeRow);
  }
  main.append(el('p', 'pitch', idea.pitch));

  if (idea.features.length) {
    const features = el('div');
    features.append(el('p', 'label', 'Dette kan den'), list('features', idea.features));
    main.append(features);
  }
  if (idea.tools.length) {
    const tools = el('div');
    const pills = el('div', 'tools');
    for (const tool of idea.tools) pills.append(el('span', 'pill', tool));
    tools.append(el('p', 'label', 'Verktøy'), pills);
    main.append(tools);
  }

  const plan = el('div', 'plan');
  const steps = el('ol', 'steps');
  for (const step of idea.steps) steps.append(el('li', '', step));
  plan.append(el('p', 'label', 'Byggeplan'), steps);
  if (idea.challenge) {
    const challenge = el('p', 'challenge');
    challenge.append(el('b', '', 'Ekstra utfordring: '), idea.challenge);
    plan.append(challenge);
  }

  card.append(main, plan);
  return card;
}

function loadingCard() {
  const card = el('article', 'idea');
  card.setAttribute('aria-hidden', 'true');
  const main = el('div', 'idea-main');
  main.append(el('span', 'bar tall'), el('span', 'bar'), el('span', 'bar short'), el('span', 'bar'), el('span', 'bar short'));
  const plan = el('div', 'plan');
  plan.append(el('span', 'bar short'), el('span', 'bar'), el('span', 'bar'), el('span', 'bar'), el('span', 'bar short'));
  card.append(main, plan);
  return card;
}

function selectedKind() {
  return new FormData(form).get('kind');
}

let hasResults = false;
let loading = false;

function showExample() {
  const kind = selectedKind();
  titleEl.textContent = TITLES[kind];
  subtitleEl.textContent = 'Slik ser ideene ut. Dine ideer kommer her.';
  ideasEl.replaceChildren(...EXAMPLES[kind].map((idea) => ideaCard(idea, 'Eksempel')));
}

function showError(message) {
  const box = el('div', 'error');
  box.setAttribute('role', 'alert');
  const text = el('p');
  text.append(el('span', 'pill', 'Feil'), message);
  const retry = el('button', 'btn', 'Prøv igjen');
  retry.type = 'button';
  retry.addEventListener('click', () => form.requestSubmit());
  box.append(text, retry);
  ideasEl.replaceChildren(box);
  statusEl.textContent = '';
}

function setLoading(isLoading) {
  loading = isLoading;
  updateButton();
}

function updateButton() {
  const usable = providerSelect.selectedOptions[0] && !providerSelect.selectedOptions[0].disabled;
  generateButton.disabled = loading || !usable;
  if (loading) generateButton.textContent = 'Lager ideer …';
  else generateButton.textContent = hasResults ? 'Lag 3 nye ideer' : 'Lag 3 ideer';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (loading) return;
  const data = new FormData(form);
  const payload = {
    kind: data.get('kind'),
    level: data.get('level'),
    theme: data.get('theme'),
    provider: data.get('provider'),
  };

  setLoading(true);
  titleEl.textContent = TITLES[payload.kind];
  subtitleEl.textContent = 'Lager ideer. Det tar ofte rundt et halvt minutt.';
  statusEl.textContent = 'Lager ideer.';
  ideasEl.replaceChildren(loadingCard(), loadingCard(), loadingCard());
  if (window.matchMedia('(max-width: 1000px)').matches) canvas.scrollIntoView({ block: 'start' });

  try {
    const response = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Noe gikk galt. Prøv igjen.');

    hasResults = true;
    const theme = payload.theme.trim();
    const parts = [theme ? `Tema: ${theme}` : 'Fritt tema', LEVEL_NAMES[payload.level], `Laget med ${result.model}`];
    subtitleEl.textContent = parts.join(' · ');
    ideasEl.replaceChildren(...result.ideas.map((idea) => ideaCard(idea)));
    statusEl.textContent = `${result.ideas.length} ideer er klare.`;
  } catch (error) {
    subtitleEl.textContent = 'Ingen nye ideer denne gangen.';
    const offline = error instanceof TypeError;
    showError(offline ? 'Fikk ikke kontakt med serveren. Kjører den?' : error.message);
  } finally {
    setLoading(false);
  }
});

form.addEventListener('change', (event) => {
  if (event.target.name === 'kind' && !hasResults && !loading) showExample();
  if (event.target.name === 'provider') updateButton();
});

document.getElementById('suggestions').addEventListener('click', (event) => {
  if (event.target.matches('.chip')) form.elements.theme.value = event.target.textContent;
});

async function loadProviders() {
  try {
    const response = await fetch('/api/config');
    const { providers } = await response.json();
    for (const provider of providers) {
      const option = new Option(provider.available ? provider.label : `${provider.label} (ikke satt opp)`, provider.id);
      option.disabled = !provider.available;
      providerSelect.add(option);
    }
    const first = providers.find((provider) => provider.available);
    if (first) providerSelect.value = first.id;
    else providerNote.textContent = 'Ingen API-nøkkel funnet. Legg GEMINI_API_KEY eller OPENAI_API_KEY i .env og start serveren på nytt.';
    const missing = providers.filter((provider) => !provider.available);
    if (first && missing.length) {
      providerNote.textContent = `Legg ${missing.map((provider) => provider.keyName).join(' og ')} i .env for å bruke ${missing.map((provider) => provider.label).join(' og ')}.`;
    }
  } catch {
    providerNote.textContent = 'Fikk ikke kontakt med serveren. Kjører den?';
  }
  updateButton();
}

showExample();
loadProviders();
