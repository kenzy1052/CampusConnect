export function cleanTitle(s) {
  return (s ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .toLocaleLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase());
}

export function cleanDescription(s) {
  return (s ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 2000);
}
