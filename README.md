# Idéverksted

Nettside som lager ideer til apper og Minecraft-modder med Gemini eller OpenAI. Hver idé har funksjoner, verktøy, vanskelighet og byggeplan.

## Kom i gang

Du trenger Node 22.9 eller nyere. Ingen pakker må installeres.

1. Kopier `.env.example` til `.env` og legg inn minst én API-nøkkel.
2. Kjør `npm start`.
3. Åpne http://localhost:3000.

Kjør testene med `npm test`.

## Filer

- `backend/server.mjs`: webserver. API-nøklene blir her og sendes aldri til nettleseren.
- `backend/ideas.mjs`: prompt, kall til Gemini og OpenAI, og sjekk av svaret.
- `backend/ideas.test.mjs`: tester.
- `frontend/`: selve nettsiden.

## Før publisering

Serveren lytter bare på din egen maskin. Legg til innlogging eller grense for antall forespørsler før den legges ut på nett, ellers kan hvem som helst bruke opp API-kvoten din.
