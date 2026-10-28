import { photoPortion } from "../photoModel";
import {
  Camera,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Droplets,
  Dumbbell,
  Weight,
  Sun,
  Moon,
  Activity,
  Utensils,
  Check,
  Heart,
  Leaf,
} from "lucide-react";
import { dayKey, shiftDay, totals, type State } from "../domain";
import { MealPhoto } from "./PhotoMeal";
const n = (v: number) => Math.round(v).toLocaleString();
export default function HomeContent({
  state: s,
  open,
  onFood,
  begin,
  onTrain,
  onCoach,
  addWater,
}: {
  state: State;
  open: (k: string, d?: unknown) => void;
  onFood: (date: string) => void;
  begin: (r: State["routines"][number]) => void;
  onTrain: () => void;
  onCoach: () => void;
  addWater: () => void;
}) {
  const today = dayKey(),
    rows = s.meals.filter((m) => m.date === today),
    nutrition = totals(rows),
    water = s.water
      .filter((w) => w.date === today)
      .reduce((a, w) => a + w.ml, 0),
    sessions = s.sessions.filter(
      (w) => w.date >= shiftDay(today, -6) && w.date <= today,
    ),
    check = s.checkins.find((c) => c.date === today),
    steps = s.health.steps.find((x) => x.date === today),
    unknown = rows.filter((m) => m.food.nutritionKnown === false).length;
  const planned = s.routines.find(
      (r) =>
        r.id ===
        s.weeklyPlan.find((p) => p.weekday === new Date().getDay())?.routineId,
    ),
    next = planned || s.routines[0];
  return (
    <>
      <div className="page-intro daywell-intro">
        <div>
          <span className="eyebrow">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          <h1>
            {s.profile.name === "You"
              ? "A fresh start"
              : `${new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}, ${s.profile.name}`}
            <span className="accent">.</span>
          </h1>
          <p>Your day, one small step at a time.</p>
        </div>
        <span className="today-emblem" aria-hidden="true">
          <Sun size={28} strokeWidth={1.2} />
        </span>
      </div>
      <div
        className="week-rhythm"
        role="group"
        aria-label="Your last seven days"
      >
        {Array.from({ length: 7 }, (_, i) => shiftDay(today, -6 + i)).map(
          (date) => {
            const activity =
              s.meals.some((m) => m.date === date) ||
              s.sessions.some((w) => w.date === date);
            return (
              <button
                key={date}
                className={date === today ? "current" : ""}
                onClick={() => onFood(date)}
                aria-label={`View food for ${date}`}
              >
                <span>
                  {new Date(date + "T12:00:00")
                    .toLocaleDateString(undefined, { weekday: "short" })
                    .slice(0, 1)}
                </span>
                <b>{new Date(date + "T12:00:00").getDate()}</b>
                <i className={activity ? "recorded" : ""} />
              </button>
            );
          },
        )}
      </div>
      <section className="daywell-hero">
        <div className="hero-top">
          <span>
            <Utensils size={17} /> Today’s nourishment
          </span>
          <button className="text-button" onClick={() => onFood(today)}>
            Food diary <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="hero-calories">
          <div>
            <strong>{n(nutrition.calories)}</strong>
            <span>
              kcal logged
              {unknown
                ? ` · ${unknown} photo ${unknown === 1 ? "meal" : "meals"} not estimated`
                : ""}
            </span>
          </div>
          <div className="hero-target">
            <span>YOUR SAVED TARGET</span>
            <b>
              {n(s.profile.calories)} <small>kcal</small>
            </b>
            <small>A guide, not a grade.</small>
          </div>
        </div>
        <div className="hero-fuel-track">
          <span
            style={{
              width: `${Math.min(100, (nutrition.calories / s.profile.calories) * 100)}%`,
            }}
          />
        </div>
        <div className="hero-macros">
          {[
            [
              "Protein",
              nutrition.protein,
              `${s.profile.protein} g target`,
              "var(--sage)",
            ],
            ["Carbs", nutrition.carbs, "logged", "var(--amber)"],
            ["Fat", nutrition.fat, "logged", "var(--lilac)"],
          ].map(([label, value, hint, color]) => (
            <div key={String(label)}>
              <span>
                <i style={{ background: String(color) }} />
                {label}
              </span>
              <strong>
                {n(Number(value))}
                <small> g</small>
              </strong>
              <small>{hint}</small>
            </div>
          ))}
        </div>
      </section>
      <div className="daily-quick-actions">
        <button
          aria-label="Photo meal"
          onClick={() => open("photoMeal", { slot: "Lunch", date: today })}
        >
          <span className="quick-icon camera">
            <Camera size={22} />
          </span>
          <b>Photo meal</b>
          <small>Out & about</small>
        </button>
        <button
          aria-label="Log food"
          onClick={() => open("food", { slot: "Snack", date: today })}
        >
          <span className="quick-icon">
            <Plus size={22} />
          </span>
          <b>Log food</b>
          <small>Your library</small>
        </button>
        <button onClick={() => open("weight")}>
          <span className="quick-icon">
            <Weight size={21} />
          </span>
          <b>Weight</b>
          <small>A quick check</small>
        </button>
        <button onClick={() => open("checkin")}>
          <span className="quick-icon">
            <Heart size={21} />
          </span>
          <b>Check in</b>
          <small>How you feel</small>
        </button>
      </div>
      <div className="daywell-home-grid">
        <section className="panel next-workout">
          <div className="section-heading">
            <span>
              <Dumbbell size={18} />{" "}
              {s.active
                ? "Session in progress"
                : planned
                  ? "On your plan today"
                  : "Make time to move"}
            </span>
            <span className="chip">
              {sessions.length} / {s.profile.days} THIS WEEK
            </span>
          </div>
          <div className="next-workout-content">
            <span className="next-workout-art">
              <Dumbbell size={54} strokeWidth={1.1} />
            </span>
            <div>
              <h2>{s.active?.name || next?.name || "Your own routine"}</h2>
              <p>
                {s.active
                  ? "Your sets are saved. Pick up where you left off."
                  : `${next?.exerciseIds.length || 0} movements · at your own pace`}
              </p>
            </div>
          </div>
          <button
            className="button primary wide"
            onClick={() =>
              s.active ? onTrain() : next ? begin(next) : onTrain()
            }
          >
            {s.active ? "Resume workout" : "Start session"}{" "}
            <ArrowRight size={17} />
          </button>
          <button className="text-button" onClick={onTrain}>
            Routines & weekly plan <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="panel daily-wellbeing">
          <div className="section-heading">
            <span>
              <Activity size={17} /> The little things
            </span>
            <span className="eyebrow">TODAY</span>
          </div>
          <button onClick={addWater}>
            <span className="wellbeing-icon">
              <Droplets size={20} />
            </span>
            <div>
              <span>Water</span>
              <b>
                {(water / 1000).toFixed(2)}{" "}
                <small>/ {(s.profile.water / 1000).toFixed(1)} L</small>
              </b>
            </div>
            <span className="water-add">
              <Plus size={15} /> 250 ml
            </span>
          </button>
          <button onClick={() => open("checkin")}>
            <span className="wellbeing-icon">
              <Moon size={20} />
            </span>
            <div>
              <span>Sleep last night</span>
              <b>{check ? `${check.sleep} h` : "Not logged"}</b>
            </div>
            <ArrowUpRight size={16} />
          </button>
          <button onClick={() => open("health")}>
            <span className="wellbeing-icon">
              <Activity size={20} />
            </span>
            <div>
              <span>Steps</span>
              <b>{steps ? n(steps.count) : "Connect health"}</b>
            </div>
            <ArrowUpRight size={16} />
          </button>
        </section>
      </div>
      <section className="panel daily-timeline">
        <div className="section-heading">
          <span>Food & movement</span>
          <button className="text-button" onClick={() => onFood(today)}>
            Full diary <ArrowUpRight size={15} />
          </button>
        </div>
        {!rows.length && !s.sessions.some((w) => w.date === today) && (
          <div className="timeline-empty">
            <span>
              <Leaf size={24} />
            </span>
            <div>
              <h3>Your day is a blank page.</h3>
              <p>A meal photo or a workout is a good place to start.</p>
            </div>
          </div>
        )}
        {rows.slice(-4).map((m) => (
          <div className="timeline-row" key={m.id}>
            {m.photo ? (
              <MealPhoto
                photo={{
                  ...m.photo,
                  eatenPercent: Math.round(m.quantity * 100),
                }}
                onOpen={() => open("photoView", m)}
              />
            ) : (
              <span className="timeline-symbol">
                <Utensils size={18} />
              </span>
            )}
            <button onClick={() => open(m.photo ? "photoView" : "editMeal", m)}>
              <b>{m.food.name}</b>
              <small>
                {m.slot}
                {m.photo
                  ? ` · ${m.photo?.items?.length ? "custom food portions" : Math.round(m.quantity * 100) + "% of plate"}`
                  : ` · ${m.quantity} serving${m.quantity === 1 ? "" : "s"}`}
              </small>
            </button>
            <span>
              {m.food.nutritionKnown === false
                ? "Photo only"
                : `${n(m.food.calories * m.quantity)} kcal`}
            </span>
          </div>
        ))}
        {s.sessions
          .filter((w) => w.date === today)
          .map((w) => (
            <div className="timeline-row" key={w.id}>
              <span className="timeline-symbol workout">
                <Dumbbell size={18} />
              </span>
              <button onClick={() => open("session", w)}>
                <b>{w.name}</b>
                <small>
                  Workout ·{" "}
                  {w.exercises.reduce(
                    (n, e) => n + e.sets.filter((s) => s.done).length,
                    0,
                  )}{" "}
                  completed sets
                </small>
              </button>
              <Check size={17} />
            </div>
          ))}
      </section>
      <button className="coach-nudge" onClick={onCoach}>
        <span>
          <Sun size={20} />
        </span>
        <div>
          <b>A little perspective goes a long way.</b>
          <small>Look back at your food and training with Daywell.</small>
        </div>
        <ArrowRight size={18} />
      </button>
    </>
  );
}
