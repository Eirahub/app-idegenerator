import test from 'node:test';
import assert from 'node:assert/strict';
import { UserError, generateIdeas, normalizeIdeas, validateRequest } from './ideas.mjs';

const idea = {
  title: 'Månebasen',
  pitch: 'Bygg en base på månen.',
  features: ['Ny blokk'],
  tools: ['MCreator'],
  difficulty: 2,
  steps: ['Lag blokken'],
  challenge: 'Legg til lyd.',
};
const request = { kind: 'mod', level: 'nybegynner', theme: 'romfart' };

function fakeFetch(responseBody, status = 200) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return new Response(JSON.stringify(responseBody), { status });
  };
  return { calls, fetchImpl };
}

test('validateRequest accepts valid input and trims the theme', () => {
  assert.deepEqual(validateRequest({ kind: 'app', level: 'litt', theme: '  dyr ' }), { kind: 'app', level: 'litt', theme: 'dyr' });
});

test('validateRequest rejects unknown values, prototype keys and long themes', () => {
  assert.throws(() => validateRequest({ kind: 'spill', level: 'litt' }), UserError);
  assert.throws(() => validateRequest({ kind: 'constructor', level: 'litt' }), UserError);
  assert.throws(() => validateRequest({ kind: 'app', level: 'toString' }), UserError);
  assert.throws(() => validateRequest({ kind: 'app', level: 'litt', theme: 'x'.repeat(201) }), UserError);
});

test('normalizeIdeas clamps difficulty, caps at three and drops broken ideas', () => {
  const ideas = normalizeIdeas({ ideas: [{ ...idea, difficulty: 9 }, { title: 'Tom' }, idea, idea, idea] });
  assert.equal(ideas.length, 3);
  assert.equal(ideas[0].difficulty, 5);
  assert.throws(() => normalizeIdeas({ ideas: [] }), UserError);
});

test('Gemini: sends key in header and parses the answer', async () => {
  const { calls, fetchImpl } = fakeFetch({ candidates: [{ content: { parts: [{ text: JSON.stringify({ ideas: [idea] }) }] } }] });
  const result = await generateIdeas({ providerId: 'gemini', request, env: { GEMINI_API_KEY: 'test-key' }, fetchImpl });
  assert.equal(result.ideas[0].title, 'Månebasen');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'test-key');
  assert.ok(!calls[0].url.includes('test-key'));
  assert.match(calls[0].body.contents[0].parts[0].text, /romfart/);
});

test('OpenAI: uses strict schema and parses the answer', async () => {
  const { calls, fetchImpl } = fakeFetch({
    output: [
      { type: 'reasoning', summary: [] },
      { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ ideas: [idea] }) }] },
    ],
  });
  const result = await generateIdeas({ providerId: 'openai', request, env: { OPENAI_API_KEY: 'test-key', OPENAI_MODEL: 'test-model' }, fetchImpl });
  assert.equal(result.ideas[0].title, 'Månebasen');
  assert.equal(result.model, 'test-model');
  assert.equal(calls[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-key');
  assert.equal(calls[0].body.text.format.strict, true);
});

test('a missing key gives a clear error without any request', async () => {
  const { calls, fetchImpl } = fakeFetch({});
  await assert.rejects(generateIdeas({ providerId: 'openai', request, env: {}, fetchImpl }), /OPENAI_API_KEY/);
  assert.equal(calls.length, 0);
});

test('provider errors become friendly messages without leaking the response', async (t) => {
  t.mock.method(console, 'error', () => {});
  const { fetchImpl } = fakeFetch({ error: { message: 'secret detail' } }, 429);
  await assert.rejects(generateIdeas({ providerId: 'gemini', request, env: { GEMINI_API_KEY: 'k' }, fetchImpl }), (error) => {
    assert.equal(error.status, 429);
    assert.ok(!error.message.includes('secret detail'));
    return true;
  });
});
