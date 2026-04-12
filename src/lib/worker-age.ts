function toBirthDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getInternationalAge(
  birthDate: Date | string | null | undefined,
  now = new Date(),
): number | null {
  const birth = toBirthDate(birthDate);
  if (!birth) return null;

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() &&
      now.getUTCDate() >= birth.getUTCDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function formatBirthDate(
  birthDate: Date | string | null | undefined,
  locale = "ko-KR",
): string | null {
  const normalized = toBirthDate(birthDate);
  if (!normalized) return null;

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(normalized);
}
