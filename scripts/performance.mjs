import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { mkdirSync, writeFileSync } from "node:fs";
const chrome = await launch({
  chromeFlags: ["--headless=new"],
  ...(process.env.CHROME_PATH ? { chromePath: process.env.CHROME_PATH } : {}),
});
mkdirSync("docs/performance", { recursive: true });
const summary = [];
try {
  for (const [name, path] of [
    ["home", "/"],
    ["browse", "/browse?category=tiles"],
    ["detail", "/listings/demo-tiles-1"],
  ]) {
    const result = await lighthouse(`http://localhost:3001${path}`, {
      port: chrome.port,
      output: ["json", "html"],
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      logLevel: "error",
    });
    if (!result) throw new Error("No Lighthouse result");
    writeFileSync(`docs/performance/${name}.json`, result.report[0]);
    writeFileSync(`docs/performance/${name}.html`, result.report[1]);
    const row = {
      page: name,
      url: result.lhr.finalDisplayedUrl,
      measuredAt: result.lhr.fetchTime,
      scores: Object.fromEntries(
        Object.entries(result.lhr.categories).map(([key, value]) => [
          key,
          Math.round(value.score * 100),
        ]),
      ),
      lcpMs: result.lhr.audits["largest-contentful-paint"].numericValue,
      cls: result.lhr.audits["cumulative-layout-shift"].numericValue,
      settings: result.lhr.configSettings,
    };
    summary.push(row);
    console.log(
      JSON.stringify({
        page: row.page,
        scores: row.scores,
        lcpMs: row.lcpMs,
        cls: row.cls,
      }),
    );
  }
} finally {
  writeFileSync(
    "docs/performance/summary.json",
    JSON.stringify(summary, null, 2),
  );
  await chrome.kill();
}
