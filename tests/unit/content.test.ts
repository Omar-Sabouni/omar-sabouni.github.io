import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");

const expectedProjects = [
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

type Project = (typeof expectedProjects)[number];

const featuredProjects = [
  "inspect-flow",
  "robot-replay-studio",
  "telemetry-link",
  "curvature-lab",
] as const satisfies readonly Project[];

const compactProjects = expectedProjects.slice(featuredProjects.length);

const expectedMedia = {
  "bayes-visualizer": "bayes-visualizer.png",
  "curvature-lab": "curvature-lab.png",
  fleetwatch: "fleetwatch.png",
  "inspect-flow": "inspect-flow.png",
  kalman_state_estimation: "kalman-state-estimation.png",
  "ledger-lite": "ledger-lite.png",
  megaminx: "megaminx.png",
  "numbrix-visualizer": "numbrix-visualizer.png",
  productpulse: "productpulse.png",
  "robot-replay-studio": "robot-replay-studio.png",
  "telemetry-link": "telemetry-link.png",
} as const satisfies Partial<Record<Project, string>>;

function projectHtml(project: string): string {
  return readFileSync(resolve(root, "projects", project, "index.html"), "utf8");
}

function hrefs(html: string): string[] {
  return Array.from(
    html.matchAll(/<a\b[^>]*\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi),
    (match) => match[1] ?? match[2] ?? match[3],
  );
}

function pngDimensions(path: string): [number, number] {
  const buffer = readFileSync(path);
  expect(buffer.subarray(1, 4).toString("ascii")).toBe("PNG");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
}

describe("project inventory", () => {
  it("lists the exact twelve projects once in the intended reading order", () => {
    const rendered = Array.from(
      indexHtml.matchAll(/<li data-project="([^"]+)">/g),
      (match) => match[1],
    );
    expect(rendered).toEqual(expectedProjects);
    expect(new Set(rendered).size).toBe(12);
  });

  it("links every project to one independent static project record", () => {
    const directories = readdirSync(resolve(root, "projects"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(directories).toEqual([...expectedProjects].sort());

    const rootLinks = hrefs(indexHtml);

    for (const project of expectedProjects) {
      const expectedCount = featuredProjects.includes(
        project as (typeof featuredProjects)[number],
      )
        ? 2
        : 1;
      expect(
        rootLinks.filter((href) => href === `/projects/${project}/`),
        project,
      ).toHaveLength(expectedCount);

      const path = resolve(root, "projects", project, "index.html");
      expect(existsSync(path), project).toBe(true);

      const html = projectHtml(project);
      expect(html.match(/<h1>/g), project).toHaveLength(1);
      expect(html, project).toContain('href="/">← Back to projects</a>');
      expect(html, project).toContain('id="main-content"');

      const expectedLinks = ["#main-content", "/"];
      const media = expectedMedia[project as keyof typeof expectedMedia];
      if (media) expectedLinks.push(`/images/projects/${media}`);
      expect(
        hrefs(html).sort(),
        `${project} must link only to its own artifact and the portfolio root`,
      ).toEqual(expectedLinks.sort());

      for (const href of hrefs(html)) {
        const absolute = new URL(
          href,
          `https://portfolio.invalid/projects/${project}/`,
        );
        const target = decodeURIComponent(
          `${absolute.hostname}${absolute.pathname}${absolute.search}${absolute.hash}`,
        ).toLowerCase();
        const otherProjects = expectedProjects.filter(
          (candidate) => candidate !== project && target.includes(candidate.toLowerCase()),
        );
        expect(
          otherProjects,
          `${project} has a relative or external cross-project link: ${href}`,
        ).toEqual([]);
      }
    }
  });

  it("opens with four uniform project rows followed by eight compact entries", () => {
    const projectList = indexHtml.match(
      /<ol\b[^>]*\bclass="project-list"[^>]*>([\s\S]*?)<\/ol>/i,
    )?.[1] ?? "";
    const compactList = indexHtml.match(
      /<ol\b[^>]*\bclass="compact-project-list"[^>]*>([\s\S]*?)<\/ol>/i,
    )?.[1] ?? "";

    const renderedFeatured = Array.from(
      projectList.matchAll(/<li data-project="([^"]+)">/g),
      (match) => match[1],
    );
    const renderedCompact = Array.from(
      compactList.matchAll(/<li data-project="([^"]+)">/g),
      (match) => match[1],
    );

    expect(renderedFeatured).toEqual(featuredProjects);
    expect(renderedCompact).toEqual(compactProjects);
    expect(projectList.match(/<article\b[^>]*\bclass="project-row"/g)).toHaveLength(4);
    expect(projectList.match(/<a\b[^>]*\bclass="project-preview"/g)).toHaveLength(4);
    expect(projectList.match(/<img\b/g)).toHaveLength(4);
    expect(compactList.match(/class="compact-project-name"/g)).toHaveLength(8);
  });
});

describe("site content", () => {
  it("publishes email contact without résumé or social-profile details", () => {
    expect(hrefs(indexHtml).filter((href) => /\bcv\b|\.pdf(?:$|[?#])/i.test(href))).toEqual([]);
    expect(indexHtml).toContain("mailto:omarasabouni@gmail.com");
    expect(indexHtml).not.toMatch(/github\.com/i);
    expect(indexHtml).not.toMatch(/linkedin\.com/i);
    expect(indexHtml).not.toMatch(/\d\.\d{2}\s*\/\s*4\.00/i);
    expect(indexHtml).not.toMatch(/class="identity-facts"/i);
  });

  it("keeps the root focused on projects and email contact", () => {
    expect(indexHtml).toMatch(/<h2[^>]*>Projects<\/h2>/i);
    expect(indexHtml).not.toMatch(/id="about"|<h2[^>]*>About<\/h2>/i);
    expect(indexHtml).not.toMatch(/<h3[^>]*>Experience<\/h3>/i);
    expect(indexHtml).not.toMatch(/Education and recognition|Technical focus/i);
    expect(indexHtml).toMatch(/<nav\b[^>]*aria-label="[^"]+"/i);
    expect(indexHtml).toContain('href="mailto:omarasabouni@gmail.com"');
    expect(indexHtml).not.toMatch(/github|linkedin/i);
    expect(indexHtml).not.toMatch(/Omar-Sabouni-CV\.pdf|>CV\.pdf</);
  });

  it("publishes four project previews with accurate dimensions and loading attributes", () => {
    const projectList = indexHtml.match(
      /<ol\b[^>]*\bclass="project-list"[^>]*>([\s\S]*?)<\/ol>/i,
    )?.[1] ?? "";
    const images = Array.from(
      projectList.matchAll(
        /<img\s+[^>]*src="\/images\/projects\/([^"]+)"[^>]*>/g,
      ),
      (match) => ({ source: match[1], tag: match[0] }),
    );

    expect(images.map(({ source }) => source)).toEqual(
      featuredProjects.map((project) => expectedMedia[project]),
    );
    expect(images).toHaveLength(4);

    for (const [index, { source, tag }] of images.entries()) {
      const path = resolve(root, "public/images/projects", source);
      expect(existsSync(path), source).toBe(true);
      expect(tag, source).toMatch(/alt="[^"]{18,}"/);
      expect(tag, source).toContain('decoding="async"');

      const [width, height] = pngDimensions(path);
      expect(tag, source).toContain(`width="${width}"`);
      expect(tag, source).toContain(`height="${height}"`);

      if (index === 0) {
        expect(tag).toContain('fetchpriority="high"');
        expect(tag).not.toContain('loading="lazy"');
      } else {
        expect(tag).toContain('loading="lazy"');
        expect(tag).not.toContain('fetchpriority="high"');
      }
    }
  });

  it("publishes the expected project media with accurate dimensions", () => {
    const images: Array<{ project: string; tag: string; source: string }> = [];

    for (const project of expectedProjects) {
      const html = projectHtml(project);
      for (const match of html.matchAll(
        /<img\s+[^>]*src="\/images\/projects\/([^"]+)"[^>]*>/g,
      )) {
        images.push({ project, source: match[1], tag: match[0] });
      }
    }

    expect(images).toHaveLength(11);
    expect(images.some(({ project }) => project === "edgebench")).toBe(false);
    const publishedFiles = readdirSync(resolve(root, "public/images/projects"))
      .filter((file) => file.endsWith(".png"))
      .sort();
    expect(publishedFiles).toEqual(images.map(({ source }) => source).sort());

    for (const { project, source, tag } of images) {
      const path = resolve(root, "public/images/projects", source);
      expect(existsSync(path), `${project}: ${source}`).toBe(true);
      expect(tag, project).toMatch(/alt="[^"]{18,}"/);
      expect(tag, project).toMatch(/width="\d+"/);
      expect(tag, project).toMatch(/height="\d+"/);

      if (extname(source) === ".png") {
        const [width, height] = pngDimensions(path);
        expect(tag, project).toContain(`width="${width}"`);
        expect(tag, project).toContain(`height="${height}"`);
      }
    }
  });

  it("publishes the expected project-specific artifacts", () => {
    const edgebench = projectHtml("edgebench");
    const ledger = projectHtml("ledger-lite");
    const telemetry = projectHtml("telemetry-link");
    const productpulse = projectHtml("productpulse");

    expect(edgebench).toContain("Run InferQual");
    expect(edgebench).toContain("ONNX Runtime INT8");
    expect(edgebench).toContain("<table");
    expect(edgebench).not.toContain("<img");

    expect(ledger).toContain("#reconciliation");
    expect(ledger).toContain("posting rows");
    expect(ledger).toMatch(/idempotency/i);

    expect(telemetry).toContain("JSON Lines is the interface");
    expect(telemetry).toContain('"kind":"health"');

    expect(productpulse).toContain("Streamlit");
    expect(productpulse).toContain("Daily activity");
  });

  it("uses only the expected public links", () => {
    const allHtml = [
      indexHtml,
      ...expectedProjects.map((project) => projectHtml(project)),
    ].join("\n");

    const externalUrls = Array.from(
      allHtml.matchAll(/https?:\/\/[^\s"'<>]+/gi),
      (match) => match[0],
    );
    const publicExternalUrls = externalUrls.filter((url) => {
      const hostname = new URL(url).hostname;
      return !["localhost", "127.0.0.1", "::1"].includes(hostname);
    });
    expect([...new Set(publicExternalUrls)]).toEqual([]);

    const expectedUniqueRootLinks = [
      "#main-content",
      "mailto:omarasabouni@gmail.com",
      ...expectedProjects.map((project) => `/projects/${project}/`),
    ];
    const rootLinks = hrefs(indexHtml);
    expect([...new Set(rootLinks)].sort()).toEqual(
      [...expectedUniqueRootLinks].sort(),
    );

    for (const project of expectedProjects) {
      const projectHref = `/projects/${project}/`;
      const expectedCount = featuredProjects.includes(
        project as (typeof featuredProjects)[number],
      )
        ? 2
        : 1;
      expect(rootLinks.filter((href) => href === projectHref), project).toHaveLength(
        expectedCount,
      );
    }

    const expectedRootLinkOrder = [
      "#main-content",
      "mailto:omarasabouni@gmail.com",
      ...featuredProjects.flatMap((project) => [
        `/projects/${project}/`,
        `/projects/${project}/`,
      ]),
      ...compactProjects.map((project) => `/projects/${project}/`),
    ];
    expect(rootLinks).toEqual(expectedRootLinkOrder);

    expect(allHtml).not.toMatch(
      /lorem ipsum|coming soon|placeholder|project alpha/i,
    );
  });
});
