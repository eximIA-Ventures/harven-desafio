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
  // Deadline: dia 1 do mês seguinte às 00:00 (meia-noite)
  const date = new Date(year, month, 1); // month is 1-based, Date month is 0-based → next month day 1
  date.setHours(0, 0, 0, 0);
  return date;
}
