import { formatInTimeZone } from "date-fns-tz";

const IST = "Asia/Kolkata";

export function formatIST(date: Date | string | number, fmt = "d MMM, h:mm a"): string {
  return `${formatInTimeZone(new Date(date), IST, fmt)} IST`;
}

export function nowIST(fmt = "d MMM yyyy, h:mm a"): string {
  return formatIST(new Date(), fmt);
}

export function todayISTDate(): string {
  // ISO date (YYYY-MM-DD) of "today" in IST.
  return formatInTimeZone(new Date(), IST, "yyyy-MM-dd");
}

export function startOfTodayIST(): Date {
  const ymd = formatInTimeZone(new Date(), IST, "yyyy-MM-dd");
  // Midnight IST = 18:30 UTC of previous day.
  return new Date(`${ymd}T00:00:00+05:30`);
}

export function daysAgoIST(n: number): Date {
  const d = startOfTodayIST();
  d.setDate(d.getDate() - n);
  return d;
}

export function relativeFromNow(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
