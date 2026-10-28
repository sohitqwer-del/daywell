import { z } from "zod";
import { indianFoods } from "./data/indianFoods";
export const uid = () => crypto.randomUUID();
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDay(key: string, offset: number) {
  const d = new Date(key + "T12:00:00");
  d.setDate(d.getDate() + offset);
  return dayKey(d);
}
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => dayKey(new Date(s + "T12:00:00")) === s);
const id = z.string().min(1).max(100);
const text = z.string().max(1000);
const positive = z.number().finite().min(0).max(100000);
const recipeSchema = z.object({
  servings: z.number().finite().positive().max(100),
  ingredients: z
    .array(
      z.object({
        foodId: id,
        name: text,
        serving: text,
        quantity: z.number().finite().positive().max(100),
      }),
    )
    .min(1)
    .max(50),
});
export const foodSchema = z.object({
  id,
  name: text.min(1),
  serving: text,
  calories: positive,
  protein: positive,
  carbs: positive,
  fat: positive,
  source: text,
  recipe: recipeSchema.optional(),
  nutritionKnown: z.boolean().optional(),
  category: z.string().max(80).optional(),
  aliases: z.array(z.string().max(80)).max(30).optional(),
  vegetarian: z.boolean().optional(),
});
export const photoSchema = z.object({
  id: z.string().uuid(),
  thumbnail: z
    .string()
    .max(40000)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/),
  plateNote: text,
  estimated: z.boolean(),
  eatenPercent: z.number().finite().min(1).max(100),
  items: z
    .array(
      z.object({
        name: text,
        serving: text,
        calories: positive,
        protein: positive,
        carbs: positive,
        fat: positive,
        eatenPercent: z.number().finite().min(0).max(100),
        nutritionKnown: z.boolean(),
      }),
    )
    .max(20)
    .optional(),
});
export const dietPlanSchema = z.object({
  id,
  title: z.string().min(1).max(150),
  date: day,
  source: z.enum(["gpt", "manual"]),
  notes: text,
  rows: z
    .array(
      z.object({
        slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
        foodId: id,
        servings: z.number().finite().min(0.25).max(6),
        note: z.string().max(300),
      }),
    )
    .min(1)
    .max(24),
});
export const workoutPlanSchema = z.object({
  id,
  title: z.string().min(1).max(150),
  date: day,
  source: z.enum(["gpt", "manual"]),
  minutes: z.number().int().min(5).max(120),
  notes: text,
  warmup: z.string().max(500),
  exercises: z
    .array(
      z.object({
        exerciseId: id,
        sets: z.number().int().min(1).max(5),
        reps: z.number().int().min(1).max(30),
        rest: z.number().int().min(15).max(240),
        note: z.string().max(300),
      }),
    )
    .min(1)
    .max(10),
});
const setSchema = z.object({
  id,
  weight: z.number().finite().min(0).max(1500),
  reps: z.number().int().min(1).max(500),
  done: z.boolean(),
});
const exerciseSchema = z.object({
  id,
  name: text,
  sets: z.array(setSchema).max(50),
  restSeconds: z.number().int().min(15).max(240).optional(),
});
const sessionSchema = z.object({
  id,
  name: text,
  date: day,
  startedAt: z.number().finite(),
  endedAt: z.number().finite().optional(),
  exercises: z.array(exerciseSchema).max(100),
  note: text,
  restUntil: z.number().finite().optional(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  onboarded: z.boolean(),
  demo: z.boolean(),
  favoriteFoodIds: z.array(id).max(5000).default([]),
  weeklyPlan: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), routineId: id }))
    .max(7)
    .default([]),
  dietPlan: dietPlanSchema.nullable().default(null),
  restDays: z.array(day).max(5000).default([]),
  workoutPlan: workoutPlanSchema.nullable().default(null),
  planPreferences: z
    .object({
      diet: z.enum(["Vegetarian", "Vegan", "Eggetarian", "Any"]),
      allergies: text,
      avoid: text,
      budget: z.enum(["Everyday", "Flexible"]),
      equipment: text,
    })
    .default({
      diet: "Any",
      allergies: "",
      avoid: "",
      budget: "Everyday",
      equipment: "",
    }),
  profile: z.object({
    name: z.string().min(1).max(50),
    goal: z.enum(["Feel better", "Build strength", "Build consistency"]),
    calories: z.number().finite().min(800).max(6000),
    protein: z.number().finite().min(20).max(400),
    water: z.number().finite().min(500).max(6000),
    days: z.number().int().min(1).max(7),
    diet: text,
    notes: text,
  }),
  foods: z.array(foodSchema).max(5000),
  meals: z
    .array(
      z.object({
        id,
        date: day,
        slot: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
        food: foodSchema,
        quantity: z.number().finite().positive().max(100),
        note: text,
        photo: photoSchema.optional(),
      }),
    )
    .max(30000),
  water: z.array(z.object({ id, date: day, ml: positive })).max(30000),
  weights: z
    .array(
      z.object({ id, date: day, kg: z.number().finite().min(20).max(400) }),
    )
    .max(10000),
  sessions: z.array(sessionSchema).max(10000),
  active: sessionSchema.nullable(),
  routines: z
    .array(
      z.object({
        id,
        name: text,
        description: text,
        exerciseIds: z.array(id).min(1).max(30),
      }),
    )
    .max(100),
  memories: z
    .array(z.object({ id, text: text.min(1), createdAt: z.string().max(50) }))
    .max(200),
  messages: z
    .array(
      z.object({
        id,
        role: z.enum(["user", "assistant"]),
        text: z.string().max(30000),
        mode: z.enum(["offline", "api", "chatgpt"]),
      }),
    )
    .max(400),
  checkins: z
    .array(
      z.object({
        id,
        date: day,
        energy: z.number().int().min(1).max(5),
        sleep: z.number().finite().min(0).max(24),
        note: text,
      }),
    )
    .max(10000),
  health: z.object({
    lastSync: z.string().max(50).optional(),
    steps: z.array(z.object({ date: day, count: positive })).max(100),
    sleep: z
      .array(z.object({ date: day, minutes: positive, source: text }))
      .max(100),
    weights: z
      .array(
        z.object({
          date: day,
          kg: z.number().finite().min(20).max(400),
          source: text,
        }),
      )
      .max(1000),
    permissions: z.array(z.string()).max(50),
  }),
  settings: z.object({
    theme: z.enum(["dark", "light", "system"]),
    reducedMotion: z.boolean(),
    haptics: z.boolean(),
    aiMode: z.enum(["offline", "api", "chatgpt"]),
    model: z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),
    shareHealth: z.boolean(),
    dailyAiLimit: z.number().int().min(1).max(100),
  }),
  usage: z.object({
    date: day,
    calls: z.number().int().min(0),
    input: z.number().finite().nonnegative().max(1e12),
    output: z.number().finite().nonnegative().max(1e12),
  }),
});
export type State = z.infer<typeof stateSchema>;
export type Food = z.infer<typeof foodSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Meal = State["meals"][number];
export interface Exercise {
  id: string;
  name: string;
  level: string;
  equipment: string | null;
  primaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}
export const initialFoods: Food[] = [
  ["roti", "Whole-wheat roti", "1 medium · 40 g", 110, 3.5, 22, 1],
  ["rice", "Cooked white rice", "1 cup · 158 g", 205, 4.3, 44.5, 0.4],
  ["dal", "Cooked lentils", "1 cup · 198 g", 230, 18, 40, 0.8],
  ["curd", "Plain curd", "100 g", 61, 3.5, 4.7, 3.3],
  ["paneer", "Paneer", "100 g", 265, 18, 3, 20],
  ["egg", "Boiled egg", "1 large", 78, 6.3, 0.6, 5.3],
  ["banana", "Banana", "1 medium", 105, 1.3, 27, 0.4],
  ["oats", "Rolled oats, dry", "40 g", 152, 5, 27, 3],
  ["milk", "Whole milk", "250 ml", 153, 8, 12, 8],
  ["chicken", "Chicken breast, cooked", "100 g", 165, 31, 0, 3.6],
  ["apple", "Apple", "1 medium", 95, 0.5, 25, 0.3],
  ["almonds", "Almonds", "28 g", 164, 6, 6, 14],
  ["tofu", "Firm tofu", "100 g", 144, 17, 3, 9],
  ["idli", "Plain idli", "1 medium", 58, 2, 12, 0.2],
  ["oil", "Cooking oil", "1 teaspoon · 5 ml", 40, 0, 0, 4.5],
].map(([id, name, serving, calories, protein, carbs, fat]) => ({
  id: String(id),
  name: String(name),
  serving: String(serving),
  calories: Number(calories),
  protein: Number(protein),
  carbs: Number(carbs),
  fat: Number(fat),
  nutritionKnown: true,
  source: "Starter estimate · adjust to your recipe",
}));
export function createState(): State {
  return {
    version: 1,
    onboarded: false,
    demo: false,
    favoriteFoodIds: [],
    weeklyPlan: [],
    dietPlan: null,
    restDays: [],
    workoutPlan: null,
    planPreferences: {
      diet: "Any",
      allergies: "",
      avoid: "",
      budget: "Everyday",
      equipment: "",
    },
    profile: {
      name: "You",
      goal: "Build consistency",
      calories: 2200,
      protein: 120,
      water: 2000,
      days: 3,
      diet: "",
      notes: "",
    },
    foods: [...initialFoods, ...indianFoods],
    meals: [],
    water: [],
    weights: [],
    sessions: [],
    active: null,
    routines: [
      {
        id: "full",
        name: "Full body",
        description: "A simple strength session · 5 movements",
        exerciseIds: [
          "Barbell_Full_Squat",
          "Barbell_Bench_Press_-_Medium_Grip",
          "Bent_Over_Barbell_Row",
          "Dumbbell_Shoulder_Press",
          "Plank",
        ],
      },
      {
        id: "upper",
        name: "Upper body",
        description: "Push, pull, and a little arm work",
        exerciseIds: [
          "Barbell_Bench_Press_-_Medium_Grip",
          "Bent_Over_Barbell_Row",
          "Dumbbell_Shoulder_Press",
          "Dumbbell_Bicep_Curl",
          "Triceps_Pushdown",
        ],
      },
      {
        id: "lower",
        name: "Lower body",
        description: "Squat, hinge, and build a foundation",
        exerciseIds: [
          "Barbell_Full_Squat",
          "Romanian_Deadlift",
          "Dumbbell_Lunges",
          "Standing_Calf_Raises",
          "Plank",
        ],
      },
    ],
    memories: [],
    messages: [],
    checkins: [],
    health: { steps: [], sleep: [], weights: [], permissions: [] },
    settings: {
      theme: "dark",
      reducedMotion: false,
      haptics: true,
      aiMode: "offline",
      model: "gpt-6-luna",
      shareHealth: false,
      dailyAiLimit: 12,
    },
    usage: { date: dayKey(), calls: 0, input: 0, output: 0 },
  };
}
export function totals(meals: Meal[]) {
  return meals
    .filter((m) => m.food.nutritionKnown !== false)
    .reduce(
      (a, m) => ({
        calories: a.calories + m.food.calories * m.quantity,
        protein: a.protein + m.food.protein * m.quantity,
        carbs: a.carbs + m.food.carbs * m.quantity,
        fat: a.fat + m.food.fat * m.quantity,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
}
export function validateBackup(value: unknown): State {
  const parsed = stateSchema.parse(value);
  if (parsed.meals.some((m) => !Number.isFinite(m.food.calories * m.quantity)))
    throw Error("Invalid meal totals");
  return parsed;
}
export function startSession(
  routine: State["routines"][number],
  catalog: Exercise[],
): Session {
  return {
    id: uid(),
    name: routine.name,
    date: dayKey(),
    startedAt: Date.now(),
    note: "",
    exercises: routine.exerciseIds.map((id) => {
      const e = catalog.find((e) => e.id === id);
      return {
        id,
        name: e?.name ?? id.replaceAll("_", " "),
        sets: Array.from({ length: 3 }, () => ({
          id: uid(),
          weight: 0,
          reps: 10,
          done: false,
        })),
      };
    }),
  };
}
export function workoutVolume(session: Session) {
  return session.exercises.reduce(
    (sum, e) =>
      sum +
      e.sets.filter((s) => s.done).reduce((n, s) => n + s.reps * s.weight, 0),
    0,
  );
}
export function makeDemo(): State {
  const s = createState();
  s.onboarded = true;
  s.demo = true;
  s.profile.name = "Alex";
  for (let i = 13; i >= 0; i--) {
    const date = shiftDay(dayKey(), -i);
    s.weights.push({
      id: uid(),
      date,
      kg: 74.6 - i * 0.035 + Math.sin(i) * 0.15,
    });
    s.checkins.push({
      id: uid(),
      date,
      energy: 3 + (i % 2),
      sleep: 6.5 + (i % 3) * 0.5,
      note: "",
    });
    if (i === 0) {
      [
        ["oats", 1],
        ["milk", 1],
        ["banana", 1],
        ["rice", 1.5],
        ["dal", 1],
        ["curd", 1],
      ].forEach(([f, q], j) =>
        s.meals.push({
          id: uid(),
          date,
          slot: j < 3 ? "Breakfast" : "Lunch",
          food: s.foods.find((x) => x.id === f)!,
          quantity: Number(q),
          note: "",
        }),
      );
      s.water.push({ id: uid(), date, ml: 1250 });
    }
    if (i % 3 === 0 && i > 0)
      s.sessions.push({
        id: uid(),
        name: "Full body",
        date,
        startedAt: new Date(date + "T17:00:00").getTime(),
        endedAt: new Date(date + "T17:45:00").getTime(),
        note: "Sample workout",
        exercises: [
          {
            id: "Barbell_Full_Squat",
            name: "Barbell Full Squat",
            sets: [
              { id: uid(), weight: 40, reps: 10, done: true },
              { id: uid(), weight: 40, reps: 10, done: true },
            ],
          },
        ],
      });
  }
  return s;
}
export function buildContext(s: State) {
  const today = dayKey();
  const recent = s.meals.filter((m) => m.date >= shiftDay(today, -6));
  return {
    date: today,
    profile: s.profile,
    memories: s.memories.map((m) => m.text),
    today: {
      nutrition: totals(recent.filter((m) => m.date === today)),
      loggedMeals: recent
        .filter((m) => m.date === today)
        .map((m) => ({
          name: m.food.name,
          servings: m.quantity,
          nutritionKnown: m.food.nutritionKnown !== false,
        })),
      waterMl: s.water
        .filter((w) => w.date === today)
        .reduce((a, w) => a + w.ml, 0),
    },
    last7Days: Array.from({ length: 7 }, (_, i) => {
      const date = shiftDay(today, -i);
      const logs = recent.filter((m) => m.date === date);
      return { date, mealCount: logs.length, nutrition: totals(logs) };
    }),
    workouts: s.sessions.slice(-6).map((w) => ({
      date: w.date,
      name: w.name,
      exercises: w.exercises.map((e) => ({
        name: e.name,
        sets: e.sets.filter((x) => x.done),
      })),
    })),
    checkins: s.checkins.slice(-7),
    ...(s.settings.shareHealth
      ? { importedHealth: s.health, weights: s.weights.slice(-14) }
      : {}),
  };
}
export function offlineReply(question: string, s: State) {
  const today = dayKey(),
    nutrition = totals(s.meals.filter((m) => m.date === today));
  const count = s.sessions.filter((w) => w.date >= shiftDay(today, -6)).length;
  if (/pain|injur|diagnos|diabet|pregnan|disorder/i.test(question))
    return "I can help organize your logs, but cannot assess symptoms, injuries, or medical needs. A qualified professional can help you make a safe plan. You can add relevant guidance to your profile.";
  if (/protein|eat|food|meal|nutrition/i.test(question))
    return `You have logged ${Math.round(nutrition.protein)} g protein across ${s.meals.filter((m) => m.date === today).length} meal entries today. Your saved target is ${s.profile.protein} g. ${nutrition.protein < s.profile.protein ? "Your food library includes lentils, curd, tofu, paneer, eggs, and chicken; choose what fits your diet." : "You have reached your saved target in the logged entries."} These are recorded estimates; missing meals are unknown. You can edit your targets in Settings.`;
  if (/train|gym|workout|strength/i.test(question))
    return `You have completed ${count} workout${count === 1 ? "" : "s"} in the last seven days. Your saved schedule is ${s.profile.days} days per week. ${s.active ? "You have an unfinished session. Resume it from Train." : "Open Train to choose a routine or build your own."} Adjust the session to your ability and stop a movement that causes pain. This offline summary does not assess your recovery.`;
  return `Here is what your records show: ${Math.round(nutrition.calories)} kcal and ${Math.round(nutrition.protein)} g protein logged today, and ${count} completed workouts in the last seven days. ${s.memories.length ? `I have ${s.memories.length} saved preference${s.memories.length === 1 ? "" : "s"} that you can inspect in Memory.` : "Add preferences in Memory to keep them visible."} This is a rule-based offline summary. Connect AI in Settings for open-ended coaching.`;
}
