import { currentStreak } from "../src/utils/streak";

test("returns 0 when today is false", () => {
  expect(currentStreak([false, true, true])).toBe(0);
});

test("counts consecutive trues from start", () => {
  expect(currentStreak([true, true, false, true])).toBe(2);
});

test("handles all true", () => {
  expect(currentStreak([true, true, true])).toBe(3);
});
