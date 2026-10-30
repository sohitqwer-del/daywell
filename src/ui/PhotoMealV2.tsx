import { useState, useRef, useEffect } from "react";
import LiveCamera from "./LiveCamera";
import {
  Camera,
  ImagePlus,
  Check,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  LoaderCircle,
  Plus,
  X,
  Utensils,
  Info,
  RotateCw,
} from "lucide-react";
import { isNative, Native } from "../platform";
import {
  preparePhoto,
  takePhoto,
  readPhoto,
  savePhoto,
  rotatePhoto,
  type PreparedPhoto,
} from "../photos";
import { dayKey, uid, type Meal, type State, foodSchema } from "../domain";
import { askPlanning } from "../planning";
import { parseEstimate, plateTotals, type PlateItem } from "../photoModel";
import {
  recognizeMeal,
  suggestRecognizedFoods,
  confirmRecognizedFood,
  rememberCorrection,
  type Recognition,
} from "../recognition";
import RecognitionReview from "./RecognitionReview";
import {
  loadPhotoDraft,
  savePhotoDraft,
  clearPhotoDraft,
  type PhotoDraft,
} from "../photoDrafts";
export default function PhotoMealV2({
  state: s,
  date,
  slot: initialSlot,
  onSave,
  onConnect,
  commit,
  restoredImage,
  existing,
}: {
  state: State;
  date: string;
  slot: string;
  onSave: (meal: Meal) => void;
  onConnect: () => void;
  commit: (f: (s: State) => void) => void;
  restoredImage?: { image: string; thumbnail: string };
  existing?: Meal;
}) {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(
      restoredImage || null,
    ),
    [stage, setStage] = useState(
      existing || restoredImage ? "review" : "capture",
    ),
    [name, setName] = useState(existing?.food.name || ""),
    [slot, setSlot] = useState(existing?.slot || initialSlot),
    [place, setPlace] = useState(""),
    [notes, setNotes] = useState(existing?.note || ""),
    [percent, setPercent] = useState(
      existing?.photo?.items?.length
        ? 100
        : Math.round((existing?.quantity || 1) * 100),
    ),
    [mode, setMode] = useState<"whole" | "items">(
      existing?.photo?.items?.length ? "items" : "whole",
    ),
    [items, setItems] = useState<PlateItem[]>(existing?.photo?.items || []),
    [plate, setPlate] = useState({
      calories: existing?.food.calories || 0,
      protein: existing?.food.protein || 0,
      carbs: existing?.food.carbs || 0,
      fat: existing?.food.fat || 0,
    }),
    [nutrition, setNutrition] = useState(
      !!existing && existing.food.nutritionKnown !== false,
    ),
    [estimated, setEstimated] = useState(existing?.photo?.estimated || false),
    [reviewed, setReviewed] = useState(!!existing),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [ingredient, setIngredient] = useState(s.foods[0]?.id || ""),
    [visibleServings, setVisibleServings] = useState(1);
  const [recognition, setRecognition] = useState<Recognition | null>(
      existing?.photo?.recognition || null,
    ),
    [remember, setRemember] = useState<{ label: string; foodId: string }[]>([]),
    [recoverable, setRecoverable] = useState<PhotoDraft | null>(null),
    [mealDate, setMealDate] = useState(date),
    [draftStatus, setDraftStatus] = useState(""),
    [qualityAccepted, setQualityAccepted] = useState(false),
    [recognitionKey, setRecognitionKey] = useState(0);
  const latestDraft = useRef<PhotoDraft | null>(null),
    saved = useRef(false);
  const input = useRef<HTMLInputElement>(null),
    alive = useRef(true),
    replaced = useRef(false),
    root = useRef<HTMLFieldSetElement>(null);
  latestDraft.current =
    !existing && photo
      ? {
          version: 1,
          updatedAt: new Date().toISOString(),
          date: mealDate,
          slot: slot as Meal["slot"],
          photo,
          name,
          place,
          notes,
          percent,
          mode,
          items,
          plate,
          nutrition,
          estimated,
          reviewed,
          recognition,
          remember,
        }
      : null;
  useEffect(() => {
    if (!existing && !restoredImage)
      void loadPhotoDraft()
        .then((draft) => {
          if (alive.current) setRecoverable(draft);
        })
        .catch((e) => {
          if (alive.current)
            setDraftStatus(e instanceof Error ? e.message : String(e));
        });
  }, []);
  useEffect(() => {
    if (existing || !photo || saved.current) return;
    const timer = setTimeout(() => {
      const value = latestDraft.current;
      if (value)
        void savePhotoDraft(value)
          .then(() => {
            if (alive.current) setDraftStatus("Draft saved on this device");
          })
          .catch(() => {
            if (alive.current)
              setDraftStatus(
                "Draft could not be saved. Keep this screen open until you log the meal.",
              );
          });
    }, 600);
    return () => clearTimeout(timer);
  }, [
    photo,
    name,
    place,
    notes,
    percent,
    mode,
    items,
    plate,
    nutrition,
    estimated,
    reviewed,
    recognition,
    remember,
    mealDate,
  ]);
  useEffect(() => {
    const flush = () => {
      if (!saved.current && latestDraft.current)
        void savePhotoDraft(latestDraft.current).catch(() => {});
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, []);
  function resumeDraft(draft: PhotoDraft) {
    setPhoto(draft.photo);
    setName(draft.name);
    setPlace(draft.place);
    setNotes(draft.notes);
    setPercent(draft.percent);
    setMode(draft.mode);
    setItems(draft.items);
    setPlate(draft.plate);
    setNutrition(draft.nutrition);
    setEstimated(draft.estimated);
    setReviewed(draft.reviewed);
    setRecognition(draft.recognition);
    setRemember(draft.remember);
    setMealDate(draft.date);
    setSlot(draft.slot);
    setStage("review");
    setRecoverable(null);
    setDraftStatus("Recovered your unsaved meal");
    saved.current = false;
  }
  async function discardDraft() {
    saved.current = true;
    latestDraft.current = null;
    await clearPhotoDraft();
    setRecoverable(null);
    setDraftStatus("");
    setPhoto(null);
    setStage("capture");
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (existing?.photo)
      readPhoto(existing.photo.id)
        .then((image) => {
          if (alive.current)
            setPhoto({ image, thumbnail: existing.photo!.thumbnail });
        })
        .catch(() => setError("Choose the photo again to edit this entry."));
  }, [existing?.id]);
  function installPhoto(next: { image: string; thumbnail: string }) {
    setPhoto(next);
    replaced.current = true;
    setStage("review");
    setEstimated(false);
    setReviewed(false);
    setNutrition(false);
    setItems([]);
    setMode("whole");
    setPlate({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    setNotes("");
    setError("");
    setRecognition(null);
    setRemember([]);
    setRecoverable(null);
    setQualityAccepted(false);
    saved.current = false;
  }
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setBusy("");
    }
  }
  async function capture(source: "camera" | "gallery", system = false) {
    if (isNative && source === "camera" && !system) {
      setStage("camera");
      return;
    }
    if (!isNative) {
      input.current!.capture = source === "camera" ? "environment" : "";
      input.current!.click();
      return;
    }
    await run("photo", async () => {
      const next = await takePhoto(source);
      if (alive.current) installPhoto(next);
    });
  }
  async function analyze(clarification = "") {
    if (!photo) return;
    if (photo.qualityWarnings?.length && !qualityAccepted) {
      setError(
        "Review the photo-quality note, then choose whether to use this image.",
      );
      return;
    }
    if (!isNative || s.settings.aiMode === "offline") {
      onConnect();
      return;
    }
    await run("estimate", async () => {
      const connection = await Native.status();
      if (
        s.settings.aiMode === "chatgpt"
          ? !connection.chatgpt
          : !connection.hasKey
      ) {
        onConnect();
        return;
      }
      const result = await recognizeMeal(
        s,
        commit,
        photo.image,
        name,
        clarification,
      );
      if (!alive.current) return;

      if (!result.isFood) {
        setError(
          "No food was identified in this attempt. Your draft is unchanged. Retake it or label foods manually.",
        );
        return;
      }
      if (!result.dishes.length) {
        setError(
          result.notes ||
            "The food could not be identified clearly. Try a clearer photo or add foods manually.",
        );
        return;
      }
      setRecognition(result);
      setRecognitionKey((key) => key + 1);
      setName(result.mealName || name);
      setNotes(result.notes);
      setItems(suggestRecognizedFoods(result, s));
      setMode("items");
      setNutrition(false);
      setEstimated(true);
      setReviewed(false);
      setRemember([]);
    });
  }
  function confirmDish(
    index: number,
    foodId: string | null,
    servings: number,
    rememberChoice: boolean,
  ) {
    try {
      const food = foodId ? s.foods.find((f) => f.id === foodId) || null : null;
      const next = confirmRecognizedFood(items[index], food, servings);
      setItems(items.map((item, i) => (i === index ? next : item)));
      const label = items[index].recognizedName || items[index].name;
      setRemember((previous) => [
        ...previous.filter((c) => c.label !== label),
        ...(rememberChoice && foodId ? [{ label, foodId }] : []),
      ]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  const recognitionConfirmed = items
    .filter((item) => item.eatenPercent > 0 && item.recognizedName)
    .every((item) => item.confirmed === true);
  const canAcceptEstimate = recognition ? recognitionConfirmed : reviewed;
  const total =
    mode === "items"
      ? plateTotals(items)
      : {
          calories: (plate.calories * percent) / 100,
          protein: (plate.protein * percent) / 100,
          carbs: (plate.carbs * percent) / 100,
          fat: (plate.fat * percent) / 100,
        };
  async function save() {
    if (
      !photo ||
      !name.trim() ||
      busy ||
      (estimated && !canAcceptEstimate) ||
      (mode === "items" && !items.some((i) => i.eatenPercent > 0))
    )
      return;
    await run("save", async () => {
      const id = await savePhoto(
        photo.image,
        existing?.photo && !replaced.current ? existing.photo.id : undefined,
      );
      const known =
        mode === "items"
          ? items
              .filter((i) => i.eatenPercent > 0)
              .every((i) => i.nutritionKnown)
          : nutrition;
      const meal: Meal = {
        id: existing?.id || uid(),
        date: mealDate,
        slot: slot as Meal["slot"],
        food: foodSchema.parse({
          id: existing?.food.id || uid(),
          name: name.trim(),
          serving:
            mode === "items"
              ? "your selected food portions"
              : "the whole photographed plate",
          ...(mode === "items" ? total : plate),
          nutritionKnown: known,
          source: known
            ? recognition
              ? "Confirmed library portions - indicative nutrition"
              : estimated
                ? "Photo estimate · reviewed portions"
                : "User-reviewed photo nutrition"
            : "Photo diary · nutrition unknown",
        }),
        quantity: mode === "items" ? 1 : percent / 100,
        note: [place && `Place: ${place}`, notes]
          .filter(Boolean)
          .join("\n")
          .slice(0, 1000),
        photo: {
          id,
          thumbnail: photo.thumbnail,
          estimated,
          ...(recognition ? { recognition } : {}),
          eatenPercent: mode === "items" ? 100 : percent,
          plateNote: [place, notes].filter(Boolean).join(" · ").slice(0, 1000),
          ...(mode === "items" ? { items } : {}),
        },
      };
      if (!existing) {
        saved.current = true;
        latestDraft.current = null;
        await clearPhotoDraft();
      }
      if (remember.length)
        commit((s) => {
          for (const correction of remember)
            rememberCorrection(s, correction.label, correction.foodId);
        });
      onSave(meal);
    });
  }
  return (
    <fieldset
      disabled={busy === "estimate"}
      className="photo-flow-v2"
      ref={root}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void run("photo", async () => {
            if (file.size > 20_000_000)
              throw Error("Choose a photo under 20 MB.");
            const url = URL.createObjectURL(file);
            try {
              const next = await preparePhoto(url);
              if (alive.current) installPhoto(next);
            } finally {
              URL.revokeObjectURL(url);
            }
          });
          e.target.value = "";
        }}
      />
      {recoverable && stage !== "camera" && (
        <div className="draft-recovery">
          <div>
            <b>You have an unsaved meal</b>
            <p>
              {recoverable.name || "Photo meal"}
              {" \u00b7 "}
              {recoverable.date}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => resumeDraft(recoverable)}
          >
            Resume meal draft
          </button>
          <button
            className="button ghost"
            onClick={() => void run("draft", discardDraft)}
          >
            Start a new meal
          </button>
        </div>
      )}
      <div className="photo-flow-steps">
        <span className={stage === "capture" ? "active" : "complete"}>
          1 · Photo
        </span>
        <i />
        <span className={stage === "review" ? "active" : ""}>
          2 · Food & portions
        </span>
      </div>
      {stage === "camera" ? (
        <LiveCamera
          onPhoto={installPhoto}
          onCancel={() => setStage(photo ? "review" : "capture")}
          onFallback={() => {
            setStage(photo ? "review" : "capture");
            void capture("camera", true);
          }}
        />
      ) : stage === "capture" ? (
        <>
          <div className="capture-intro">
            <span className="capture-emblem">
              <Camera size={42} strokeWidth={1.2} />
            </span>
            <h3>What’s on your plate?</h3>
            <p>
              Take one clear photo. Then choose how much of each food you ate.
            </p>
          </div>
          <button
            className="button primary wide capture-main"
            disabled={!!busy || !!recoverable}
            onClick={() => void capture("camera")}
          >
            <Camera size={20} /> Take photo
          </button>
          <button
            className="button wide"
            disabled={!!busy}
            onClick={() => void capture("gallery")}
          >
            <ImagePlus size={19} /> Choose photo
          </button>
          <div className="capture-tips">
            <b>A useful photo</b>
            <span>Whole plate in frame</span>
            <span>Good light, from above</span>
            <span>Include bowls and sides</span>
          </div>
          <p className="help">
            Photos stay private on your device. AI analysis is optional and uses
            your connected account.
          </p>
        </>
      ) : (
        <>
          {photo && (
            <div className="photo-review-preview">
              <img src={photo.image} alt="Plate to log" />
              <div>
                <button
                  disabled={!!busy}
                  onClick={() => void capture("camera")}
                >
                  <Camera size={15} /> Retake
                </button>
                <button
                  disabled={!!busy}
                  onClick={() => void capture("gallery")}
                >
                  <ImagePlus size={15} /> Replace
                </button>
              </div>
            </div>
          )}
          {photo && (
            <button
              className="text-button rotate-photo"
              disabled={!!busy}
              onClick={() =>
                void run("rotate", async () => {
                  const next = await rotatePhoto(photo.image);
                  setPhoto(next);
                  replaced.current = true;
                  setQualityAccepted(false);
                })
              }
            >
              <RotateCw size={15} /> Rotate photo
            </button>
          )}
          {photo?.qualityWarnings?.length ? (
            <div className="photo-quality">
              <b>Photo quality needs a check</b>
              {photo.qualityWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
              <label className="review-checkbox">
                <input
                  type="checkbox"
                  checked={qualityAccepted}
                  onChange={(e) => setQualityAccepted(e.target.checked)}
                />
                <span>Use this photo anyway for recognition</span>
              </label>
            </div>
          ) : null}
          {draftStatus && (
            <p className="draft-status" role="status">
              {draftStatus}
            </p>
          )}
          <label className="field">
            <span>What is on your plate?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={150}
              placeholder="e.g. Dal, rice and 2 rotis"
            />
          </label>
          <button
            className="button wide ai-photo-button"
            disabled={!!busy || !photo}
            onClick={() => void analyze("")}
          >
            {busy === "estimate" ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}{" "}
            {s.settings.aiMode === "offline"
              ? "Connect ChatGPT to identify foods"
              : "Recognize foods with GPT"}
          </button>
          <p className="photo-sharing-note">
            This photo, caption, food catalog and opted-in label hints are
            shared only when you request recognition. You confirm the foods
            before logging.
          </p>
          {recognition && items.length > 0 && (
            <RecognitionReview
              key={recognitionKey}
              result={recognition}
              items={items}
              state={s}
              onConfirm={confirmDish}
              onLabel={(index, label) =>
                setItems(
                  items.map((item, i) =>
                    i === index
                      ? {
                          ...item,
                          name: label,
                          confirmed: false,
                          nutritionKnown: false,
                        }
                      : item,
                  ),
                )
              }
              onClarify={(answer) => void analyze(answer)}
            />
          )}
          {recognition && (
            <button
              className="text-button discard-recognition"
              onClick={() => {
                setRecognition(null);
                setItems([]);
                setRemember([]);
                setEstimated(false);
                setMode("whole");
                setNutrition(false);
                setReviewed(false);
              }}
            >
              Discard suggestions and keep a photo-only meal
            </button>
          )}
          <div
            className="portion-mode"
            role="group"
            aria-label="How to choose portions"
          >
            <button
              aria-pressed={mode === "whole"}
              onClick={() => {
                if (items.length) {
                  setPlate(plateTotals(items, false));
                  setNutrition(items.every((item) => item.nutritionKnown));
                }
                setMode("whole");
              }}
            >
              Whole-plate share
            </button>
            <button
              aria-pressed={mode === "items"}
              onClick={() => setMode("items")}
            >
              Different amounts per food
            </button>
          </div>
          {mode === "whole" ? (
            <>
              <section className="portion-section">
                <div>
                  <h3>How much did you eat?</h3>
                  <strong>
                    {percent}
                    <small>% of this plate</small>
                  </strong>
                </div>
                <div className="portion-options">
                  {[25, 50, 75, 100].map((p) => (
                    <button
                      type="button"
                      key={p}
                      aria-pressed={percent === p}
                      onClick={() => setPercent(p)}
                    >
                      <span
                        className="portion-circle"
                        style={{
                          background: `conic-gradient(var(--sage) ${p}%, var(--raised) 0)`,
                        }}
                      />
                      {p === 25
                        ? "¼ plate"
                        : p === 50
                          ? "½ plate"
                          : p === 75
                            ? "¾ plate"
                            : "Whole plate"}
                    </button>
                  ))}
                </div>
                <label className="portion-range">
                  <span>Fine-tune portion</span>
                  <input
                    aria-label="Percentage of plate eaten"
                    type="range"
                    min={1}
                    max={100}
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                  />
                </label>
                <p className="portion-assumption">
                  This scales every dish equally. Use per-food portions if you
                  left different amounts.
                </p>
              </section>
              <label className="toggle-row">
                <span>
                  Add nutrition for the whole plate
                  <small>Enter values yourself or use a GPT estimate</small>
                </span>
                <input
                  type="checkbox"
                  checked={nutrition}
                  onChange={(e) => {
                    setNutrition(e.target.checked);
                    if (!e.target.checked) setEstimated(false);
                  }}
                />
              </label>
              {nutrition && (
                <div className="inline-fields plate-nutrients">
                  {(["calories", "protein", "carbs", "fat"] as const).map(
                    (key) => (
                      <label key={key} className="field">
                        <span>
                          {key === "calories"
                            ? "Whole plate kcal"
                            : `${key[0].toUpperCase() + key.slice(1)} (g)`}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={key === "calories" ? 10000 : 1500}
                          step="0.1"
                          placeholder="0"
                          value={plate[key] || ""}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (
                              value >= 0 &&
                              value <= (key === "calories" ? 10000 : 1500)
                            )
                              setPlate((p) => ({ ...p, [key]: value }));
                          }}
                        />
                      </label>
                    ),
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="dish-list">
                {items.map((item, index) => (
                  <section className="dish-portion" key={index}>
                    <div className="dish-heading">
                      <div>
                        <b>{item.name}</b>
                        <small>Pictured: {item.serving}</small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Remove dish ${index + 1}`}
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="dish-share-options">
                      {[0, 25, 50, 75, 100].map((p) => (
                        <button
                          key={p}
                          aria-label={`Eat ${p}% of ${item.name}`}
                          aria-pressed={item.eatenPercent === p}
                          onClick={() =>
                            setItems(
                              items.map((x, i) =>
                                i === index ? { ...x, eatenPercent: p } : x,
                              ),
                            )
                          }
                        >
                          {p === 0 ? "None" : p === 100 ? "All" : `${p}%`}
                        </button>
                      ))}
                    </div>
                    <div className="dish-nutrition">
                      <span>{item.eatenPercent}% eaten</span>
                      <b>
                        {item.nutritionKnown
                          ? Math.round(
                              (item.calories * item.eatenPercent) / 100,
                            ) + " kcal"
                          : "Not estimated"}
                      </b>
                    </div>
                    {!item.recognizedName && (
                      <details>
                        <summary>Correct pictured amount or nutrition</summary>
                        <label className="field">
                          <span>Pictured amount for {item.name}</span>
                          <input
                            value={item.serving}
                            onChange={(e) =>
                              setItems(
                                items.map((x, i) =>
                                  i === index
                                    ? {
                                        ...x,
                                        serving: e.target.value.slice(0, 150),
                                      }
                                    : x,
                                ),
                              )
                            }
                          />
                        </label>
                        <div className="inline-fields">
                          {(
                            ["calories", "protein", "carbs", "fat"] as const
                          ).map((key) => (
                            <label className="field" key={key}>
                              <span>
                                {item.name} {key} for pictured amount
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={key === "calories" ? 10000 : 1000}
                                value={item[key] || ""}
                                onChange={(e) => {
                                  const value = Number(e.target.value);
                                  if (
                                    value >= 0 &&
                                    value <= (key === "calories" ? 10000 : 1000)
                                  )
                                    setItems(
                                      items.map((x, i) =>
                                        i === index
                                          ? { ...x, [key]: value }
                                          : x,
                                      ),
                                    );
                                }}
                              />
                            </label>
                          ))}
                        </div>
                      </details>
                    )}
                  </section>
                ))}
              </div>
              <details className="add-dish">
                <summary>
                  <Plus size={16} /> Add a food from your library
                </summary>
                <label className="field">
                  <span>Food on this plate</span>
                  <select
                    value={ingredient}
                    onChange={(e) => setIngredient(e.target.value)}
                  >
                    {s.foods
                      .filter((f) => f.nutritionKnown !== false)
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} · {f.serving}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>How many servings are pictured?</span>
                  <input
                    type="number"
                    min="0.25"
                    max={20}
                    step="0.25"
                    value={visibleServings || ""}
                    onChange={(e) => setVisibleServings(Number(e.target.value))}
                  />
                </label>
                <button
                  className="button wide"
                  disabled={
                    items.length >= 20 ||
                    visibleServings <= 0 ||
                    visibleServings > 20
                  }
                  onClick={() => {
                    const f = s.foods.find((f) => f.id === ingredient);
                    if (f)
                      setItems([
                        ...items,
                        {
                          name: f.name,
                          serving: `${visibleServings} × ${f.serving}`,
                          calories: f.calories * visibleServings,
                          protein: f.protein * visibleServings,
                          carbs: f.carbs * visibleServings,
                          fat: f.fat * visibleServings,
                          eatenPercent: 100,
                          nutritionKnown: true,
                        },
                      ]);
                    setVisibleServings(1);
                  }}
                >
                  Add this food
                </button>
              </details>
              {!items.length && (
                <p className="help">
                  Identify foods with GPT or add them from your library, then
                  set each share separately.
                </p>
              )}
            </>
          )}
          <div className="inline-fields">
            <label className="field">
              <span>Meal</span>
              <select value={slot} onChange={(e) => setSlot(e.target.value)}>
                {["Breakfast", "Lunch", "Dinner", "Snack"].map((slot) => (
                  <option key={slot}>{slot}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Place (optional)</span>
              <input
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                maxLength={150}
                placeholder="Restaurant or café"
              />
            </label>
          </div>
          <label className="field">
            <span>Notes and uncertainty</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={800}
              placeholder="Extra sauce, shared dishes, things the photo missed…"
            />
          </label>
          {estimated && !recognition && (
            <label className="review-checkbox">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              <span>
                I reviewed the estimate and portions. They may be inaccurate.
              </span>
            </label>
          )}
          {recognition && !recognitionConfirmed && (
            <p className="recognition-caution">
              Confirm each food you ate, or set its eaten amount to None, before
              saving.
            </p>
          )}
          <div className="photo-save-bar">
            <div>
              <span>
                {mode === "items"
                  ? "Your selected foods"
                  : `Your ${percent}% portion`}
              </span>
              <strong>
                {(mode === "whole" && !nutrition) ||
                (mode === "items" &&
                  items.some(
                    (item) => item.eatenPercent > 0 && !item.nutritionKnown,
                  ))
                  ? "Nutrition not estimated"
                  : `${Math.round(total.calories)} kcal`}
              </strong>
              <small>
                {mode === "items" || nutrition
                  ? `${Math.round(total.protein)} g protein · ${Math.round(total.carbs)} g carbs · ${Math.round(total.fat)} g fat`
                  : "Unknown nutrition stays out of daily totals."}
              </small>
            </div>
            <button
              className="button primary"
              disabled={
                !photo ||
                !name.trim() ||
                !!busy ||
                (estimated && !canAcceptEstimate) ||
                (mode === "items" && !items.some((i) => i.eatenPercent > 0))
              }
              onClick={() => void save()}
            >
              {busy === "save" ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Check size={18} />
              )}{" "}
              {mode === "items"
                ? "Save selected portions"
                : `Save photo meal · ${percent}% eaten`}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {busy === "photo" && (
        <p className="help" role="status">
          Opening your photo…
        </p>
      )}
    </fieldset>
  );
}
