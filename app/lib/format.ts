const numberFormat = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const fullNumberFormat = new Intl.NumberFormat("en");
const dateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

export function compactNumber(value: number) {
  return numberFormat.format(value);
}

export function fullNumber(value: number) {
  return fullNumberFormat.format(value);
}

export function formatDate(value: string | number | undefined) {
  if (value === undefined || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return dateFormat.format(date);
}

export function formatShortDate(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return shortDateFormat.format(date);
}

export function yearOf(value: string | undefined) {
  return String(value ?? "").slice(0, 4);
}

export function plural(count: number, single: string, many = `${single}s`) {
  return count === 1 ? single : many;
}

/** "1 recommendation" / "34 recommendations" — count plus the right noun form. */
export function pluralize(count: number, single: string, many = `${single}s`) {
  return `${fullNumber(count)} ${plural(count, single, many)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
