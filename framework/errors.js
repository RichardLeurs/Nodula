// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/**
 * Create an error with a stable `code` for translation. The message stays in English for developers;
 * applications map `code` to their own text (see framework/i18n/en.json).
 */
export function nodulaError(ErrorType, code, message) {
  const error = new ErrorType(message);
  error.code = code;
  return error;
}
