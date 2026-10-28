import { useState } from "react";
import {
  Search,
  Star,
  Plus,
  ArrowLeft,
  Camera,
  ScanLine,
  LoaderCircle,
  Leaf,
  ChefHat,
  RotateCcw,
  Sun,
  Moon,
  Utensils,
  X,
  Check,
} from "lucide-react";
import { type Food, type State, type Meal, totals, dayKey } from "../domain";
import { makeRecipe, previousMeal, recentFoods } from "../improvements";
import { lookupBarcode } from "../platform";
import { MealPhoto } from "./PhotoMeal";
import { foodMatches } from "../data/indianFoods";
import { photoPortion } from "../photoModel";
type Open = (kind: string, data?: unknown) => void;
const slots = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
const n = (v: number) => Math.round(v).toLocaleString();

export function FoodDiary({
  state: s,
  date,
  open,
  remove,
  onRepeat,
}: {
  state: State;
  date: string;
  open: Open;
  remove: (id: string) => void;
  onRepeat: (meals: Meal[]) => void;
}) {
  const rows = s.meals.filter((m) => m.date === date),
    sum = totals(rows),
    unknown = rows.filter((m) => m.food.nutritionKnown === false).length;
  return (
    <>
      <div className="diary-tools">
        <button
          className="button primary"
          onClick={() => open("photoMeal", { date, slot: "Lunch" })}
        >
          <Camera size={18} /> Photo meal
        </button>
        <button
          className="button"
          onClick={() => open("recipe", { date, slot: "Lunch" })}
        >
          <ChefHat size={18} /> Create recipe
        </button>
      </div>
      <section className="panel diary-summary">
        <div>
          <span className="eyebrow">
            {date === dayKey() ? "TODAY’S" : "DAILY"} FOOD
          </span>
          <strong>
            {n(sum.calories)}
            <small> kcal logged</small>
          </strong>
          <span>
            {rows.length} food entries
            {unknown ? ` · ${unknown} without nutrition` : ""}
          </span>
        </div>
        <div className="diary-summary-nutrients">
          {[
            ["Protein", sum.protein, "var(--sage)"],
            ["Carbs", sum.carbs, "var(--amber)"],
            ["Fat", sum.fat, "var(--lilac)"],
          ].map(([label, v, color]) => (
            <div key={String(label)}>
              <i style={{ background: String(color) }} />
              <span>{label}</span>
              <b>
                {n(Number(v))}
                <small> g</small>
              </b>
            </div>
          ))}
        </div>
      </section>
      {unknown > 0 && (
        <p className="unknown-inline">
          Photo-only meals stay in your diary; their unknown nutrition is
          excluded from totals.
        </p>
      )}
      <div className="meal-grid">
        {slots.map((slot, i) => {
          const meals = rows.filter((m) => m.slot === slot),
            previous = previousMeal(s.meals, slot, date);
          return (
            <section className="panel meal-panel" key={slot}>
              <div className="section-heading">
                <span>
                  {i === 0 ? (
                    <Sun size={18} />
                  ) : i === 2 ? (
                    <Moon size={18} />
                  ) : (
                    <Utensils size={18} />
                  )}{" "}
                  {slot}
                </span>
                <small>{n(totals(meals).calories)} kcal known</small>
              </div>
              {meals.map((m) => (
                <div className="food-row" key={m.id}>
                  {m.photo && (
                    <MealPhoto
                      photo={{
                        ...m.photo,
                        eatenPercent: Math.round(m.quantity * 100),
                      }}
                      onOpen={() => open("photoView", m)}
                    />
                  )}
                  <button
                    className="food-content"
                    onClick={() =>
                      m.photo
                        ? open("photoMeal", {
                            existing: m,
                            date: m.date,
                            slot: m.slot,
                          })
                        : open("editMeal", m)
                    }
                  >
                    <b>{m.food.name}</b>
                    <small>
                      {m.photo
                        ? photoPortion(m)
                        : `${m.quantity} × ${m.food.serving}`}
                    </small>
                    {m.food.recipe && (
                      <span className="inline-recipe-tag">Your recipe</span>
                    )}
                  </button>
                  <span>
                    {m.food.nutritionKnown === false ? (
                      <small>Not estimated</small>
                    ) : (
                      n(m.food.calories * m.quantity)
                    )}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${m.food.name}`}
                    onClick={() => remove(m.id)}
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              {!meals.length && (
                <div className="meal-empty">
                  <p>No {slot.toLowerCase()} logged yet.</p>
                  {previous.length > 0 && (
                    <button
                      className="text-button repeat-meal"
                      onClick={() => onRepeat(previous)}
                    >
                      <RotateCcw size={14} /> Repeat previous{" "}
                      {slot.toLowerCase()}
                    </button>
                  )}
                </div>
              )}
              <div className="meal-panel-actions">
                <button
                  className="add-meal"
                  onClick={() => open("food", { slot, date })}
                >
                  <Plus size={17} /> Add food
                </button>
                <button
                  className="add-photo-small"
                  aria-label={`Photo for ${slot}`}
                  onClick={() => open("photoMeal", { slot, date })}
                >
                  <Camera size={18} />
                </button>
              </div>
            </section>
          );
        })}
      </div>
      <p className="source-note">
        Values are estimates. Saved portions, recipe yields, and restaurant
        ingredients can vary.
      </p>
    </>
  );
}

export function FoodPickerV2({
  state: s,
  data,
  open,
  onAdd,
  onFavorite,
}: {
  state: State;
  data: { slot: string; date: string; foodId?: string };
  open: Open;
  onAdd: (food: Food, quantity: number, slot: string, date: string) => void;
  onFavorite: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("All foods"),
    [category, setCategory] = useState("All categories"),
    [selected, setSelected] = useState<Food | null>(
      s.foods.find((f) => f.id === data.foodId) || null,
    ),
    [quantity, setQuantity] = useState(1),
    [slot, setSlot] = useState(data.slot),
    [barcode, setBarcode] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const baseList =
    filter === "Recent"
      ? recentFoods(s)
      : filter === "Favourites"
        ? s.foods.filter((f) => s.favoriteFoodIds.includes(f.id))
        : filter === "Recipes"
          ? s.foods.filter((f) => f.recipe)
          : s.foods;
  const base = baseList.filter(
    (f) => category === "All categories" || f.category === category,
  );
  async function lookup() {
    setBusy(true);
    setError("");
    try {
      setSelected(await lookupBarcode(query.trim()));
      setBarcode(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!selected ? (
        <>
          <div className="food-entry-shortcuts">
            <button onClick={() => open("photoMeal", data)}>
              <Camera size={19} />
              <span>Photo meal</span>
            </button>
            <button
              onClick={() => {
                setBarcode(!barcode);
                setQuery("");
              }}
            >
              <ScanLine size={19} />
              <span>Barcode number</span>
            </button>
            <button onClick={() => open("customFood", data)}>
              <Plus size={19} />
              <span>Custom food</span>
            </button>
          </div>
          <div className="search-box">
            <Search size={18} />
            <input
              autoFocus
              aria-label={barcode ? "Product barcode" : "Search foods"}
              value={query}
              inputMode={barcode ? "numeric" : "text"}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                barcode
                  ? "Enter barcode digits"
                  : "Find a food, recipe, or favourite…"
              }
            />
          </div>
          {barcode ? (
            <>
              <p className="help">
                Packaged food lookup uses Open Food Facts. Check the label
                before saving.
              </p>
              <button
                className="button wide"
                disabled={busy}
                onClick={() => void lookup()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Search size={17} />
                )}{" "}
                Look up barcode
              </button>
            </>
          ) : (
            <>
              <div
                className="food-filters"
                role="group"
                aria-label="Food library filter"
              >
                {["All foods", "Recent", "Favourites", "Recipes"].map((f) => (
                  <button
                    key={f}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <label className="field food-category">
                <span>Food category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option>All categories</option>
                  {[
                    ...new Set(
                      s.foods
                        .map((f) => f.category)
                        .filter((x): x is string => !!x),
                    ),
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <p className="food-estimate-note">
                Indian household portions and preparation estimates. Recipes,
                oil and bowl sizes vary.
              </p>
              <div className="food-options">
                {base
                  .filter((f) => foodMatches(f, query))
                  .map((f) => (
                    <div className="food-option-row" key={f.id}>
                      <button
                        className="food-option"
                        onClick={() => {
                          setSelected(f);
                          setQuantity(1);
                        }}
                      >
                        <span className="food-icon">
                          {f.recipe ? (
                            <ChefHat size={18} />
                          ) : (
                            <Leaf size={18} />
                          )}
                        </span>
                        <div>
                          <b>{f.name}</b>
                          <small>
                            {f.serving} · {n(f.protein)} g protein
                          </small>
                        </div>
                        <span>
                          {n(f.calories)}
                          <small> kcal</small>
                        </span>
                      </button>
                      <button
                        className={
                          "icon-button favourite-button " +
                          (s.favoriteFoodIds.includes(f.id)
                            ? "is-favourite"
                            : "")
                        }
                        aria-label={`${s.favoriteFoodIds.includes(f.id) ? "Unfavourite" : "Favourite"} ${f.name}`}
                        aria-pressed={s.favoriteFoodIds.includes(f.id)}
                        onClick={() => onFavorite(f.id)}
                      >
                        <Star size={18} />
                      </button>
                    </div>
                  ))}
                {!base.filter((f) =>
                  f.name.toLowerCase().includes(query.toLowerCase()),
                ).length && (
                  <div className="empty">
                    <Leaf size={25} />
                    <h3>
                      {filter === "Recent"
                        ? "Your recent meals will appear here"
                        : filter === "Favourites"
                          ? "Keep your go-to foods close"
                          : filter === "Recipes"
                            ? "Make your first recipe"
                            : "No matching food yet"}
                    </h3>
                    <p>
                      {filter === "Favourites"
                        ? "Tap a star beside any food to save it here."
                        : "Create a food or combine ingredients into a recipe."}
                    </p>
                    <button
                      className="button"
                      onClick={() =>
                        open(
                          filter === "Recipes" ? "recipe" : "customFood",
                          data,
                        )
                      }
                    >
                      <Plus size={16} />{" "}
                      {filter === "Recipes" ? "Create recipe" : "Create food"}
                    </button>
                  </div>
                )}
              </div>
              <button
                className="text-button recipe-library-link"
                onClick={() => open("recipe", data)}
              >
                <ChefHat size={16} /> Build a recipe from your food library
              </button>
            </>
          )}
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quantity > 0 && quantity <= 100)
              onAdd(selected, quantity, slot, data.date);
          }}
        >
          <button
            className="text-button"
            type="button"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={15} /> Food library
          </button>
          <div className="selected-food">
            <span className="food-icon big">
              {selected.recipe ? <ChefHat size={25} /> : <Leaf size={25} />}
            </span>
            <h3>{selected.name}</h3>
            <p>{selected.serving}</p>
          </div>
          <div className="inline-fields">
            <label className="field">
              <span>Servings</span>
              <input
                aria-label="Servings"
                type="number"
                min="0.05"
                max={100}
                step="0.05"
                required
                value={quantity || ""}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Meal</span>
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                {slots.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="serving-presets">
            {[0.5, 1, 1.5, 2].map((q) => (
              <button
                type="button"
                key={q}
                aria-pressed={quantity === q}
                onClick={() => setQuantity(q)}
              >
                {q}×
              </button>
            ))}
          </div>
          <div className="nutrition-preview">
            {[
              ["Calories", selected.calories, "kcal"],
              ["Protein", selected.protein, "g"],
              ["Carbs", selected.carbs, "g"],
              ["Fat", selected.fat, "g"],
            ].map(([label, value, unit]) => (
              <div key={String(label)}>
                <strong>
                  {n(Number(value) * quantity)}
                  <small> {unit}</small>
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {selected.recipe && (
            <details className="recipe-detail">
              <summary>
                Ingredients · makes {selected.recipe.servings} servings
              </summary>
              {selected.recipe.ingredients.map((x, i) => (
                <p key={i}>
                  {x.quantity} × {x.name} <small>{x.serving}</small>
                </p>
              ))}
            </details>
          )}
          <p className="help">{selected.source}</p>
          <button className="button primary wide" type="submit">
            <Check size={17} /> Add to {slot.toLowerCase()}
          </button>
        </form>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function RecipeBuilder({
  foods,
  onSave,
}: {
  foods: Food[];
  onSave: (food: Food) => void;
}) {
  const [name, setName] = useState(""),
    [servings, setServings] = useState(2),
    [parts, setParts] = useState<{ food: Food; quantity: number }[]>([]),
    [selected, setSelected] = useState(foods[0]?.id || ""),
    [quantity, setQuantity] = useState(1),
    [error, setError] = useState("");
  const sum = totals(
    parts.map((p) => ({
      id: "x",
      date: "2000-01-01",
      slot: "Snack",
      food: p.food,
      quantity: p.quantity,
      note: "",
    })),
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        try {
          onSave(makeRecipe(name, servings, parts));
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }}
    >
      <p className="help">
        Build the full batch, then choose how many servings it makes. We
        calculate nutrition per serving.
      </p>
      <label className="field">
        <span>Recipe name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={150}
          placeholder="e.g. My everyday dal"
        />
      </label>
      <div className="recipe-ingredients">
        {parts.map((p, i) => (
          <div key={i}>
            <span>
              {p.quantity} × {p.food.name}
              <small>{p.food.serving}</small>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remove ingredient ${i + 1}`}
              onClick={() => setParts(parts.filter((_, j) => j !== i))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="inline-fields">
        <label className="field">
          <span>Ingredient</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {foods
              .filter((f) => f.nutritionKnown !== false)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.serving}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Ingredient servings</span>
          <input
            type="number"
            min="0.05"
            max={100}
            step="0.05"
            value={quantity || ""}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        className="button wide"
        disabled={
          !selected || quantity <= 0 || quantity > 100 || parts.length >= 50
        }
        onClick={() => {
          const food = foods.find((f) => f.id === selected);
          if (food) setParts([...parts, { food, quantity }]);
          setQuantity(1);
        }}
      >
        <Plus size={17} /> Add ingredient
      </button>
      <label className="field">
        <span>Batch makes how many servings?</span>
        <input
          type="number"
          required
          min="0.25"
          max={100}
          step="0.25"
          value={servings || ""}
          onChange={(e) => setServings(Number(e.target.value))}
        />
      </label>
      <div className="your-portion">
        <span>Per serving</span>
        <b>{servings > 0 ? n(sum.calories / servings) : "—"} kcal</b>
        <small>
          {servings > 0 ? n(sum.protein / servings) : "—"} g protein ·{" "}
          {parts.length} ingredients
        </small>
      </div>
      {error && <p className="error-text">{error}</p>}
      <button
        type="submit"
        className="button primary wide"
        disabled={!parts.length || !name.trim() || servings <= 0}
      >
        Save recipe
      </button>
    </form>
  );
}
