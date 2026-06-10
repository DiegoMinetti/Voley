/**
 * Material Design 3 — className helper.
 * Accepts any value and returns a space-separated string of truthy class names.
 */
export const cn = (...names: Array<unknown>): string =>
  names.filter((name): name is string => typeof name === 'string' && name.length > 0).join(' ')
