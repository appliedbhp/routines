/**
 * Thin client for the ARASAAC pictogram API (https://arasaac.org/developers/api).
 * All symbols are © Government of Aragón, created by Sergio Palao, used under
 * CC BY-NC-SA — attribution is rendered in the UI footer and print output.
 */
const ARASAAC = (() => {
  const API_BASE = "https://api.arasaac.org/api/pictograms/en";
  const STATIC_BASE = "https://static.arasaac.org/pictograms";
  const cache = new Map();

  async function search(keyword) {
    const key = keyword.trim().toLowerCase();
    if (!key) return [];
    if (cache.has(key)) return cache.get(key);
    // "bestsearch" 404s on multi-word phrases (e.g. "eat breakfast"), so use
    // the general "search" endpoint, which handles both single words and
    // phrases and returns results ranked by relevance.
    try {
      const res = await fetch(`${API_BASE}/search/${encodeURIComponent(key)}`);
      if (!res.ok) throw new Error(`ARASAAC search failed: ${res.status}`);
      const data = await res.json();
      cache.set(key, data);
      return data;
    } catch (err) {
      console.warn("ARASAAC search error", err);
      return [];
    }
  }

  function imageUrl(id, size = 300) {
    return `${STATIC_BASE}/${id}/${id}_${size}.png`;
  }

  return { search, imageUrl };
})();
