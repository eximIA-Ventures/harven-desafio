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
  const date = new Date(year, month, 0); // day 0 of next month = last day
  date.setHours(18, 0, 0, 0);
  return date;
}
