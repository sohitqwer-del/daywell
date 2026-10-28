import {
  uid,
  totals,
  type Food,
  type Meal,
  type State,
  type Session,
} from "./domain";

export function makeRecipe(
  name: string,
  servings: number,
  ingredients: { food: Food; quantity: number }[],
): Food {
  if (
    !name.trim() ||
    !Number.isFinite(servings) ||
    servings <= 0 ||
    servings > 100 ||
    !ingredients.length ||
    ingredients.length > 50
  )
    throw Error("Add a name, a valid yield, and at least one ingredient.");
  if (
    ingredients.some(
      (i) =>
        !Number.isFinite(i.quantity) || i.quantity <= 0 || i.quantity > 100,
    )
  )
    throw Error("Ingredient quantities must be between 0 and 100 servings.");
  const sum = totals(
    ingredients.map((i) => ({
      id: "ingredient",
      date: "2000-01-01",
      slot: "Snack",
      food: i.food,
      quantity: i.quantity,
      note: "",
    })),
  );
  return {
    id: uid(),
    nutritionKnown: true,
    name: name.trim(),
    serving: "1 recipe serving",
    calories: sum.calories / servings,
    protein: sum.protein / servings,
    carbs: sum.carbs / servings,
    fat: sum.fat / servings,
    source: `Your recipe · ${ingredients.length} ingredients · batch makes ${servings} servings`,
    recipe: {
      servings,
      ingredients: ingredients.map((i) => ({
        foodId: i.food.id,
        name: i.food.name,
        serving: i.food.serving,
        quantity: i.quantity,
      })),
    },
  };
}
export function previousMeal(
  meals: Meal[],
  slot: Meal["slot"],
  before: string,
) {
  const previous = meals
    .filter((m) => m.date < before && m.slot === slot)
    .sort((a, b) => b.date.localeCompare(a.date));
  return previous.length
    ? previous.filter((m) => m.date === previous[0].date)
    : [];
}
export function repeatMeals(meals: Meal[], date: string): Meal[] {
  return meals.map((m) => ({ ...structuredClone(m), id: uid(), date }));
}
export function recentFoods(state: State) {
  const ids = [
    ...new Set(
      state.meals
        .filter((meal) => !meal.photo)
        .slice()
        .reverse()
        .map((m) => m.food.id),
    ),
  ];
  return ids
    .map(
      (id) =>
        state.foods.find((f) => f.id === id) ||
        state.meals.find((m) => m.food.id === id)?.food,
    )
    .filter((f): f is Food => !!f);
}
export function weeklyVolume(sessions: Session[], start: string, end: string) {
  return sessions
    .filter((s) => s.date >= start && s.date <= end)
    .reduce(
      (sum, w) =>
        sum +
        w.exercises.reduce(
          (n, e) =>
            n +
            e.sets
              .filter((s) => s.done)
              .reduce((v, s) => v + s.weight * s.reps, 0),
          0,
        ),
      0,
    );
}
export function strengthRecords(sessions: Session[]) {
  const records = new Map<
    string,
    { name: string; kg: number; reps: number; date: string }
  >();
  for (const w of sessions)
    for (const e of w.exercises)
      for (const set of e.sets) {
        if (!set.done || set.weight <= 0) continue;
        const prev = records.get(e.id);
        if (
          !prev ||
          set.weight > prev.kg ||
          (set.weight === prev.kg && set.reps > prev.reps)
        )
          records.set(e.id, {
            name: e.name,
            kg: set.weight,
            reps: set.reps,
            date: w.date,
          });
      }
  return [...records.values()].sort((a, b) => b.date.localeCompare(a.date));
}
