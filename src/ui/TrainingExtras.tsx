import { useState } from "react";
import {
  CalendarDays,
  Plus,
  Check,
  ArrowUpRight,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { dayKey, shiftDay, type State } from "../domain";
import { strengthRecords } from "../improvements";
export function WeeklyPlan({
  state: s,
  commit,
  begin,
}: {
  state: State;
  commit: (f: (s: State) => void) => void;
  begin: (r: State["routines"][number]) => void;
}) {
  const [edit, setEdit] = useState<number | null>(null);
  return (
    <section className="panel weekly-plan">
      <div className="section-heading">
        <span>
          <CalendarDays size={17} /> Your weekly rhythm
        </span>
        <small>Tap a day to plan</small>
      </div>
      <div className="plan-days">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const p = s.weeklyPlan.find((p) => p.weekday === day),
            r = s.routines.find((r) => r.id === p?.routineId);
          return (
            <button
              className={new Date().getDay() === day ? "today" : ""}
              key={day}
              onClick={() => setEdit(edit === day ? null : day)}
              aria-label={`Plan ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day]}`}
              aria-expanded={edit === day}
            >
              <span>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]}
              </span>
              <b>{r ? r.name : "Rest"}</b>
              {r ? <span className="plan-dot" /> : <Plus size={12} />}
            </button>
          );
        })}
      </div>
      {edit !== null && (
        <div className="plan-editor">
          <label className="field">
            <span>
              {
                [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ][edit]
              }{" "}
              routine
            </span>
            <select
              value={
                s.weeklyPlan.find((p) => p.weekday === edit)?.routineId || ""
              }
              onChange={(e) => {
                const id = e.target.value;
                commit((s) => {
                  s.weeklyPlan = s.weeklyPlan.filter((p) => p.weekday !== edit);
                  if (id) s.weeklyPlan.push({ weekday: edit, routineId: id });
                });
              }}
            >
              <option value="">Rest / no session planned</option>
              {s.routines.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" onClick={() => setEdit(null)}>
            <Check size={15} /> Done
          </button>
        </div>
      )}
    </section>
  );
}
export function TrainingProgress({ state: s }: { state: State }) {
  const records = strengthRecords(s.sessions),
    today = dayKey(),
    days = Array.from({ length: 28 }, (_, i) => shiftDay(today, -27 + i));
  return (
    <div className="training-progress-extra">
      <section className="panel">
        <div className="section-heading">
          <span>
            <CalendarDays size={17} /> Showing up
          </span>
          <small>Last 28 days</small>
        </div>
        <div className="consistency-grid">
          {days.map((date) => {
            const count = s.sessions.filter((w) => w.date === date).length;
            return (
              <span
                key={date}
                className={count ? "trained" : ""}
                aria-label={`${date}: ${count} workouts`}
                title={`${date}: ${count} workouts`}
              >
                {new Date(date + "T12:00:00").getDate()}
              </span>
            );
          })}
        </div>
        <p className="help">
          Highlighted days have a completed workout. Rest days are part of your
          rhythm.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <span>
            <Trophy size={17} /> Your strength records
          </span>
          <small>Best logged load</small>
        </div>
        {records.slice(0, 5).map((r) => (
          <div className="record-row" key={r.name}>
            <span>
              <b>{r.name}</b>
              <small>{r.date}</small>
            </span>
            <strong>
              {r.kg}
              <small> kg × {r.reps}</small>
            </strong>
          </div>
        ))}
        {!records.length && (
          <p className="help no-records">
            Complete weighted sets to see your records here. Bodyweight training
            still counts toward consistency.
          </p>
        )}
      </section>
    </div>
  );
}
