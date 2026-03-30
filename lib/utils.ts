import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null): string {
  if (value === null) return "N/D";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function formatMonth(month: number, year: number): string {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[month - 1]} ${year}`;
}

export function getLastDayOfMonth(month: number, year: number): Date {
  // Deadline: dia 1 do mês seguinte às 00:00 BRT (03:00 UTC)
  // month is 1-based → Date(year, month, 1) gives next month day 1 (0-based)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  // Use ISO string with BRT offset (-03:00) to avoid local timezone issues
  return new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00-03:00`);
}
