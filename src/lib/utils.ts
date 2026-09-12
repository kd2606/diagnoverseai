import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Shared premium easing curve — expo-out. Use everywhere for visual cohesion. */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
