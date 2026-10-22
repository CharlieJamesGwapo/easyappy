import { validateState } from './model.js';
export const STORAGE_KEY = 'easyappy.v1';
export function loadState(storage, seed) {
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    return {
      state: raw === null ? validateState(structuredClone(seed)) : parseBackup(raw),
      error: '',
      recoveryData: null,
    };
  } catch (error) {
    return {
      state: validateState(structuredClone(seed)),
      error: `Saved data could not be loaded: ${error.message}. Your original data has been preserved.`,
      recoveryData: raw,
    };
  }
}
export function persistState(storage, state, options = {}) {
  const { replaceCorrupt = false } = options;
  try {
    const normalized = validateState(state),
      raw = storage.getItem(STORAGE_KEY);
    if (Object.hasOwn(options, 'expectedRaw') && raw !== options.expectedRaw)
      throw new Error(
        'Another tab changed this workspace. Download a backup of your edits, then reload before saving.',
      );
    if (raw !== null && !replaceCorrupt) {
      try {
        parseBackup(raw);
      } catch {
        throw new Error(
          'Existing storage needs recovery. Download it before replacing it in Settings.',
        );
      }
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: `Could not save in this browser: ${error.message}` };
  }
}
export function backupJSON(state) {
  return JSON.stringify(validateState(state), null, 2);
}
export function parseBackup(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not a valid JSON backup.');
  }
  return validateState(value);
}
