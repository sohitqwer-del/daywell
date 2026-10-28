import { test, expect } from "@playwright/test";
import fs from "node:fs";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create my space" }).click();
});
test("photo meal records half a plate, edits the portion and exports the photo", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles("tests/fixtures/plate.svg");
  await expect(page.getByAltText("Plate to log")).toBeVisible();
  await page
    .getByRole("textbox", { name: "What is on your plate?" })
    .fill("Restaurant thali");
  await page.getByRole("button", { name: "½ plate", exact: true }).click();
  await page
    .getByRole("checkbox", { name: /Add nutrition for the whole plate/ })
    .check();
  await page
    .getByRole("spinbutton", { name: "Whole plate kcal", exact: true })
    .fill("800");
  await page
    .getByRole("spinbutton", { name: "Protein (g)", exact: true })
    .fill("40");
  await expect(page.locator(".photo-save-bar")).toContainText("400 kcal");
  await page
    .getByRole("button", { name: "Save photo meal · 50% eaten" })
    .click();
  await expect(page.locator(".timeline-row")).toContainText("50% of plate");
  await page.reload();
  await page
    .getByRole("button", { name: "View meal photo", exact: true })
    .click();
  await expect(page.locator(".photo-detail")).toContainText("400 kcal");
  await page.getByRole("button", { name: "Edit portion & nutrition" }).click();
  await expect(page.getByAltText("Plate to log")).toBeVisible();
  await page.getByRole("button", { name: "¾ plate", exact: true }).click();
  await page
    .getByRole("button", { name: "Save photo meal · 75% eaten" })
    .click();
  await expect(page.locator(".timeline-row")).toContainText("600 kcal");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const file = await promise;
  const backup = JSON.parse(fs.readFileSync((await file.path())!, "utf8"));
  expect(backup.meals).toHaveLength(1);
  expect(backup.meals[0].quantity).toBe(0.75);
  expect(Object.keys(backup.media)).toHaveLength(1);
  expect(Object.values(backup.media)[0]).toMatch(/^data:image\/jpeg;base64,/);
  await page
    .getByRole("button", { name: "Delete all local data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete all local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Create my space" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .locator('input[type=file][accept="application/json,.json"]')
    .setInputFiles({
      name: "photos-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page.getByRole("button", { name: "Replace with backup" }).click();
  await page
    .getByRole("button", { name: "View meal photo", exact: true })
    .click();
  await expect(page.locator(".photo-detail>img")).toHaveJSProperty(
    "naturalWidth",
    600,
  );
});
test("photo-only meals stay explicitly unknown", async ({ page }) => {
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles("tests/fixtures/plate.svg");
  await page
    .getByRole("textbox", { name: "What is on your plate?" })
    .fill("Shared dinner");
  await page.getByRole("button", { name: "¼ plate", exact: true }).click();
  await page
    .getByRole("button", { name: "Save photo meal · 25% eaten" })
    .click();
  await expect(page.locator(".daywell-hero")).toContainText(
    "1 photo meal not estimated",
  );
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Food", exact: true })
    .click();
  await expect(page.getByText("Not estimated", { exact: true })).toBeVisible();
  await expect(
    page.getByText("25% of photographed plate", { exact: true }),
  ).toBeVisible();
});
test("recipes, favourites, and weekly training persist", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Mobile navigation" });
  await nav.getByRole("button", { name: "Food", exact: true }).click();
  await page
    .getByRole("button", { name: "Create recipe", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Recipe name", exact: true })
    .fill("Two-serving dal");
  await page
    .getByRole("combobox", { name: "Ingredient", exact: true })
    .selectOption("dal");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Two-serving dal" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to lunch" }).click();
  await expect(
    page.getByText("Two-serving dal", { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByRole("button", { name: "Plan Monday" }).click();
  await page
    .getByRole("combobox", { name: "Monday routine" })
    .selectOption("full");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  await nav.getByRole("button", { name: "Train", exact: true }).click();
  await expect(page.getByRole("button", { name: "Plan Monday" })).toContainText(
    "Full body",
  );
});
