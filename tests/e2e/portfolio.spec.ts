import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const projects = [
  "inspect-flow",
  "robot-replay-studio",
  "telemetry-link",
  "curvature-lab",
  "megaminx",
  "ledger-lite",
  "bayes-visualizer",
  "edgebench",
  "fleetwatch",
  "kalman_state_estimation",
  "numbrix-visualizer",
  "productpulse",
] as const;

const featuredProjects = [
  "inspect-flow",
  "robot-replay-studio",
  "telemetry-link",
  "curvature-lab",
] as const;

test("the root opens with four project rows and lists all twelve projects once", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Omar Sabouni");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Omar Sabouni");
  await expect(
    page.getByRole("heading", { name: "Projects", level: 2 }),
  ).toBeVisible();
  await expect(page.locator("#projects.project-catalog")).toHaveCount(1);
  await expect(page.locator(".project-list .project-row")).toHaveCount(4);
  await expect(page.locator(".project-list .project-preview img")).toHaveCount(4);
  await expect(page.locator(".compact-project-list li[data-project]")).toHaveCount(8);
  await expect(page.locator("main img")).toHaveCount(4);
  await expect(page.locator("li[data-project]")).toHaveCount(12);

  const featured = await page
    .locator(".project-list .project-row h3 a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(featured).toEqual(
    featuredProjects.map((project) => `/projects/${project}/`),
  );

  const previews = await page
    .locator(".project-list .project-preview")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(previews).toEqual(featured);

  const rendered = await page.locator("li[data-project]").evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-project")),
  );
  expect(rendered).toEqual(projects);
  expect(new Set(rendered).size).toBe(12);

  for (const project of projects) {
    const expectedCount = featuredProjects.includes(
      project as (typeof featuredProjects)[number],
    )
      ? 2
      : 1;
    await expect(
      page.locator(`a[href="/projects/${project}/"]`),
    ).toHaveCount(expectedCount);
  }
});

test("the root and every project record load without page overflow", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);

    for (const path of [
      "/",
      ...projects.map((project) => `/projects/${project}/`),
    ]) {
      const response = await page.goto(path);
      expect(response?.ok(), `${path} at ${viewport.width}px`).toBe(true);
      await expect(page.locator("h1")).toHaveCount(1);
      if (path !== "/") {
        await expect(
          page.getByRole("link", { name: "Back to projects" }),
        ).toBeVisible();
      }

      const metrics = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        page: document.documentElement.scrollWidth,
      }));
      expect(metrics.page, `${path} at ${viewport.width}px`).toBeLessThanOrEqual(
        metrics.viewport,
      );
    }
  }
});

test("homepage previews and project images decode and declare their real dimensions", async ({
  page,
}) => {
  await page.goto("/");
  const previewImages = page.locator(".project-preview img");
  await expect(previewImages).toHaveCount(4);

  for (const image of await previewImages.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    const dimensions = await image.evaluate((element: HTMLImageElement) => ({
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
      declaredWidth: Number(element.getAttribute("width")),
      declaredHeight: Number(element.getAttribute("height")),
      alt: element.alt,
    }));
    expect(dimensions.naturalWidth, "homepage preview").toBeGreaterThan(0);
    expect(dimensions.naturalHeight, "homepage preview").toBeGreaterThan(0);
    expect(dimensions.declaredWidth, "homepage preview").toBe(
      dimensions.naturalWidth,
    );
    expect(dimensions.declaredHeight, "homepage preview").toBe(
      dimensions.naturalHeight,
    );
    expect(dimensions.alt.length, "homepage preview").toBeGreaterThan(18);
  }

  let detailImageCount = 0;

  for (const project of projects) {
    await page.goto(`/projects/${project}/`);
    const images = page.locator("main img");
    detailImageCount += await images.count();

    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded();
      const dimensions = await image.evaluate((element: HTMLImageElement) => ({
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        declaredWidth: Number(element.getAttribute("width")),
        declaredHeight: Number(element.getAttribute("height")),
        alt: element.alt,
      }));
      expect(dimensions.naturalWidth, project).toBeGreaterThan(0);
      expect(dimensions.naturalHeight, project).toBeGreaterThan(0);
      expect(dimensions.declaredWidth, project).toBe(dimensions.naturalWidth);
      expect(dimensions.declaredHeight, project).toBe(dimensions.naturalHeight);
      expect(dimensions.alt.length, project).toBeGreaterThan(18);
    }
  }

  expect(detailImageCount).toBe(11);
});

test("project records are reachable and return to the directory", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "InferQual", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/edgebench\/$/);
  await expect(page.getByLabel("Run InferQual")).toContainText(
    "inferqual run",
  );
  await page.getByRole("link", { name: "Back to projects" }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("link", { name: "Curvature Lab", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Curvature Lab");
  await expect(page.locator("main img")).toHaveCount(1);
});

test("the directory and every project record reflow at 320px and 200% text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });

  for (const path of ["/", ...projects.map((project) => `/projects/${project}/`)]) {
    await page.goto(path);
    const defaultBodyFont = await page.evaluate(() =>
      Number.parseFloat(getComputedStyle(document.body).fontSize),
    );
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const metrics = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      mainHeight: document.querySelector("main")?.getBoundingClientRect().height ?? 0,
      bodyFont: Number.parseFloat(getComputedStyle(document.body).fontSize),
    }));
    expect(metrics.page, path).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.mainHeight, path).toBeGreaterThan(0);
    expect(metrics.bodyFont, `${path} body text actually scales`).toBeGreaterThanOrEqual(
      defaultBodyFont * 1.9,
    );
    await expect(page.locator("#main-content")).toBeVisible();
  }
});

test("the featured directory reflows at 1024px and 200% text", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });

  const metrics = await page.evaluate(() => {
    const heading = document.querySelector<HTMLElement>(".index-heading");
    const list = document.querySelector<HTMLElement>(".project-list");
    const summaries = Array.from(
      document.querySelectorAll<HTMLElement>(".project-summary"),
    );
    const countStyle = heading
      ? getComputedStyle(heading.querySelector("h2")!, "::after")
      : null;

    return {
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      countFloat: countStyle?.float,
      headingBottom: heading?.getBoundingClientRect().bottom ?? 0,
      listTop: list?.getBoundingClientRect().top ?? 0,
      summaries: summaries.map((summary) => ({
        clientWidth: summary.clientWidth,
        scrollWidth: summary.scrollWidth,
      })),
    };
  });

  expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  expect(metrics.countFloat).toBe("none");
  expect(metrics.listTop).toBeGreaterThanOrEqual(metrics.headingBottom);
  expect(metrics.summaries).toHaveLength(4);
  for (const summary of metrics.summaries) {
    expect(summary.clientWidth).toBeGreaterThan(0);
    expect(summary.scrollWidth).toBeLessThanOrEqual(summary.clientWidth);
  }
});

test("keyboard users can bypass both headers", async ({ page }) => {
  for (const path of ["/", "/projects/ledger-lite/"]) {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  }
});

test("root and every project record have no automatic accessibility violations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of ["/", ...projects.map((project) => `/projects/${project}/`)]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations, path).toEqual([]);
  }
});
