import { test, expect } from "@playwright/test";
import fs from "node:fs";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Your first name").fill("Sohit");
  await page.getByRole("button", { name: "Create my space" }).click();
});
test("food, water, offline reload, edit, and undo", async ({ page }) => {
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page
    .locator(".food-option")
    .filter({ hasText: "Whole-wheat roti" })
    .click();
  await page
    .getByRole("spinbutton", { name: "Servings", exact: true })
    .fill("2");
  await page.getByRole("button", { name: "Add to snack" }).click();
  await expect(
    page.getByText("Whole-wheat roti", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Water.*L/ }).click();
  await expect(page.getByRole("status")).toContainText("250 ml");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("Whole-wheat roti", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Food", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Whole-wheat roti", exact: false })
    .first()
    .click();
  await page
    .getByRole("spinbutton", { name: "Servings", exact: true })
    .fill("1.5");
  await page.getByRole("button", { name: "Save entry" }).click();
  await expect(page.getByText("1.5 × 1 medium · 40 g")).toBeVisible();
  await page.getByRole("button", { name: "Remove Whole-wheat roti" }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("Whole-wheat roti", { exact: true }),
  ).toBeVisible();
});
test("workout survives reload and saves completed sets only", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Train", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .first()
    .click();
  await page
    .getByRole("spinbutton", {
      name: "Barbell Full Squat set 1 weight",
      exact: true,
    })
    .fill("40");
  await page
    .getByRole("button", {
      name: "Complete Barbell Full Squat set 1",
      exact: true,
    })
    .click();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Train", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Barbell Full Squat set 1 weight",
      exact: true,
    }),
  ).toHaveValue("40");
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByText("1 sets", { exact: true })).toBeVisible();
});
test("memory, offline coach, and backup export", async ({ page }) => {
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "Coach", exact: true })
    .click();
  await page.getByRole("button", { name: /Memory/ }).click();
  await page
    .getByRole("textbox", { name: "Add a preference" })
    .fill("Vegetarian; train after work");
  await page.getByRole("button", { name: "Remember this" }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "How is my nutrition today?" })
    .click();
  await expect(page.getByText(/missing meals are unknown/)).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/daywell-backup/);
});
test("screens fit phone and desktop without horizontal overflow", async ({
  page,
}) => {
  for (const width of [360, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ["Today", "Food", "Train", "Coach", "Progress"]) {
      const nav =
        width < 640
          ? page.getByRole("navigation", { name: "Mobile navigation" })
          : page.getByRole("navigation", { name: "Main navigation" });
      await nav.getByRole("button", { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Today", exact: true })
    .click();
  await page.screenshot({
    path: "artifacts/daywell-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/daywell-mobile.png",
    fullPage: true,
  });
});
test("custom food, backup restore and invalid-backup protection", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Log food", exact: true }).click();
  await page.getByRole("button", { name: "Custom food", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Food name", exact: true })
    .fill("My dal");
  await page.getByRole("textbox", { name: "One serving" }).fill("1 bowl");
  await page.getByRole("spinbutton", { name: "Calories (kcal)" }).fill("180");
  await page.getByRole("spinbutton", { name: "Protein (g)" }).fill("12");
  await page.getByRole("button", { name: "Save food", exact: true }).click();
  await page.locator(".food-option").filter({ hasText: "My dal" }).click();
  await page.getByRole("button", { name: "Add to snack" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dp = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const download = await dp;
  const path = await download.path();
  const backup = JSON.parse(fs.readFileSync(path!, "utf8"));
  expect(backup.meals[0].food.name).toBe("My dal");
  expect(backup).not.toHaveProperty("apiKey");
  backup.profile.name = "Restored";
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "Replace with backup" }).click();
  await expect(page.locator(".page-intro h1")).toContainText("Restored");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.locator(".page-intro h1")).toContainText("Restored");
});
