import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create my space" }).click();
});
test("recovers an unsaved photo and portion after closing the screen", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles("tests/fixtures/plate.svg");
  await page
    .getByRole("textbox", { name: "What is on your plate?" })
    .fill("Lunch to finish later");
  await page.getByRole("button", { name: "½ plate", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page.getByRole("button", { name: "Resume meal draft" }).click();
  await expect(
    page.getByRole("textbox", { name: "What is on your plate?" }),
  ).toHaveValue("Lunch to finish later");
  await expect(
    page.getByRole("slider", { name: "Percentage of plate eaten" }),
  ).toHaveValue("50");
  await expect(page.getByAltText("Plate to log")).toBeVisible();
  await page
    .getByRole("button", { name: "Save photo meal · 50% eaten" })
    .click();
  await expect(page.locator(".timeline-row")).toContainText(
    "Lunch to finish later",
  );
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume meal draft" }),
  ).toHaveCount(0);
});
test("warns about a very dark image without uploading it", async ({ page }) => {
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  const dark =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="black"/></svg>';
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles({
      name: "dark.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from(dark),
    });
  await expect(page.getByText("Photo quality needs a check")).toBeVisible();
  await page
    .getByRole("button", { name: "Connect ChatGPT to identify foods" })
    .click();
  await expect(page.getByRole("alert")).toContainText("photo-quality");
  await expect(
    page.getByRole("heading", { name: "Connect your AI account" }),
  ).toHaveCount(0);
});
test("rotates a selected image and keeps meal details", async ({ page }) => {
  await page.getByRole("button", { name: "Photo meal", exact: true }).click();
  await page
    .locator('input[type=file][accept="image/*"]')
    .setInputFiles("tests/fixtures/plate.svg");
  await page
    .getByRole("textbox", { name: "What is on your plate?" })
    .fill("My meal");
  await expect(page.getByAltText("Plate to log")).toHaveJSProperty(
    "naturalWidth",
    600,
  );
  await page.getByRole("button", { name: "Rotate photo" }).click();
  await expect(page.getByAltText("Plate to log")).toHaveJSProperty(
    "naturalWidth",
    420,
  );
  await expect(
    page.getByRole("textbox", { name: "What is on your plate?" }),
  ).toHaveValue("My meal");
});
