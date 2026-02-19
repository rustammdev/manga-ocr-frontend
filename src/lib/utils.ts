import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(isoStr?: string) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return (
      d.toLocaleDateString("uz", { month: "short", day: "numeric" }) +
      " " +
      d.toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return isoStr.slice(0, 16);
  }
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
