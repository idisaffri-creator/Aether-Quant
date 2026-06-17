/**
 * Date utilities — re-exports from date-fns with sensible defaults.
 */
import { formatDistanceToNow as fnFormatDistance, format as fnFormat, parseISO } from "date-fns";

export function formatDistanceToNow(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return fnFormatDistance(d, { addSuffix: true });
}

export function formatDate(date: Date | string, fmt = "PP"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return fnFormat(d, fmt);
}
