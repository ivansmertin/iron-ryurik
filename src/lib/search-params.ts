export type SearchParamValue = string | string[] | undefined;

export function getSearchParamValue(value: SearchParamValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parsePositivePage(value: SearchParamValue) {
  const rawValue = getSearchParamValue(value);
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}
