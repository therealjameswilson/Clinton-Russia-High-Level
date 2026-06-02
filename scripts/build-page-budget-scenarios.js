const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
}

function htmlCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function htmlLink(label, url) {
  const href = siteUrl(url);
  if (!href) return htmlCell(label);
  return `<a href="${htmlCell(href)}">${htmlCell(label)}</a>`;
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function tierRank(tier) {
  if (tier === "Tier 1 - likely core") return 1;
  if (tier === "Tier 2 - strong candidate") return 2;
  if (tier === "Tier 3 - supporting candidate") return 3;
  if (tier === "Tier 4 - concise/confirmatory") return 4;
  return 99;
}

function cleanIssue(issue) {
  return String(issue || "").replace(/\s+\(\d+\)$/, "");
}

function estimateHardGapPages(row, medians) {
  return Math.round(medians.byType[row.type] || medians.overall || 0);
}

function buildMedianStats(rows) {
  const counted = rows.filter((row) => Number.isFinite(Number(row.actualConversationPages)));
  const byType = {};
  for (const type of [...new Set(counted.map((row) => row.type))]) {
    byType[type] = median(counted.filter((row) => row.type === type).map((row) => Number(row.actualConversationPages)));
  }
  return {
    overall: median(counted.map((row) => Number(row.actualConversationPages))),
    byType
  };
}

function scenarioDefinitions(rows) {
  return [
    {
      id: "tier-1-likely-core",
      label: "Tier 1 likely core",
      description: "Smallest high-confidence first pass: documents with the highest selection score and issue density.",
      include: (row) => row.selectionTier === "Tier 1 - likely core"
    },
    {
      id: "tier-1-2-strong-core",
      label: "Tier 1-2 strong core",
      description: "Likely core plus strong candidates; useful as a practical first draft of the Clinton-Yeltsin document spine.",
      include: (row) => tierRank(row.selectionTier) <= 2
    },
    {
      id: "heavy-annotation-review",
      label: "Heavy annotation review set",
      description: "All counted documents likely to require substantial annotation, regardless of selection tier.",
      include: (row) => row.annotationTreatment === "Heavy annotation review"
    },
    {
      id: "tier-1-3-broad-draft",
      label: "Tier 1-3 broad draft",
      description: "Broad working draft for thematic balancing before later trimming.",
      include: (row) => tierRank(row.selectionTier) <= 3
    },
    {
      id: "all-counted-documents",
      label: "All counted documents",
      description: "The full current reading packet: every page-counted Clinton-Yeltsin memcon/telcon.",
      include: (row) => row.status === "counted"
    },
    {
      id: "hard-source-gaps-estimate",
      label: "Hard source gaps only",
      description: "The six uncounted contacts. Page totals here are estimates only, based on median pages of counted contacts of the same type.",
      include: (row) => row.status === "pending",
      estimateOnly: true
    }
  ];
}

function issueCoverage(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const issue of row.dominantIssues || []) {
      const label = cleanIssue(issue);
      if (!label) continue;
      const entry = map.get(label) || { issue: label, documents: 0, pages: 0, tier1: 0, tier2: 0 };
      entry.documents += 1;
      entry.pages += Number(row.actualConversationPages || 0);
      if (row.selectionTier === "Tier 1 - likely core") entry.tier1 += 1;
      if (row.selectionTier === "Tier 2 - strong candidate") entry.tier2 += 1;
      map.set(label, entry);
    }
  }
  return [...map.values()]
    .sort((a, b) => b.tier1 - a.tier1 || b.documents - a.documents || b.pages - a.pages || a.issue.localeCompare(b.issue))
    .slice(0, 8);
}

function yearSpread(rows) {
  const map = new Map();
  for (const row of rows) {
    const year = String(row.date || "").slice(0, 4);
    const entry = map.get(year) || { year, documents: 0, actualPages: 0, estimatedPages: 0 };
    entry.documents += 1;
    entry.actualPages += Number(row.actualConversationPages || 0);
    entry.estimatedPages += Number(row.estimatedPages || 0);
    map.set(year, entry);
  }
  return [...map.values()].sort((a, b) => a.year.localeCompare(b.year));
}

function summarizeScenario(definition, rows, medians) {
  const included = rows.filter(definition.include).map((row) => {
    const estimatedPages = row.status === "pending" ? estimateHardGapPages(row, medians) : 0;
    return { ...row, estimatedPages };
  });
  const actualPages = included.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0);
  const estimatedGapPages = included.reduce((sum, row) => sum + Number(row.estimatedPages || 0), 0);
  const tierCounts = included.reduce((acc, row) => {
    acc[row.selectionTier] = (acc[row.selectionTier] || 0) + 1;
    return acc;
  }, {});
  return {
    id: definition.id,
    label: definition.label,
    description: definition.description,
    estimateOnly: Boolean(definition.estimateOnly),
    documentCount: included.length,
    countedDocumentCount: included.filter((row) => row.status === "counted").length,
    pendingDocumentCount: included.filter((row) => row.status === "pending").length,
    actualConversationPages: actualPages,
    estimatedHardGapPages: estimatedGapPages,
    totalActualPlusEstimatedPages: actualPages + estimatedGapPages,
    averageActualPagesPerCountedDocument: included.filter((row) => row.status === "counted").length
      ? Number((actualPages / included.filter((row) => row.status === "counted").length).toFixed(1))
      : "",
    tierCounts,
    issueCoverage: issueCoverage(included),
    yearSpread: yearSpread(included),
    documentIds: included.map((row) => row.id)
  };
}

function buildDocumentRows(rows, scenarios, medians) {
  return rows.map((row) => {
    const memberships = scenarios.filter((scenario) => scenario.documentIds.includes(row.id)).map((scenario) => scenario.label);
    return {
      sequence: row.sequence,
      date: row.date,
      type: row.type,
      status: row.status,
      title: row.title,
      selectionTier: row.selectionTier,
      selectionScore: row.selectionScore,
      actualConversationPages: row.actualConversationPages,
      estimatedHardGapPages: row.status === "pending" ? estimateHardGapPages(row, medians) : "",
      annotationTreatment: row.annotationTreatment,
      dominantIssues: row.dominantIssues || [],
      pddReferences: row.pddReferences,
      publicPapers: row.publicPapers,
      sourceCopyControls: row.sourceCopyControls,
      supportLeads: row.supportLeads,
      scenarioMembership: memberships,
      pdfUrl: row.pdfUrl,
      sourcePacketUrl: row.sourcePacketUrl,
      frusSourceNote: row.frusSourceNote
    };
  });
}

function writeCsv(documentRows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "status",
    "selectionTier",
    "selectionScore",
    "actualConversationPages",
    "estimatedHardGapPages",
    "title",
    "annotationTreatment",
    "dominantIssues",
    "pddReferences",
    "publicPapers",
    "sourceCopyControls",
    "supportLeads",
    "scenarioMembership",
    "pdfUrl",
    "sourcePacketUrl",
    "frusSourceNote"
  ];
  const body = documentRows.map((row) => fields.map((field) => csvCell(row[field])).join(","));
  fs.writeFileSync(path.join(REPORTS_DIR, "page-budget-scenarios.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function compactIssueList(items) {
  if (!items.length) return "No dominant issue tags";
  return items.map((item) => `${htmlCell(item.issue)} (${htmlCell(item.documents)} docs, ${htmlCell(item.pages)} pages)`).join("; ");
}

function buildHtml(report) {
  const summaryRows = [
    ["Counted Docs", report.summary.countedDocuments],
    ["Counted Pages", report.summary.actualConversationPages],
    ["Hard Gaps", report.summary.pendingDocuments],
    ["Estimated Gap Pages", report.summary.estimatedHardGapPages],
    ["Tier 1 Pages", report.summary.tierOnePages],
    ["Tier 1-2 Pages", report.summary.tierOneTwoPages],
    ["Full Counted Pages", report.summary.fullCountedPages],
    ["All Plus Est.", report.summary.countedPlusEstimatedGapPages]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const scenarioRows = report.scenarios
    .map(
      (scenario) => `<tr>
        <td>${htmlCell(scenario.label)}</td>
        <td>${htmlCell(scenario.documentCount)}</td>
        <td>${htmlCell(scenario.countedDocumentCount)}</td>
        <td>${htmlCell(scenario.pendingDocumentCount)}</td>
        <td>${htmlCell(scenario.actualConversationPages)}</td>
        <td>${htmlCell(scenario.estimatedHardGapPages)}</td>
        <td>${htmlCell(scenario.totalActualPlusEstimatedPages)}</td>
        <td>${htmlCell(scenario.averageActualPagesPerCountedDocument)}</td>
        <td>${compactIssueList(scenario.issueCoverage)}</td>
      </tr>`
    )
    .join("\n");

  const documentRows = report.documentRows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.selectionTier)}</td>
        <td>${htmlCell(row.actualConversationPages)}</td>
        <td>${htmlCell(row.estimatedHardGapPages)}</td>
        <td>${row.pdfUrl ? htmlLink(row.title, row.pdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.annotationTreatment)}</td>
        <td>${htmlCell(row.dominantIssues.join("; "))}</td>
        <td>${htmlCell(row.scenarioMembership.join("; "))}</td>
      </tr>`
    )
    .join("\n");

  const yearRows = report.scenarios
    .map(
      (scenario) => `<section class="year-card">
        <h3>${htmlCell(scenario.label)}</h3>
        <p>${htmlCell(scenario.description)}</p>
        <table>
          <thead><tr><th>Year</th><th>Docs</th><th>Actual pages</th><th>Estimated pages</th></tr></thead>
          <tbody>${scenario.yearSpread
            .map(
              (year) => `<tr><td>${htmlCell(year.year)}</td><td>${htmlCell(year.documents)}</td><td>${htmlCell(year.actualPages)}</td><td>${htmlCell(year.estimatedPages)}</td></tr>`
            )
            .join("\n")}</tbody>
        </table>
      </section>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Page Budget Scenarios</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
      h3 { margin: 0 0 6px; font-size: 1.25rem; }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.42rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #fffaf0; border: 1px solid #ead8aa; border-radius: 8px; color: #645233; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(2), td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6), td:nth-child(7), td:nth-child(8) { text-align: right; white-space: nowrap; }
      .year-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .year-card { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .year-card p { margin: 0 0 10px; color: #5b6470; }
      .year-card table { box-shadow: none; }
      @media (max-width: 900px) { dl.summary, .year-grid { grid-template-columns: 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Page Budget Scenarios</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. These nonbinding scenarios translate the Clinton-Yeltsin chronology into document and page budgets for first-pass selection, broad drafting, annotation planning, and hard-gap follow-up.</p>
      <div class="actions">
        <a href="page-budget-scenarios.csv">Download scenario CSV</a>
        <a href="page-budget-scenarios.json">Open scenario JSON</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
      </div>
      <p class="note">Actual page counts include only counted conversation pages. Hard-gap page estimates are clearly separated and are based on median page counts for counted contacts of the same type; they should be replaced once actual released pages are found.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Scenario Page Loads</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Scenario</th><th>Docs</th><th>Counted</th><th>Pending</th><th>Actual pages</th><th>Est. gap pages</th><th>Total if found</th><th>Avg. counted pages</th><th>Issue coverage</th></tr></thead>
          <tbody>${scenarioRows}</tbody>
        </table>
      </div>
      <h2>Year Spread</h2>
      <div class="year-grid">${yearRows}</div>
      <h2>Document Membership</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Tier</th><th>Pages</th><th>Est.</th><th>Document</th><th>Annotation</th><th>Dominant issues</th><th>Scenarios</th></tr></thead>
          <tbody>${documentRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const selection = readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json"));
  const rows = selection.rows;
  const medians = buildMedianStats(rows);
  const scenarios = scenarioDefinitions(rows).map((definition) => summarizeScenario(definition, rows, medians));
  const documentRows = buildDocumentRows(rows, scenarios, medians);
  const tierOne = scenarios.find((scenario) => scenario.id === "tier-1-likely-core");
  const tierOneTwo = scenarios.find((scenario) => scenario.id === "tier-1-2-strong-core");
  const full = scenarios.find((scenario) => scenario.id === "all-counted-documents");
  const gaps = scenarios.find((scenario) => scenario.id === "hard-source-gaps-estimate");
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Page-budget scenarios for direct Clinton-Yeltsin memcons/telcons in the FRUS 1993-2000, Volume XVIII compiler packet.",
    estimateMethod:
      "Pending hard-gap pages are estimated with the median actual conversation pages for counted contacts of the same type. They are not counted pages.",
    medians,
    summary: {
      totalContacts: rows.length,
      countedDocuments: rows.filter((row) => row.status === "counted").length,
      pendingDocuments: rows.filter((row) => row.status === "pending").length,
      actualConversationPages: rows.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
      estimatedHardGapPages: gaps.estimatedHardGapPages,
      countedPlusEstimatedGapPages: full.actualConversationPages + gaps.estimatedHardGapPages,
      tierOnePages: tierOne.actualConversationPages,
      tierOneTwoPages: tierOneTwo.actualConversationPages,
      fullCountedPages: full.actualConversationPages
    },
    scenarios,
    documentRows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "page-budget-scenarios.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.documentRows);
fs.writeFileSync(path.join(REPORTS_DIR, "page-budget-scenarios.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
