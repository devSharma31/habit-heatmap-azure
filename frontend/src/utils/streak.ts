export function currentStreak(days: boolean[]): number {
  // days[0] = today, days[1] = yesterday, etc.
  let streak = 0;
  for (const done of days) {
    if (!done) break;
    streak++;
  }
  return streak;
}
