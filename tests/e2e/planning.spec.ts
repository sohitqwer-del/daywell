import { test, expect } from "@playwright/test";
import { createState, dayKey, startSession } from "../../src/domain";
import fs from "node:fs";
test("Indian food search understands household aliases", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.getByRole("textbox", { name: "Search foods" }).fill("chai");
  await expect(
    page.locator(".food-option").filter({ hasText: "Milk tea with sugar" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search foods" }).fill("rajma");
  await expect(
    page.locator(".food-option").filter({ hasText: "Rajma curry" }),
  ).toBeVisible();
});
test("per-food portions save independently and connect dialog preserves the photo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles("tests/fixtures/plate.svg");
  await page
    .getByRole("textbox", { name: "What is on your plate?" })
    .fill("Rice and dal");
  await page
    .getByRole("button", { name: "Connect ChatGPT to identify foods" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Connect your AI account" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByAltText("Plate to log")).toBeVisible();
  await page
    .getByRole("button", { name: "Different amounts per food" })
    .click();
  await page.getByText("Add a food from your library", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Food on this plate" })
    .selectOption("rice");
  await page.getByRole("button", { name: "Add this food" }).click();
  await page
    .getByRole("combobox", { name: "Food on this plate" })
    .selectOption("dal");
  await page.getByRole("button", { name: "Add this food" }).click();
  await page
    .getByRole("button", { name: "Eat 50% of Cooked white rice", exact: true })
    .click();
  await page.getByRole("button", { name: "Save selected portions" }).click();
  await expect(page.locator(".timeline-row")).toContainText(
    "custom food portions",
  );
  await page
    .getByRole("button", { name: "View meal photo", exact: true })
    .click();
  await expect(
    page
      .locator(".photo-item-summary")
      .filter({ hasText: "Cooked white rice" }),
  ).toContainText("50% eaten");
  await expect(
    page.locator(".photo-item-summary").filter({ hasText: "Cooked lentils" }),
  ).toContainText("100% eaten");
});
test("diet table computes portions and a shorter workout keeps completed sets", async ({
  page,
}) => {
  const s = createState();
  s.onboarded = true;
  s.dietPlan = {
    id: "test-plan",
    title: "Test meal plan",
    date: dayKey(),
    source: "manual",
    notes: "A test fixture, not an AI response.",
    rows: [
      { slot: "Lunch", foodId: "roti", servings: 2, note: "" },
      { slot: "Lunch", foodId: "dal", servings: 1, note: "" },
    ],
  };
  const catalog = JSON.parse(
    fs.readFileSync("public/data/exercises.json", "utf8"),
  );
  s.active = startSession(s.routines[0], catalog);
  s.active.exercises[0].sets[0].done = true;
  s.active.exercises[0].sets[0].weight = 40;
  await page.addInitScript((state) => {
    if (!localStorage.getItem("forma-state"))
      localStorage.setItem("forma-state", JSON.stringify(state));
  }, s);
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await nav.getByRole("button", { name: "Plan", exact: true }).click();
  await expect(page.getByRole("table").first()).toContainText(
    "Whole-wheat roti",
  );
  await expect(page.locator(".plan-summary")).toContainText("450");
  await page
    .getByRole("button", { name: "Increase portion for row 1" })
    .click();
  await expect(page.locator(".plan-summary")).toContainText("478");
  await page.getByRole("tab", { name: "Today’s workout" }).click();
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page
    .getByRole("button", { name: /Shorten my current workout/ })
    .click();
  await page.getByRole("button", { name: "Apply to this session" }).click();
  await expect(
    page.getByRole("button", {
      name: "Uncheck Barbell Full Squat set 1",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("spinbutton", {
      name: "Barbell Full Squat set 1 weight",
      exact: true,
    }),
  ).toHaveValue("40");
});
