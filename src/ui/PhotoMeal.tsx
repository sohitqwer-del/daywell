import { useEffect, useRef, useState } from "react";
import {
  Camera,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  Check,
  Utensils,
  AlertCircle,
} from "lucide-react";
import { isNative, Native } from "../platform";
import {
  preparePhoto,
  takePhoto,
  savePhoto,
  photoUrl,
  readPhoto,
} from "../photos";
import { dayKey, uid, type State, type Meal } from "../domain";
import { z } from "zod";
export { parseEstimate, plateEstimateSchema } from "../photoModel";
export { default } from "./PhotoMealV2";
export function MealPhoto({
  photo,
  onOpen,
}: {
  photo: NonNullable<Meal["photo"]>;
  onOpen?: () => void;
}) {
  return (
    <button
      className="meal-photo-thumb"
      onClick={onOpen}
      aria-label="View meal photo"
    >
      <img src={photo.thumbnail} alt="Saved plate" />
      <span>{photo.items?.length ? "Custom" : photo.eatenPercent + "%"}</span>
    </button>
  );
}
export function PhotoViewer({ meal }: { meal: Meal }) {
  const [src, setSrc] = useState(meal.photo?.thumbnail),
    [missing, setMissing] = useState(false);
  useEffect(() => {
    if (meal.photo)
      photoUrl(meal.photo.id)
        .then(setSrc)
        .catch(() => setMissing(true));
  }, [meal.photo?.id]);
  return (
    <div className="photo-detail">
      <img
        src={src}
        alt={meal.food.name}
        onError={() => {
          if (src !== meal.photo?.thumbnail) setSrc(meal.photo?.thumbnail);
          setMissing(true);
        }}
      />
      <div className="photo-detail-title">
        <h3>{meal.food.name}</h3>
        <span>
          {meal.photo?.items?.length
            ? "Custom food portions"
            : Math.round(meal.quantity * 100) + "% eaten"}
        </span>
      </div>
      <p>{meal.photo?.plateNote || meal.note}</p>
      <p className="help">
        {meal.food.nutritionKnown === false
          ? "Nutrition has not been estimated. This meal is recorded without adding zero calories to known totals."
          : `${Math.round(meal.food.calories * meal.quantity)} kcal · ${Math.round(meal.food.protein * meal.quantity)} g protein for your portion.`}
      </p>
      {meal.photo?.items?.map((item, index) => (
        <div className="photo-item-summary" key={index}>
          <span>
            {item.name}
            <small>{item.serving}</small>
          </span>
          <b>{item.eatenPercent}% eaten</b>
        </div>
      ))}
      {meal.photo?.estimated && (
        <p className="help">
          Photo-based estimate, reviewed when saved. Ingredients and portion
          sizes may differ.
        </p>
      )}
      {missing && (
        <p className="help">Original unavailable; showing the saved preview.</p>
      )}
    </div>
  );
}
