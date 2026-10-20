// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

// Stand-in for node:crypto in the browser build. The framework compiler uses createHash once, to name the
// scope attribute of a component's styles; that name only has to be stable and unlikely to clash, so a plain
// (non-cryptographic) hash is enough here.

/**
 * FNV-1a, 32 bits, with a seed so two passes give different halves.
 *
 * @param {string} text Text to hash.
 * @param {number} seed Starting value of the hash.
 * @returns {string} 8 hex characters.
 */
function fnv1a(text, seed) {
  let hash = seed;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Stand-in for Node's createHash. The algorithm argument is ignored.
 *
 * @returns {{ update: (text: string) => object, digest: () => string }} Object with the part of Node's Hash API the compiler uses.
 */
export function createHash() {
  let text = "";
  return {
    /**
     * Adds text to the data to be hashed.
     *
     * @param {string} chunk Text to add.
     * @returns {object} The same hash object, so calls can be chained.
     */
    update(chunk) {
      text += chunk;
      return this;
    },
    /** @returns {string} 16 hex characters. */
    digest: () => fnv1a(text, 2166136261) + fnv1a(text, 3266489917),
  };
}
