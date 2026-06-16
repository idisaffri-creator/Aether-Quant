/**
 * Pure password strength scoring — used by Register, Settings, change-password.
 * Kept dependency-free so it's safe to use in the browser and in tests.
 */
export function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!pw) return { score: 0, label: "Empty", color: "bg-white/10" };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const score = Math.max(1, Math.min(4, s)) as 1 | 2 | 3 | 4;
  const map: Record<number, { label: string; color: string }> = {
    1: { label: "Weak", color: "bg-red-500" },
    2: { label: "Fair", color: "bg-orange-500" },
    3: { label: "Good", color: "bg-amber" },
    4: { label: "Strong", color: "bg-emerald-500" },
  };
  return { score: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}
