import { describe, it, expect } from "vitest";
import {
  createState,
  dayKey,
  shiftDay,
  totals,
  validateBackup,
  startSession,
  workoutVolume,
  buildContext,
  offlineReply,
  makeDemo,
} from "../src/domain";
import fs from "node:fs";
import {
  makeRecipe,
  previousMeal,
  repeatMeals,
  strengthRecords,
} from "../src/improvements";
import { validatePhotoBackup } from "../src/photos";
import { parseEstimate } from "../src/ui/PhotoMeal";
import { indianFoods, foodMatches } from "../src/data/indianFoods";
import {
  parseDiet,
  parseWorkout,
  applyWorkout,
  shortenWorkout,
} from "../src/planning";
import { plateTotals } from "../src/photoModel";

describe("Indian foods, planning and per-food portions", () => {
  it("has distinct, labelled Indian portions and searchable aliases", () => {
    expect(indianFoods.length).toBeGreaterThan(80);
    expect(new Set(indianFoods.map((f) => f.id)).size).toBe(indianFoods.length);
    expect(
      indianFoods.every((f) => f.serving && f.source.includes("estimate")),
    ).toBe(true);
    expect(
      foodMatches(
        indianFoods.find((f) => f.id === "in-milk-tea")!,
        "chai",
      ),
    ).toBe(true);
    expect(
      indianFoods.every(
        (f) => Number.isFinite(f.calories) && f.calories >= 0 && f.protein >= 0,
      ),
    ).toBe(true);
  });
  it("keeps different shares of rice and dal separate", () => {
    const result = plateTotals([
      {
        name: "Rice",
        serving: "1 cup",
        calories: 200,
        protein: 4,
        carbs: 44,
        fat: 0,
        eatenPercent: 50,
        nutritionKnown: true,
      },
      {
        name: "Dal",
        serving: "1 katori",
        calories: 180,
        protein: 10,
        carbs: 24,
        fat: 5,
        eatenPercent: 100,
        nutritionKnown: true,
      },
    ]);
    expect(result.calories).toBe(280);
    expect(result.protein).toBe(12);
  });
  it("validates food IDs and diet restrictions in GPT plans", () => {
    const s = createState();
    s.planPreferences.diet = "Vegetarian";
    const plan = {
      title: "Meals",
      notes: "Estimate",
      rows: [{ slot: "Lunch", foodId: "in-rajma", servings: 1, note: "" }],
    };
    expect(parseDiet(JSON.stringify(plan), s).rows[0].foodId).toBe("in-rajma");
    expect(() =>
      parseDiet(
        JSON.stringify({
          ...plan,
          rows: [{ ...plan.rows[0], foodId: "in-chicken-curry" }],
        }),
        s,
      ),
    ).toThrow();
    expect(() =>
      parseDiet(
        JSON.stringify({
          ...plan,
          rows: [{ ...plan.rows[0], foodId: "made-up" }],
        }),
        s,
      ),
    ).toThrow();
  });
  it("shortens remaining work without deleting completed sets", () => {
    const s = createState();
    const catalog = JSON.parse(
      fs.readFileSync("public/data/exercises.json", "utf8"),
    );
    s.active = startSession(s.routines[0], catalog);
    s.active.exercises[4].sets[0].done = true;
    s.active.exercises[4].sets[0].weight = 10;
    const completedId = s.active.exercises[4].sets[0].id;
    const shorter = shortenWorkout(s.active, 15);
    const adjusted = applyWorkout(shorter, s, catalog);
    expect(adjusted.id).toBe(s.active.id);
    expect(
      adjusted.exercises
        .flatMap((e) => e.sets)
        .find((x) => x.id === completedId)?.done,
    ).toBe(true);
    expect(
      adjusted.exercises.filter((e) => e.sets.some((s) => !s.done)).length,
    ).toBeLessThan(s.active.exercises.length);
  });
  it("rejects invented or duplicate exercise IDs", () => {
    const catalog = JSON.parse(
      fs.readFileSync("public/data/exercises.json", "utf8"),
    );
    const plan = {
      title: "Test",
      notes: "",
      warmup: "Easy movement",
      exercises: [
        { exerciseId: "invented", sets: 2, reps: 10, rest: 60, note: "" },
      ],
    };
    expect(() => parseWorkout(JSON.stringify(plan), catalog, 20)).toThrow();
  });
});

describe("Daywell compatibility and portions", () => {
  it("loads old backups without losing records", () => {
    const old = makeDemo() as unknown as Record<string, unknown>;
    delete old.favoriteFoodIds;
    delete old.weeklyPlan;
    const next = validateBackup(old);
    expect(next.favoriteFoodIds).toEqual([]);
    expect(next.weeklyPlan).toEqual([]);
    expect(next.meals.length).toBe((old.meals as unknown[]).length);
  });
  it("calculates recipe nutrition per batch yield", () => {
    const s = createState();
    const food = makeRecipe("Rice and dal", 2, [
      { food: s.foods.find((f) => f.id === "rice")!, quantity: 2 },
      { food: s.foods.find((f) => f.id === "dal")!, quantity: 1 },
    ]);
    expect(food.calories).toBe(320);
    expect(food.protein).toBeCloseTo(13.3);
    expect(food.recipe?.servings).toBe(2);
    expect(() => makeRecipe("X", 0, [])).toThrow();
  });
  it("excludes photo-only unknown nutrition and scales a known half plate", () => {
    const food = { ...createState().foods[0], calories: 800, protein: 40 };
    const meal = {
      id: "photo",
      date: dayKey(),
      slot: "Lunch" as const,
      food,
      quantity: 0.5,
      note: "",
    };
    expect(totals([meal]).calories).toBe(400);
    expect(
      totals([{ ...meal, food: { ...food, nutritionKnown: false } }]).calories,
    ).toBe(0);
  });
  it("copies only the latest earlier meal, preserving the source", () => {
    const s = makeDemo();
    const previous = previousMeal(s.meals, "Lunch", shiftDay(dayKey(), 1));
    const repeated = repeatMeals(previous, shiftDay(dayKey(), 1));
    expect(repeated.length).toBe(3);
    expect(repeated[0].id).not.toBe(previous[0].id);
    expect(previous[0].date).toBe(dayKey());
  });
  it("rejects unsafe media paths and malformed image data", () => {
    expect(() =>
      validatePhotoBackup({ "../../secrets": "data:image/jpeg;base64,AAA" }),
    ).toThrow();
    expect(() =>
      validatePhotoBackup({
        ["12345678-1234-1234-1234-123456789abc"]: "https://example.com/picture",
      }),
    ).toThrow();
  });
  it("validates AI photo estimates before applying them", () => {
    expect(
      parseEstimate(
        '{"name":"Rice","calories":400,"protein":10,"carbs":75,"fat":8,"notes":"Approximate"}',
      ).calories,
    ).toBe(400);
    expect(() => parseEstimate('{"name":"Bad","calories":-10}')).toThrow();
  });
});
describe("nutrition and dates", () => {
  it("uses local calendar dates and crosses month boundaries", () => {
    expect(dayKey(new Date(2026, 0, 1, 23))).toBe("2026-01-01");
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("scales servings without rounding stored nutrients", () => {
    const s = createState();
    const meal = {
      id: "m",
      date: dayKey(),
      slot: "Lunch" as const,
      food: s.foods.find((f) => f.id === "rice")!,
      quantity: 1.5,
      note: "",
    };
    expect(totals([meal]).calories).toBe(307.5);
    expect(totals([meal]).protein).toBeCloseTo(6.45);
  });
  it("rejects malformed backups and impossible portions", () => {
    const s = createState();
    expect(() => validateBackup({ ...s, version: 2 })).toThrow();
    expect(() =>
      validateBackup({
        ...s,
        weights: [{ id: "a", date: "2026-02-30", kg: 74 }],
      }),
    ).toThrow();
    expect(() =>
      validateBackup({
        ...s,
        meals: [
          {
            id: "a",
            date: dayKey(),
            slot: "Lunch",
            food: s.foods[0],
            quantity: -2,
            note: "",
          },
        ],
      }),
    ).toThrow();
  });
});
describe("training persistence", () => {
  const catalog = JSON.parse(
    fs.readFileSync("public/data/exercises.json", "utf8"),
  );
  it("all starter routines refer to real exercises", () => {
    for (const r of createState().routines)
      for (const id of r.exerciseIds)
        expect(catalog.some((e: { id: string }) => e.id === id)).toBe(true);
  });
  it("creates independent sets and counts only completed volume", () => {
    const s = createState();
    const w = startSession(s.routines[0], catalog);
    w.exercises[0].sets[0] = {
      ...w.exercises[0].sets[0],
      weight: 40,
      reps: 8,
      done: true,
    };
    expect(workoutVolume(w)).toBe(320);
    expect(w.exercises[0].sets[1].done).toBe(false);
    expect(validateBackup({ ...s, active: w }).active?.id).toBe(w.id);
  });
});
describe("context boundaries", () => {
  it("excludes imported health and weight by default", () => {
    const s = createState();
    s.weights.push({ id: "w", date: dayKey(), kg: 80 });
    expect(buildContext(s)).not.toHaveProperty("weights");
    expect(buildContext(s)).not.toHaveProperty("importedHealth");
    s.settings.shareHealth = true;
    expect(buildContext(s)).toHaveProperty("weights");
  });
  it("does not interpret empty food logs as fasting", () => {
    expect(offlineReply("How is my nutrition?", createState())).toContain(
      "missing meals are unknown",
    );
  });
  it("exports a valid demo explicitly marked as sample data", () => {
    const demo = makeDemo();
    expect(validateBackup(JSON.parse(JSON.stringify(demo))).demo).toBe(true);
    expect(demo.messages).toHaveLength(0);
  });
});
