import { useState } from "react";
import { Check, Search, HelpCircle, Leaf, ShieldCheck } from "lucide-react";
import type { State } from "../domain";
import type { PlateItem } from "../photoModel";
import { rankFoodMatches, type Recognition } from "../recognition";
export default function RecognitionReview({
  result,
  items,
  state: s,
  onConfirm,
  onLabel,
  onClarify,
}: {
  result: Recognition;
  items: PlateItem[];
  state: State;
  onConfirm: (
    index: number,
    foodId: string | null,
    servings: number,
    remember: boolean,
  ) => void;
  onLabel: (index: number, label: string) => void;
  onClarify: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState("");
  return (
    <section className="recognition-review">
      <div className="recognition-heading">
        <span>
          <Leaf size={18} />
        </span>
        <div>
          <h3>Let’s check what’s on the plate.</h3>
          <p>Food suggestions, not confirmed facts. You choose the match.</p>
        </div>
      </div>
      {result.quality !== "clear" && (
        <p className="recognition-caution">
          The recognizer marked this photo {result.quality}. A clearer photo may
          help.
        </p>
      )}
      {result.notes && <p className="recognition-notes">{result.notes}</p>}
      {result.question && items.some((item) => item.recognizedName&&!item.confirmed) && (
        <div className="recognition-question">
          <b>
            <HelpCircle size={16} />
            {result.question}
          </b>
          <label className="field">
            <span>Your clarification (optional)</span>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={500}
              placeholder="A detail the photo cannot show"
            />
          </label>
          <button
            className="button"
            disabled={!answer.trim()}
            onClick={() => onClarify(answer)}
          >
            Recognize again with this detail
          </button>
        </div>
      )}
      {items.map((item, index) => item.recognizedName?(
        <RecognizedDish
          key={`${item.recognizedName || item.name}-${index}`}
          item={item}
          index={index}
          dish={
            result.dishes.find((dish) => dish.name === item.recognizedName) ||
            result.dishes[index]
          }
          state={s}
          onConfirm={onConfirm}
          onLabel={onLabel}
        />
      ):null)}
      <div className="recognition-boundary">
        <ShieldCheck size={16} />
        <p>
          Amounts and ingredients need your review. Nutrition comes from your
          selected library food. Confidence labels are the model’s judgement,
          not measured probabilities.
        </p>
      </div>
    </section>
  );
}
function RecognizedDish({
  item,
  index,
  dish,
  state: s,
  onConfirm,
  onLabel,
}: {
  item: PlateItem;
  index: number;
  dish: Recognition["dishes"][number] | undefined;
  state: State;
  onConfirm: (
    index: number,
    foodId: string | null,
    servings: number,
    remember: boolean,
  ) => void;
  onLabel: (index: number, label: string) => void;
}) {
  const [foodId, setFoodId] = useState(item.catalogFoodId || ""),
    [servings, setServings] = useState(item.visibleServings || 1),
    [remember, setRemember] = useState(false),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState(!item.confirmed);
  const selected = s.foods.find((f) => f.id === foodId),
    matches = rankFoodMatches(item.name, s.foods, s.recognitionCorrections);
  const candidates = query
    ? s.foods
        .filter((f) =>
          `${f.name} ${(f.aliases || []).join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .slice(0, 40)
    : s.foods;
  return (
    <article
      className={"recognized-dish " + (item.confirmed ? "confirmed" : "")}
    >
      <div className="recognized-dish-top">
        <div>
          <span className="eyebrow">FOOD {index + 1}</span>
          <h4>{item.name}</h4>
          <p>
            Visible amount:{" "}
            {dish?.visibleAmount || item.serving || "Review the portion"}
          </p>
        </div>
        <span
          className={
            "recognition-badge " +
            (item.confirmed
              ? "accepted"
              : item.recognitionConfidence === "low"
                ? "uncertain"
                : "")
          }
        >
          {item.confirmed ? (
            <>
              <Check size={13} />
              Confirmed by you
            </>
          ) : item.recognitionConfidence === "high" ? (
            "Suggested match"
          ) : item.recognitionConfidence === "medium" ? (
            "Check the dish"
          ) : (
            "Uncertain"
          )}
        </span>
      </div>
      {!item.confirmed && dish && dish.alternatives.length > 0 && (
        <div className="recognition-alternatives">
          <span>Could also be:</span>
          {dish.alternatives.map((label) => (
            <button
              key={label}
              onClick={() => {
                onLabel(index, label);
                setFoodId(
                  rankFoodMatches(label, s.foods, s.recognitionCorrections)[0]
                    ?.food.id || "",
                );
                setEditing(true);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {editing ? (
        <>
          <label className="field">
            <span>Food name for dish {index + 1}</span>
            <input
              value={item.name}
              maxLength={150}
              onChange={(e) => {
                onLabel(index, e.target.value);
                setFoodId("");
              }}
            />
          </label>
          {matches.length > 0 && (
            <div
              className="catalog-match-chips"
              aria-label={`Suggested library matches for dish ${index + 1}`}
            >
              {matches.map((match) => (
                <button
                  key={match.food.id}
                  aria-pressed={foodId === match.food.id}
                  onClick={() => setFoodId(match.food.id)}
                >
                  {match.food.name}
                  {match.remembered && <small>Your previous choice</small>}
                </button>
              ))}
            </div>
          )}
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label={`Search library for dish ${index + 1}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a different food…"
            />
          </div>
          <label className="field">
            <span>Library match for dish {index + 1}</span>
            <select value={foodId} onChange={(e) => setFoodId(e.target.value)}>
              <option value="">Keep identity only · nutrition unknown</option>
              {selected && !candidates.some((f) => f.id === selected.id) && (
                <option value={selected.id}>
                  {selected.name} · {selected.serving}
                </option>
              )}
              {candidates.map((food) => (
                <option key={food.id} value={food.id}>
                  {food.name} · {food.serving}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <div className="recognized-serving">
              <div>
                <b>{selected.serving}</b>
                <small>
                  One library serving · {Math.round(selected.calories)} kcal
                  estimate
                </small>
              </div>
              <label className="field">
                <span>Pictured servings for dish {index + 1}</span>
                <input
                  type="number"
                  min="0.05"
                  max={20}
                  step="0.05"
                  value={servings || ""}
                  onChange={(e) => setServings(Number(e.target.value))}
                />
              </label>
              <p>
                {Math.round(selected.calories * (servings || 0))} kcal for the
                pictured amount, before selecting what you ate.
              </p>
            </div>
          )}
          {selected && (
            <label className="review-checkbox recognition-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>
                Remember my label choice when I save this meal.
                <small>
                  Saved locally and included as a label hint on future
                  recognition requests. This does not train a visual model.
                  Manage choices in Memory.
                </small>
              </span>
            </label>
          )}
          <button
            className="button primary wide"
            disabled={
              !item.name.trim() ||
              !Number.isFinite(servings) ||
              servings < 0.05 ||
              servings > 20
            }
            onClick={() => {
              onConfirm(index, foodId || null, servings, remember);
              setEditing(false);
            }}
          >
            <Check size={16} />
            {selected
              ? "Confirm this food & pictured amount"
              : "Confirm name · keep nutrition unknown"}
          </button>
        </>
      ) : (
        <div className="recognized-confirmed">
          <span>
            {item.nutritionKnown
              ? `${item.visibleServings} × ${selected?.serving || item.serving}`
              : "Food name confirmed; nutrition is unknown."}
          </span>
          <button
            className="text-button"
            onClick={() => {
              onLabel(index, item.name);
              setEditing(true);
            }}
          >
            Change match or amount
          </button>
        </div>
      )}
    </article>
  );
}
