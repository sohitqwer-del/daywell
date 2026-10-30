// @vitest-environment jsdom
import React, { useState } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import RecognitionReview from "../src/ui/RecognitionReview";
import { createState } from "../src/domain";
import {
  parseRecognition,
  suggestRecognizedFoods,
  confirmRecognizedFood,
} from "../src/recognition";
import LiveCamera from "../src/ui/LiveCamera";
import { CameraPreview } from "@capacitor-community/camera-preview";
vi.mock("@capacitor-community/camera-preview", () => ({
  CameraPreview: {
    start: vi.fn(),
    stop: vi.fn(),
    getSupportedFlashModes: vi.fn(),
    flip: vi.fn(),
    capture: vi.fn(),
    setFlashMode: vi.fn(),
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
});
const result = parseRecognition(
  JSON.stringify({
    isFood: true,
    quality: "clear",
    mealName: "Rice",
    notes: "Review amount",
    question: "",
    dishes: [
      {
        name: "Rice",
        visibleAmount: "1 cup",
        confidence: "low",
        alternatives: ["Curd rice"],
        catalogFoodId: "rice",
      },
    ],
  }),
);
function Review() {
  const s = createState();
  const [items, setItems] = useState(suggestRecognizedFoods(result, s));
  return (
    <RecognitionReview
      result={result}
      items={items}
      state={s}
      onConfirm={(index, id, servings) =>
        setItems(
          items.map((item, i) =>
            i === index
              ? confirmRecognizedFood(
                  item,
                  s.foods.find((f) => f.id === id) || null,
                  servings,
                )
              : item,
          ),
        )
      }
      onLabel={(index, name) =>
        setItems(
          items.map((item, i) =>
            i === index
              ? { ...item, name, confirmed: false, nutritionKnown: false }
              : item,
          ),
        )
      }
      onClarify={() => {}}
    />
  );
}
describe("recognition review and camera recovery", () => {
  it("requires a human-confirmed library choice and amount", () => {
    render(<Review />);
    expect(screen.getByText("Uncertain")).toBeTruthy();
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Pictured servings for dish 1" }),
      { target: { value: "2" } },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirm this food & pictured amount",
      }),
    );
    expect(screen.getByText("Confirmed by you")).toBeTruthy();
    expect(screen.getByText(/2 × 1 cup/)).toBeTruthy();
  });
  it("closes immediately even when camera start/stop are unresolved", async () => {
    vi.mocked(CameraPreview.start).mockImplementation(
      () => new Promise(() => {}),
    );
    vi.mocked(CameraPreview.stop).mockImplementation(
      () => new Promise(() => {}),
    );
    const cancel = vi.fn();
    render(
      <LiveCamera onPhoto={() => {}} onCancel={cancel} onFallback={() => {}} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close camera" }));
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("does not report start failure merely because flash modes are unavailable", async () => {
    vi.mocked(CameraPreview.start).mockResolvedValue(undefined);
    vi.mocked(CameraPreview.stop).mockResolvedValue(undefined);
    vi.mocked(CameraPreview.getSupportedFlashModes).mockRejectedValue(
      Error("Unsupported"),
    );
    render(
      <LiveCamera
        onPhoto={() => {}}
        onCancel={() => {}}
        onFallback={() => {}}
      />,
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("button", {
            name: "Capture meal photo",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false),
    );
    expect(screen.queryByText(/Camera could not start/)).toBeNull();
  });
});
