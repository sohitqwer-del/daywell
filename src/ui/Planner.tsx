import { useState } from "react";
import {
  CalendarDays,
  Sparkles,
  LoaderCircle,
  Plus,
  Minus,
  Check,
  ArrowRight,
  Utensils,
  Dumbbell,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { type State, type Exercise, uid, dayKey, totals } from "../domain";
import {
  generateDiet,
  generateWorkout,
  applyWorkout,
  shortenWorkout,
  type DietPlan,
  type WorkoutPlan,
  type Commit,
} from "../planning";
const round = (n: number) => Math.round(n).toLocaleString();
export default function Planner({
  state: s,
  commit,
  catalog,
  connect,
  onTrain,
  notify,
}: {
  state: State;
  commit: Commit;
  catalog: Exercise[];
  connect: () => void;
  onTrain: () => void;
  notify: (message: string, undo?: () => void) => void;
}) {
  const [tab, setTab] = useState<"meals" | "training">("meals");
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A PLAN THAT CAN CHANGE WITH YOU</span>
          <h1>
            Make today work<span className="accent">.</span>
          </h1>
          <p>Familiar food. Flexible training. You stay in control.</p>
        </div>
        <button className="button" onClick={connect}>
          <Sparkles size={17} />
          {s.settings.aiMode === "offline"
            ? "Connect ChatGPT"
            : "AI connection"}
        </button>
      </div>
      <div className="planner-tabs" role="tablist" aria-label="Planning">
        <button
          id="diet-tab"
          role="tab"
          aria-selected={tab === "meals"}
          aria-controls="diet-panel"
          onClick={() => setTab("meals")}
        >
          <Utensils size={18} /> Diet plan
        </button>
        <button
          id="training-tab"
          role="tab"
          aria-selected={tab === "training"}
          aria-controls="training-panel"
          onClick={() => setTab("training")}
        >
          <Dumbbell size={18} /> Today’s workout
        </button>
      </div>
      {tab === "meals" ? (
        <div role="tabpanel" id="diet-panel" aria-labelledby="diet-tab">
          <DietPlanner
            state={s}
            commit={commit}
            connect={connect}
            notify={notify}
          />
        </div>
      ) : (
        <div role="tabpanel" id="training-panel" aria-labelledby="training-tab">
          <WorkoutPlanner
            state={s}
            commit={commit}
            catalog={catalog}
            connect={connect}
            onTrain={onTrain}
            notify={notify}
          />
        </div>
      )}
    </>
  );
}
function DietPlanner({
  state: s,
  commit,
  connect,
  notify,
}: {
  state: State;
  commit: Commit;
  connect: () => void;
  notify: (message: string, undo?: () => void) => void;
}) {
  const [request, setRequest] = useState(
      "Simple Indian meals with familiar portions and enough variety.",
    ),
    [draft, setDraft] = useState<DietPlan | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plan = draft || s.dietPlan;
  async function generate() {
    if (s.settings.aiMode === "offline") {
      connect();
      return;
    }
    setBusy(true);
    setError("");
    try {
      setDraft(await generateDiet(s, commit, request));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  function editRow(index: number, servings: number) {
    if (!plan || servings < 0.25 || servings > 6) return;
    const next = structuredClone(plan);
    next.rows[index].servings = servings;
    setDraft(next);
  }
  const records =
    plan?.rows.flatMap((row) => {
      const food = s.foods.find((f) => f.id === row.foodId);
      return food
        ? [
            {
              id: "p",
              date: dayKey(),
              slot: row.slot,
              food,
              quantity: row.servings,
              note: row.note,
            },
          ]
        : [];
    }) || [];
  const sum = totals(records);
  return (
    <>
      <section className="panel planner-brief">
        <div className="section-heading">
          <span>
            <Sparkles size={18} /> Your food preferences
          </span>
          <span className="chip">GENERAL WELLNESS</span>
        </div>
        <div className="planner-form">
          <div className="inline-fields">
            <label className="field">
              <span>Diet preference</span>
              <select
                value={s.planPreferences.diet}
                onChange={(e) =>
                  commit((s) => {
                    s.planPreferences.diet = e.target
                      .value as State["planPreferences"]["diet"];
                  })
                }
              >
                {["Any", "Vegetarian", "Vegan", "Eggetarian"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Budget preference</span>
              <select
                value={s.planPreferences.budget}
                onChange={(e) =>
                  commit((s) => {
                    s.planPreferences.budget = e.target.value as
                      "Everyday" | "Flexible";
                  })
                }
              >
                <option>Everyday</option>
                <option>Flexible</option>
              </select>
            </label>
          </div>
          <div className="inline-fields">
            <label className="field">
              <span>Allergies to mention</span>
              <input
                value={s.planPreferences.allergies}
                maxLength={1000}
                onChange={(e) =>
                  commit((s) => {
                    s.planPreferences.allergies = e.target.value;
                  })
                }
                placeholder="e.g. Peanuts — verify ingredients yourself"
              />
            </label>
            <label className="field">
              <span>Foods to avoid</span>
              <input
                value={s.planPreferences.avoid}
                maxLength={1000}
                onChange={(e) =>
                  commit((s) => {
                    s.planPreferences.avoid = e.target.value;
                  })
                }
                placeholder="Comma-separated foods"
              />
            </label>
          </div>
          <label className="field">
            <span>What would make this useful?</span>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              maxLength={1000}
              placeholder="Lunch at work, a vegetarian dinner, less cooking…"
            />
          </label>
          <div className="planner-targets">
            <span>Uses your saved targets</span>
            <b>
              {s.profile.calories} kcal · {s.profile.protein} g protein
            </b>
          </div>
          <button
            className="button primary wide"
            disabled={busy}
            onClick={() => void generate()}
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}{" "}
            {s.settings.aiMode === "offline"
              ? "Connect GPT to plan my meals"
              : "Generate GPT meal plan"}
          </button>
          <p className="help">
            GPT proposes foods from your library. Daywell calculates the totals.
            These are estimates, not a medical diet or an allergen guarantee.
          </p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
      {plan && (
        <section className="panel meal-plan">
          <div className="section-heading">
            <span>
              <Utensils size={18} /> {plan.title}
            </span>
            <span className="chip">
              {draft ? "REVIEW DRAFT" : "SAVED PLAN"}
            </span>
          </div>
          <div className="plan-summary">
            <strong>
              {round(sum.calories)}
              <small> kcal</small>
            </strong>
            <span>
              {round(sum.protein)} g protein · {round(sum.carbs)} g carbs ·{" "}
              {round(sum.fat)} g fat
            </span>
          </div>
          <div className="plan-table-scroll">
            <table className="plan-table">
              <caption>
                One-day diet plan · portions can be changed before logging
              </caption>
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Food & serving</th>
                  <th>Portion</th>
                  <th>kcal</th>
                  <th>Protein</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((row, i) => {
                  const food = s.foods.find((f) => f.id === row.foodId);
                  return (
                    <tr key={i}>
                      <th scope="row">{row.slot}</th>
                      <td>
                        <b>{food?.name || "Food unavailable"}</b>
                        <small>{food?.serving}</small>
                        {row.note && <small>{row.note}</small>}
                      </td>
                      <td>
                        <div className="plan-stepper">
                          <button
                            aria-label={`Reduce portion for row ${i + 1}`}
                            onClick={() =>
                              editRow(
                                i,
                                Math.round((row.servings - 0.25) * 100) / 100,
                              )
                            }
                            disabled={row.servings <= 0.25}
                          >
                            <Minus size={13} />
                          </button>
                          <span>{row.servings}×</span>
                          <button
                            aria-label={`Increase portion for row ${i + 1}`}
                            onClick={() =>
                              editRow(
                                i,
                                Math.round((row.servings + 0.25) * 100) / 100,
                              )
                            }
                            disabled={row.servings >= 6}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      </td>
                      <td>{round((food?.calories || 0) * row.servings)}</td>
                      <td>{round((food?.protein || 0) * row.servings)} g</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>Estimated total</th>
                  <td>{round(sum.calories)}</td>
                  <td>{round(sum.protein)} g</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="plan-notes">{plan.notes}</p>
          {Math.abs(sum.calories - s.profile.calories) >
            s.profile.calories * 0.2 && (
            <p className="plan-warning">
              This draft is more than 20% away from your saved calorie target.
              Review portions; your target has not been changed.
            </p>
          )}
          <div className="planner-actions">
            {draft && (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    commit((s) => {
                      s.dietPlan = draft;
                    });
                    setDraft(null);
                    notify(
                      "Meal plan saved. Nothing has been logged as eaten.",
                    );
                  }}
                >
                  <Check size={17} /> Save this plan
                </button>
                <button className="button ghost" onClick={() => setDraft(null)}>
                  Discard draft
                </button>
              </>
            )}
            {!draft &&
              ["Breakfast", "Lunch", "Dinner", "Snack"]
                .filter((slot) => plan.rows.some((r) => r.slot === slot))
                .map((slot) => (
                  <button
                    className="button"
                    key={slot}
                    onClick={() => {
                      const entries = records
                        .filter((r) => r.slot === slot)
                        .map((r) => ({
                          ...r,
                          id: uid(),
                          note: "Logged from saved meal plan after confirmation",
                        }));
                      commit((s) => s.meals.push(...entries));
                      notify(`${slot} logged as eaten`, () =>
                        commit((s) => {
                          s.meals = s.meals.filter(
                            (m) => !entries.some((e) => e.id === m.id),
                          );
                        }),
                      );
                    }}
                  >
                    I ate this {slot.toLowerCase()} <Plus size={15} />
                  </button>
                ))}
          </div>
        </section>
      )}
      {!plan && (
        <div className="planner-empty">
          <Utensils size={30} />
          <h3>Your next meal can be simple.</h3>
          <p>
            Connect ChatGPT, set your preferences, and review a plan made from
            your food library.
          </p>
        </div>
      )}
    </>
  );
}
export function WorkoutPlanner({
  state: s,
  commit,
  catalog,
  connect,
  onTrain,
  notify,
}: {
  state: State;
  commit: Commit;
  catalog: Exercise[];
  connect: () => void;
  onTrain: () => void;
  notify: (message: string, undo?: () => void) => void;
}) {
  const [minutes, setMinutes] = useState(30),
    [energy, setEnergy] = useState("Okay"),
    [request, setRequest] = useState(""),
    [pain, setPain] = useState(false),
    [draft, setDraft] = useState<WorkoutPlan | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const plan = draft || s.workoutPlan;
  async function generate() {
    if (s.settings.aiMode === "offline") {
      connect();
      return;
    }
    setBusy(true);
    setError("");
    try {
      setDraft(
        await generateWorkout(s, commit, catalog, {
          minutes,
          energy,
          request,
          pain,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel planner-brief">
        <div className="section-heading">
          <span>
            <Clock size={18} /> What fits today?
          </span>
          <span className="chip">TODAY ONLY</span>
        </div>
        <div className="planner-form">
          <div className="field">
            <span>Time available</span>
            <div className="time-options">
              {[15, 20, 30, 45, 60].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={minutes === v}
                  onClick={() => setMinutes(v)}
                >
                  {v} min
                </button>
              ))}
            </div>
          </div>
          <div className="inline-fields">
            <label className="field">
              <span>Energy today</span>
              <select
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
              >
                <option>Low</option>
                <option>Okay</option>
                <option>Good</option>
              </select>
            </label>
            <label className="field">
              <span>Equipment available</span>
              <input
                value={s.planPreferences.equipment}
                onChange={(e) =>
                  commit((s) => {
                    s.planPreferences.equipment = e.target.value;
                  })
                }
                maxLength={1000}
                placeholder="e.g. Dumbbells, mat"
              />
            </label>
          </div>
          <label className="field">
            <span>What should change?</span>
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              maxLength={1000}
              placeholder="Less time, tired legs, prefer upper body, keep it easy…"
            />
          </label>
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={pain}
              onChange={(e) => setPain(e.target.checked)}
            />
            <span>I have pain or an injury that affects today’s training.</span>
          </label>
          <div className="rest-day-option">
            <span>
              {s.restDays.includes(dayKey())
                ? "Rest is planned for today."
                : "Need a full break instead?"}
            </span>
            <button
              className="button"
              onClick={() => {
                commit((s) => {
                  s.restDays = s.restDays.includes(dayKey())
                    ? s.restDays.filter((d) => d !== dayKey())
                    : [...s.restDays, dayKey()];
                });
                notify(
                  "Today?s rest preference updated. Completed work and any current session are kept.",
                );
              }}
            >
              {s.restDays.includes(dayKey())
                ? "Remove rest-day mark"
                : "Mark today as rest"}
            </button>
          </div>
          {pain ? (
            <div className="info-box">
              <ShieldCheck size={20} />
              <p>
                Rest from painful movements and get individual guidance. Daywell
                won’t generate a workout to push through an injury.
              </p>
            </div>
          ) : (
            <>
              <button
                className="button primary wide"
                disabled={busy || !catalog.length}
                onClick={() => void generate()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}{" "}
                {s.settings.aiMode === "offline"
                  ? "Connect GPT for today’s workout"
                  : "Ask GPT for today’s workout"}
              </button>
              {s.active && (
                <button
                  className="button wide"
                  onClick={() => {
                    const next = shortenWorkout(s.active!, minutes);
                    if (!next.exercises.length) {
                      setError(
                        "All sets are already complete. Finish your session or take a rest.",
                      );
                      return;
                    }
                    setDraft(next);
                  }}
                >
                  Shorten my current workout · no AI needed
                </button>
              )}
            </>
          )}
          <p className="help">
            Suggestions are a draft. Your completed sets are kept, and weekly
            routines stay unchanged.
          </p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>
      {plan && !pain && (
        <section className="panel workout-proposal">
          <div className="section-heading">
            <span>
              <Dumbbell size={18} /> {plan.title}
            </span>
            <span className="chip">
              {plan.minutes} MIN BUDGET ·{" "}
              {plan.source === "gpt" ? "GPT" : "MANUAL"}
            </span>
          </div>
          <p className="plan-notes">{plan.notes}</p>
          <div className="plan-table-scroll">
            <table className="plan-table">
              <caption>
                Proposed workout · check ability, time and effort before
                applying
              </caption>
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Sets</th>
                  <th>Reps</th>
                  <th>Rest</th>
                </tr>
              </thead>
              <tbody>
                {plan.exercises.map((e, i) => (
                  <tr key={e.exerciseId}>
                    <th scope="row">
                      {catalog.find((c) => c.id === e.exerciseId)?.name ||
                        e.exerciseId}
                      <small>{e.note}</small>
                    </th>
                    <td>
                      <div className="plan-stepper">
                        <button
                          aria-label={`Fewer sets for exercise ${i + 1}`}
                          disabled={e.sets <= 1}
                          onClick={() => {
                            const p = structuredClone(plan);
                            p.exercises[i].sets--;
                            setDraft(p);
                          }}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{e.sets}</span>
                        <button
                          aria-label={`More sets for exercise ${i + 1}`}
                          disabled={e.sets >= 5}
                          onClick={() => {
                            const p = structuredClone(plan);
                            p.exercises[i].sets++;
                            setDraft(p);
                          }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </td>
                    <td>{e.reps}</td>
                    <td>{e.rest}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="plan-notes">Warm-up: {plan.warmup}</p>
          <div className="planner-actions">
            <button
              className="button primary"
              onClick={() => {
                commit((s) => {
                  s.active = applyWorkout(plan, s, catalog);
                  s.restDays = s.restDays.filter((d) => d !== dayKey());
                  s.workoutPlan = plan;
                });
                setDraft(null);
                notify("Today’s session updated; completed sets kept.");
                onTrain();
              }}
            >
              <Check size={17} />{" "}
              {s.active ? "Apply to this session" : "Start this session"}
            </button>
            {draft && (
              <button className="button ghost" onClick={() => setDraft(null)}>
                Discard draft
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
