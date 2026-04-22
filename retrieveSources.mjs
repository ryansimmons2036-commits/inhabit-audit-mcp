import fs from 'fs';

const sources = JSON.parse(
  fs.readFileSync(new URL('./compliance_sources.json', import.meta.url))
);

export function retrieveRelevantSources(promptUsed, assistantResponse) {
  const text = (promptUsed + " " + assistantResponse).toLowerCase();

  const matches = [];

  for (const source of sources) {
    let score = 0;

    for (const keyword of source.keywords) {
      if (text.includes(keyword)) {
        score++;
      }
    }

    if (score > 0) {
      matches.push({ ...source, score });
    }
  }

  // Sort by best match
  matches.sort((a, b) => b.score - a.score);

  // Return top 2–3 matches
  return matches.slice(0, 3);
}