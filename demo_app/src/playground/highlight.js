// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

// Ported from the Nodula OS Code app. Component source is markup with script and style blocks, so one pattern
// marks markup tokens; each named group is a token kind, and its CSS class is `tok-<kind>`.
const COMPONENT_TOKENS = new RegExp(
  [
    String.raw`(?<comment><!--[\s\S]*?(?:-->|$))`,
    String.raw`(?<tag><\/?[\w-]+|\/?>)`,
    String.raw`(?<string>"[^"]*"?|'[^']*'?)`,
    String.raw`(?<property>[@:]?[\w-]+(?==))`,
  ].join("|"),
  "g",
);

/**
 * Escapes text for HTML, so it can be placed in the highlighted copy as it is.
 *
 * @param {string} text Any text.
 * @returns {string} Text with `&`, `<`, `>` and `"` replaced by entities.
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Turns component source into HTML, with `<span class="tok-…">` around comments, strings, tags and attributes.
 *
 * Everything is escaped, including the text between tokens, so the result is safe to place with `innerHTML`.
 *
 * @param {string} text Component source.
 * @returns {string} HTML.
 */
export function highlightSource(text) {
  let html = "";
  let last = 0;
  for (const match of text.matchAll(COMPONENT_TOKENS)) {
    const kind = Object.entries(match.groups).find(([, value]) => value !== undefined)[0];
    html += `${escapeHtml(text.slice(last, match.index))}<span class="tok-${kind}">${escapeHtml(match[0])}</span>`;
    last = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(last));
}
