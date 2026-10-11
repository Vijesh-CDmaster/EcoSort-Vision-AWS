import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export type WasteBinLabel = "Plastic" | "Glass" | "Compost" | "Landfill";

export function toBinLabel(bin: string): WasteBinLabel {
  if (bin === "compost") return "Compost";
  if (bin === "plastic") return "Plastic";
  if (bin === "glass") return "Glass";
  if (bin === "recycling") return "Plastic"; // for old data
  return "Landfill";
}

export function titleCase(s: string) {
  if (!s) return "";
  return s
    .split(/[-_\\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}