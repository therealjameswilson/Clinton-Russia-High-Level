const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REPORTS_DIR = path.join(ROOT, "reports");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

const SCENARIOS = [
  { id: "tier-1-likely-core", label: "Tier 1" },
  { id: "tier-1-2-strong-core", label: "Tier 1-2" },
  { id: "heavy-annotation-review", label: "Heavy annotation" },
  { id: "tier-1-3-broad-draft", label: "Tier 1-3" },
  { id: "all-counted-documents", label: "All counted" }
];

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

function cleanIssue(issue) {
  return String(issue || "").replace(/\s+\(\d+\)$/, "");
}

function issueHitCount(issue) {
  const match = String(issue || "").match(/\((\d+)\)$/);
  return match ? Number(match[1]) : 1;
}

function collectIssueDocuments(issueLabel, rows) {
  return rows
    .filter((row) => row.status === "counted")
    .map((row) => {
      const issue = (row.dominantIssues || []).find((value) => cleanIssue(value) === issueLabel);
      if (!issue) return null;
      return {
        sequence: row.sequence,
        id: row.id,
        date: row.date,
        type: row.type,
        title: row.title,
        pages: Number(row.actualConversationPages || 0),
        score: Number(row.selectionScore || 0),
        issueHits: issueHitCount(issue),
        tier: row.selectionTier,
        annotationTreatment: row.annotationTreatment,
        pdfUrl: row.pdfUrl,
        pddReferences: row.pddReferences,
        publicPapers: row.publicPapers,
        sourceCopyControls: row.sourceCopyControls,
        supportLeads: row.supportLeads
      };
    })
    .filter(Boolean);
}

function scenarioMembershipMap(pageBudget) {
  const map = new Map();
  for (const scenario of pageBudget.scenarios || []) {
    map.set(scenario.id, new Set(scenario.documentIds || []));
  }
  return map;
}

function scenarioStats(documents, membership, scenarioId) {
  const ids = membership.get(scenarioId) || new Set();
  const docs = documents.filter((doc) => ids.has(doc.id));
  return {
    documents: docs.length,
    pages: docs.reduce((sum, doc) => sum + doc.pages, 0),
    tier1: docs.filter((doc) => doc.tier === "Tier 1 - likely core").length,
    tier2: docs.filter((doc) => doc.tier === "Tier 2 - strong candidate").length
  };
}

function assessment(stats) {
  const tier1 = stats["tier-1-likely-core"].documents;
  const tier12 = stats["tier-1-2-strong-core"].documents;
  const all = stats["all-counted-documents"].documents;
  if (tier1 >= 3) return "Strong first-pass coverage";
  if (tier1 >= 1 && tier12 >= 4) return "Adequate first-pass coverage";
  if (tier1 === 0 && tier12 >= 3) return "Needs Tier 2 representative";
  if (tier12 === 0 && all > 0) return "Background-only in current tiers";
  return "Thin or unresolved coverage";
}

function suggestedMove(row) {
  if (row.coverageAssessment === "Strong first-pass coverage") {
    return "Select a small number of exemplars and use the rest for annotation/background to avoid overloading the volume.";
  }
  if (row.coverageAssessment === "Adequate first-pass coverage") {
    return "Use Tier 1 as the spine, then test whether one Tier 2 document is needed for chronology or nuance.";
  }
  if (row.coverageAssessment === "Needs Tier 2 representative") {
    return "Review Tier 2 documents closely; this issue lacks a Tier 1 anchor but has strong candidates.";
  }
  if (row.coverageAssessment === "Background-only in current tiers") {
    return "Decide whether this issue needs a representative document or can remain annotation/context only.";
  }
  return "Check the underlying topic index and hard gaps before treating this issue as covered.";
}

function buildRows(inputs) {
  const selectionRows = inputs.selection.rows;
  const membership = scenarioMembershipMap(inputs.pageBudget);
  const authorityByIssue = new Map((inputs.annotation.authorityTargets || []).map((item) => [item.key, item]));
  const topicByIssue = new Map((inputs.topic.topicSections || []).map((item) => [item.label, item]));
  const issueLabels = (inputs.topic.topicDefinitions || []).map((item) => item.label);

  return issueLabels.map((issue) => {
    const documents = collectIssueDocuments(issue, selectionRows);
    const stats = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenarioStats(documents, membership, scenario.id)]));
    const topDocuments = documents
      .slice()
      .sort((a, b) => b.score - a.score || b.issueHits - a.issueHits || b.pages - a.pages || a.date.localeCompare(b.date))
      .slice(0, 8);
    const yearSpread = [...documents.reduce((map, doc) => {
      const year = doc.date.slice(0, 4);
      const entry = map.get(year) || { year, documents: 0, pages: 0 };
      entry.documents += 1;
      entry.pages += doc.pages;
      map.set(year, entry);
      return map;
    }, new Map()).values()].sort((a, b) => a.year.localeCompare(b.year));
    const issueRow = {
      issue,
      annotationPriority: authorityByIssue.get(issue)?.priority || "",
      annotationNote: authorityByIssue.get(issue)?.annotationNote || "",
      role: authorityByIssue.get(issue)?.role || "",
      topicIndexDocuments: topicByIssue.get(issue)?.documentCount || 0,
      topicIndexHits: topicByIssue.get(issue)?.totalHits || 0,
      countedDocuments: documents.length,
      countedPages: documents.reduce((sum, doc) => sum + doc.pages, 0),
      scenarioStats: stats,
      topDocuments,
      yearSpread
    };
    issueRow.coverageAssessment = assessment(stats);
    issueRow.suggestedCompilerMove = suggestedMove(issueRow);
    return issueRow;
  }).sort((a, b) => b.scenarioStats["tier-1-likely-core"].documents - a.scenarioStats["tier-1-likely-core"].documents || b.countedDocuments - a.countedDocuments || a.issue.localeCompare(b.issue));
}

function buildSummary(rows) {
  return {
    issueRows: rows.length,
    strongFirstPassIssues: rows.filter((row) => row.coverageAssessment === "Strong first-pass coverage").length,
    adequateFirstPassIssues: rows.filter((row) => row.coverageAssessment === "Adequate first-pass coverage").length,
    needsTier2Representative: rows.filter((row) => row.coverageAssessment === "Needs Tier 2 representative").length,
    backgroundOnlyIssues: rows.filter((row) => row.coverageAssessment === "Background-only in current tiers").length,
    thinOrUnresolvedIssues: rows.filter((row) => row.coverageAssessment === "Thin or unresolved coverage").length,
    tierOneIssuePages: rows.reduce((sum, row) => sum + row.scenarioStats["tier-1-likely-core"].pages, 0),
    tierOneTwoIssuePages: rows.reduce((sum, row) => sum + row.scenarioStats["tier-1-2-strong-core"].pages, 0),
    allCountedIssuePages: rows.reduce((sum, row) => sum + row.scenarioStats["all-counted-documents"].pages, 0)
  };
}

function writeCsv(rows) {
  const fields = [
    "issue",
    "coverageAssessment",
    "annotationPriority",
    "countedDocuments",
    "countedPages",
    "tier1Documents",
    "tier1Pages",
    "tier12Documents",
    "tier12Pages",
    "heavyAnnotationDocuments",
    "heavyAnnotationPages",
    "tier13Documents",
    "tier13Pages",
    "allCountedDocuments",
    "allCountedPages",
    "topicIndexDocuments",
    "topicIndexHits",
    "topDocuments",
    "annotationNote",
    "suggestedCompilerMove",
    "role"
  ];
  const body = rows.map((row) => {
    const values = {
      issue: row.issue,
      coverageAssessment: row.coverageAssessment,
      annotationPriority: row.annotationPriority,
      countedDocuments: row.countedDocuments,
      countedPages: row.countedPages,
      tier1Documents: row.scenarioStats["tier-1-likely-core"].documents,
      tier1Pages: row.scenarioStats["tier-1-likely-core"].pages,
      tier12Documents: row.scenarioStats["tier-1-2-strong-core"].documents,
      tier12Pages: row.scenarioStats["tier-1-2-strong-core"].pages,
      heavyAnnotationDocuments: row.scenarioStats["heavy-annotation-review"].documents,
      heavyAnnotationPages: row.scenarioStats["heavy-annotation-review"].pages,
      tier13Documents: row.scenarioStats["tier-1-3-broad-draft"].documents,
      tier13Pages: row.scenarioStats["tier-1-3-broad-draft"].pages,
      allCountedDocuments: row.scenarioStats["all-counted-documents"].documents,
      allCountedPages: row.scenarioStats["all-counted-documents"].pages,
      topicIndexDocuments: row.topicIndexDocuments,
      topicIndexHits: row.topicIndexHits,
      topDocuments: row.topDocuments.map((doc) => `#${doc.sequence} ${doc.date} ${doc.title}`),
      annotationNote: row.annotationNote,
      suggestedCompilerMove: row.suggestedCompilerMove,
      role: row.role
    };
    return fields.map((field) => csvCell(values[field])).join(",");
  });
  fs.writeFileSync(path.join(REPORTS_DIR, "thematic-selection-matrix.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function compactTopDocs(docs) {
  return docs
    .slice(0, 5)
    .map((doc) => `${htmlLink(`#${doc.sequence} ${doc.date}`, doc.pdfUrl)} <span>${htmlCell(doc.tier)}; ${htmlCell(doc.pages)} pp.</span>`)
    .join("<br>");
}

function buildHtml(report) {
  const summaryRows = [
    ["Issues", report.summary.issueRows],
    ["Strong", report.summary.strongFirstPassIssues],
    ["Adequate", report.summary.adequateFirstPassIssues],
    ["Needs Tier 2", report.summary.needsTier2Representative],
    ["Background", report.summary.backgroundOnlyIssues],
    ["Thin", report.summary.thinOrUnresolvedIssues]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.issue)}<br><span>${htmlCell(row.annotationPriority)}</span></td>
        <td>${htmlCell(row.coverageAssessment)}</td>
        <td>${htmlCell(row.scenarioStats["tier-1-likely-core"].documents)} / ${htmlCell(row.scenarioStats["tier-1-likely-core"].pages)}</td>
        <td>${htmlCell(row.scenarioStats["tier-1-2-strong-core"].documents)} / ${htmlCell(row.scenarioStats["tier-1-2-strong-core"].pages)}</td>
        <td>${htmlCell(row.scenarioStats["heavy-annotation-review"].documents)} / ${htmlCell(row.scenarioStats["heavy-annotation-review"].pages)}</td>
        <td>${htmlCell(row.scenarioStats["tier-1-3-broad-draft"].documents)} / ${htmlCell(row.scenarioStats["tier-1-3-broad-draft"].pages)}</td>
        <td>${htmlCell(row.scenarioStats["all-counted-documents"].documents)} / ${htmlCell(row.scenarioStats["all-counted-documents"].pages)}</td>
        <td>${compactTopDocs(row.topDocuments)}</td>
        <td>${htmlCell(row.suggestedCompilerMove)}<br><span>${htmlCell(row.annotationNote)}</span></td>
      </tr>`
    )
    .join("\n");

  const yearCards = report.rows
    .map(
      (row) => `<section class="year-card">
        <h3>${htmlCell(row.issue)}</h3>
        <p>${htmlCell(row.coverageAssessment)}</p>
        <table>
          <thead><tr><th>Year</th><th>Docs</th><th>Pages</th></tr></thead>
          <tbody>${row.yearSpread
            .map((year) => `<tr><td>${htmlCell(year.year)}</td><td>${htmlCell(year.documents)}</td><td>${htmlCell(year.pages)}</td></tr>`)
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
    <title>FRUS Thematic Selection Matrix</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
      h3 { margin: 0 0 6px; font-size: 1.2rem; }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.42rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6), td:nth-child(7) { text-align: right; white-space: nowrap; }
      span { color: #687483; font-size: .9em; }
      .year-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .year-card { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      .year-card p { margin: 0 0 10px; color: #5b6470; }
      @media (max-width: 900px) { dl.summary, .year-grid { grid-template-columns: 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Thematic Selection Matrix</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This matrix compares the recurring issue clusters across the published selection tiers and page-budget scenarios, so the compiler can see where the first-pass document spine is strong, thin, or likely to need a Tier 2 representative.</p>
      <div class="actions">
        <a href="chronological-chapter-outline.html">Open chapter outline</a>
        <a href="thematic-selection-matrix.csv">Download matrix CSV</a>
        <a href="thematic-selection-matrix.json">Open matrix JSON</a>
        <a href="draft-selection-spine.html">Open draft selection spine</a>
        <a href="page-budget-scenarios.html">Open page budgets</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
        <a href="topic-index.html">Open topic index</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
      </div>
      <p class="note">Counts in the scenario columns are shown as documents/pages. Issue totals are non-exclusive because a single Clinton-Yeltsin conversation can carry several policy lines.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Issue Coverage Matrix</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Issue</th><th>Assessment</th><th>Tier 1</th><th>Tier 1-2</th><th>Heavy</th><th>Tier 1-3</th><th>All counted</th><th>Top documents</th><th>Compiler move</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <h2>Year Spread By Issue</h2>
      <div class="year-grid">${yearCards}</div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    selection: readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json")),
    pageBudget: readJson(path.join(REPORTS_DIR, "page-budget-scenarios.json")),
    topic: readJson(path.join(REPORTS_DIR, "topic-index.json")),
    annotation: readJson(path.join(REPORTS_DIR, "annotation-workbench.json"))
  };
  const rows = buildRows(inputs);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Thematic issue coverage matrix for direct Clinton-Yeltsin memcons/telcons in the FRUS 1993-2000, Volume XVIII compiler packet.",
    note:
      "Issue rows are non-exclusive. A document can contribute pages to multiple issue clusters when it appears in multiple dominant-issue tags.",
    scenarioColumns: SCENARIOS,
    summary: buildSummary(rows),
    rows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "thematic-selection-matrix.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "thematic-selection-matrix.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
