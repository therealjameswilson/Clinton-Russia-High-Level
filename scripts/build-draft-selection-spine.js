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

function cleanIssue(issue) {
  return String(issue || "").replace(/\s+\(\d+\)$/, "");
}

function issueHitCount(issue) {
  const match = String(issue || "").match(/\((\d+)\)$/);
  return match ? Number(match[1]) : 1;
}

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function addReason(reasonsById, id, reason) {
  if (!reasonsById.has(id)) reasonsById.set(id, []);
  const reasons = reasonsById.get(id);
  if (!reasons.includes(reason)) reasons.push(reason);
}

function phaseByDocument(outline) {
  const map = new Map();
  for (const phase of outline.phases || []) {
    for (const doc of phase.documents || []) map.set(doc.id, phase);
  }
  return map;
}

function buildSpineRows(selection, themes, outline, readiness) {
  const selectionById = byId(selection.rows);
  const readinessById = byId(readiness.rows);
  const selectedIds = new Set();
  const reasonsById = new Map();
  const phaseMap = phaseByDocument(outline);
  const watchlistById = new Map();

  function select(id, reason) {
    if (!id || !selectionById.has(id)) return;
    selectedIds.add(id);
    addReason(reasonsById, id, reason);
  }

  for (const row of selection.rows) {
    if (row.selectionTier === "Tier 1 - likely core") select(row.id, "Core Tier 1 likely FRUS document");
  }

  for (const theme of themes.rows.filter((row) => row.coverageAssessment === "Needs Tier 2 representative")) {
    const candidates = (theme.topDocuments || []).filter((doc) => doc.tier === "Tier 2 - strong candidate");
    if (candidates[0]) select(candidates[0].id, `Tier 2 representative for ${theme.issue}`);
    for (const doc of candidates.slice(1, 5)) {
      watchlistById.set(doc.id, {
        id: doc.id,
        sequence: doc.sequence,
        date: doc.date,
        title: doc.title,
        pages: doc.pages,
        score: doc.score,
        tier: doc.tier,
        reason: `Alternate Tier 2 representative for ${theme.issue}`,
        pdfUrl: doc.pdfUrl
      });
    }
  }

  for (const phase of outline.phases || []) {
    const tier1Count = phase.tierCounts?.["Tier 1 - likely core"] || 0;
    const tier2Count = phase.tierCounts?.["Tier 2 - strong candidate"] || 0;
    const topTier2 = (phase.selectionAnchors || []).find((doc) => doc.selectionTier === "Tier 2 - strong candidate");
    if (tier1Count === 0 && topTier2) {
      select(topTier2.id, `Phase-continuity anchor: ${phase.label} has no Tier 1 document`);
    } else if (tier1Count === 1 && tier2Count >= 2 && topTier2) {
      select(topTier2.id, `Phase-balance anchor: ${phase.label} has one Tier 1 document`);
    }
    for (const doc of (phase.selectionAnchors || []).filter((item) => item.selectionTier === "Tier 2 - strong candidate").slice(0, 4)) {
      if (!selectedIds.has(doc.id)) {
        watchlistById.set(doc.id, {
          id: doc.id,
          sequence: doc.sequence,
          date: doc.date,
          title: doc.title,
          pages: Number(doc.actualConversationPages || 0),
          score: Number(doc.selectionScore || 0),
          tier: doc.selectionTier,
          reason: `Phase alternate for ${phase.label}`,
          pdfUrl: doc.pdfUrl
        });
      }
    }
  }

  const rows = [...selectedIds]
    .map((id) => {
      const row = selectionById.get(id);
      const ready = readinessById.get(id) || {};
      const phase = phaseMap.get(id) || {};
      const issueScores = (row.dominantIssues || []).map((issue) => ({
        issue: cleanIssue(issue),
        hits: issueHitCount(issue)
      }));
      return {
        sequence: row.sequence,
        id: row.id,
        date: row.date,
        type: row.type,
        title: row.title,
        phaseId: phase.id || "",
        phaseLabel: phase.label || "",
        selectionTier: row.selectionTier,
        selectionScore: row.selectionScore,
        actualConversationPages: Number(row.actualConversationPages || 0),
        annotationTreatment: row.annotationTreatment,
        dominantIssues: row.dominantIssues || [],
        issueScores,
        pddReferences: row.pddReferences,
        publicPapers: row.publicPapers,
        sourceCopyControls: row.sourceCopyControls,
        supportLeads: row.supportLeads,
        readinessBucket: ready.readinessBucket || "",
        sourceNoteStatus: ready.sourceNoteStatus || "",
        facePageStatus: ready.facePageStatus || "",
        pdfUrl: row.pdfUrl,
        sourcePacketUrl: row.sourcePacketUrl,
        selectionReasons: reasonsById.get(id) || []
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.sequence - b.sequence);

  const watchlistRows = [...watchlistById.values()]
    .filter((row) => !selectedIds.has(row.id))
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0) || a.date.localeCompare(b.date))
    .slice(0, 16);

  return { rows, watchlistRows };
}

function issueCoverage(spineRows, themes) {
  return themes.rows.map((theme) => {
    const docs = spineRows.filter((row) => (row.dominantIssues || []).some((issue) => cleanIssue(issue) === theme.issue));
    return {
      issue: theme.issue,
      assessmentBeforeSpine: theme.coverageAssessment,
      selectedDocuments: docs.length,
      selectedPages: docs.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
      selectedSequences: docs.map((row) => row.sequence),
      suggestedCompilerMove: theme.suggestedCompilerMove
    };
  });
}

function phaseCoverage(spineRows, outline) {
  return (outline.phases || []).map((phase) => {
    const docs = spineRows.filter((row) => row.phaseId === phase.id);
    return {
      phaseId: phase.id,
      phaseLabel: phase.label,
      phaseContacts: phase.totalContacts,
      phaseCountedDocuments: phase.countedDocuments,
      phasePendingDocuments: phase.pendingDocuments,
      selectedDocuments: docs.length,
      selectedPages: docs.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
      selectedSequences: docs.map((row) => row.sequence),
      remainingHardGaps: (phase.hardGaps || []).map((gap) => `#${gap.sequence} ${gap.date}`)
    };
  });
}

function buildSummary(rows, watchlistRows, issueRows, phaseRows) {
  return {
    selectedDocuments: rows.length,
    selectedActualPages: rows.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    tierOneDocuments: rows.filter((row) => row.selectionTier === "Tier 1 - likely core").length,
    tierTwoDocuments: rows.filter((row) => row.selectionTier === "Tier 2 - strong candidate").length,
    heavyAnnotationRows: rows.filter((row) => row.annotationTreatment === "Heavy annotation review").length,
    rowsNeedingSourceNoteReview: rows.filter((row) => row.sourceNoteStatus === "Needs source-note review").length,
    watchlistDocuments: watchlistRows.length,
    issuesCovered: issueRows.filter((row) => row.selectedDocuments > 0).length,
    phasesCovered: phaseRows.filter((row) => row.selectedDocuments > 0).length
  };
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "selectionTier",
    "selectionScore",
    "actualConversationPages",
    "phaseLabel",
    "title",
    "selectionReasons",
    "dominantIssues",
    "annotationTreatment",
    "readinessBucket",
    "sourceNoteStatus",
    "facePageStatus",
    "pddReferences",
    "publicPapers",
    "sourceCopyControls",
    "supportLeads",
    "pdfUrl",
    "sourcePacketUrl"
  ];
  const body = rows.map((row) => fields.map((field) => csvCell(row[field])).join(","));
  fs.writeFileSync(path.join(REPORTS_DIR, "draft-selection-spine.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function buildHtml(report) {
  const summaryRows = [
    ["Selected Docs", report.summary.selectedDocuments],
    ["Pages", report.summary.selectedActualPages],
    ["Tier 1", report.summary.tierOneDocuments],
    ["Tier 2", report.summary.tierTwoDocuments],
    ["Heavy Review", report.summary.heavyAnnotationRows],
    ["Source-Note Review", report.summary.rowsNeedingSourceNoteReview],
    ["Issues", report.summary.issuesCovered],
    ["Phases", report.summary.phasesCovered]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const spineRows = report.rows
    .map(
      (row, index) => `<tr>
        <td>${htmlCell(index + 1)}</td>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.selectionTier)}</td>
        <td>${htmlCell(row.actualConversationPages)}</td>
        <td>${htmlCell(row.phaseLabel)}</td>
        <td>${row.pdfUrl ? htmlLink(row.title, row.pdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.selectionReasons.join("; "))}</td>
        <td>${htmlCell(row.dominantIssues.join("; "))}</td>
        <td>${htmlCell(row.readinessBucket)}<br><span>${htmlCell(row.sourceNoteStatus)}</span></td>
      </tr>`
    )
    .join("\n");

  const issueRows = report.issueCoverage
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.issue)}</td>
        <td>${htmlCell(row.assessmentBeforeSpine)}</td>
        <td>${htmlCell(row.selectedDocuments)}</td>
        <td>${htmlCell(row.selectedPages)}</td>
        <td>${htmlCell(row.selectedSequences.map((seq) => `#${seq}`).join(", "))}</td>
        <td>${htmlCell(row.suggestedCompilerMove)}</td>
      </tr>`
    )
    .join("\n");

  const phaseRows = report.phaseCoverage
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.phaseLabel)}</td>
        <td>${htmlCell(row.selectedDocuments)}</td>
        <td>${htmlCell(row.selectedPages)}</td>
        <td>${htmlCell(row.selectedSequences.map((seq) => `#${seq}`).join(", "))}</td>
        <td>${htmlCell(row.remainingHardGaps.join("; "))}</td>
      </tr>`
    )
    .join("\n");

  const watchlistRows = report.watchlistRows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.tier)}</td>
        <td>${htmlCell(row.pages)}</td>
        <td>${row.pdfUrl ? htmlLink(row.title, row.pdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.reason)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Draft Selection Spine</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.4rem, 3vw, 2.05rem); }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.3rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(1), td:nth-child(2), td:nth-child(5) { text-align: right; white-space: nowrap; }
      td:nth-child(7) { min-width: 260px; }
      span { color: #687483; font-size: .9em; }
      @media (max-width: 900px) { dl.summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Draft Selection Spine</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This nonbinding draft spine starts with all Tier 1 likely core documents, then adds Tier 2 representatives for undercovered themes and phase-continuity anchors where the chronological outline has no or only one Tier 1 document.</p>
      <div class="actions">
        <a href="draft-selection-spine.csv">Download spine CSV</a>
        <a href="draft-selection-spine.json">Open spine JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="compiler-next-actions.html">Open next-action queue</a>
        <a href="chronological-chapter-outline.html">Open chapter outline</a>
        <a href="thematic-selection-matrix.html">Open thematic matrix</a>
        <a href="page-budget-scenarios.html">Open page budgets</a>
        <a href="selection-priority-workbench.html">Open selection priorities</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
      </div>
      <p class="note">This is a starting spine, not a final FRUS selection. The watchlist preserves strong alternates that may replace or supplement the proposed set after compiler review.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Draft Spine</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>No.</th><th>Seq</th><th>Date</th><th>Tier</th><th>Pages</th><th>Phase</th><th>Document</th><th>Why included</th><th>Dominant issues</th><th>Readiness</th></tr></thead>
          <tbody>${spineRows}</tbody>
        </table>
      </div>
      <h2>Issue Coverage</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Issue</th><th>Prior assessment</th><th>Docs</th><th>Pages</th><th>Sequences</th><th>Compiler move</th></tr></thead>
          <tbody>${issueRows}</tbody>
        </table>
      </div>
      <h2>Phase Coverage</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Phase</th><th>Docs</th><th>Pages</th><th>Sequences</th><th>Hard gaps</th></tr></thead>
          <tbody>${phaseRows}</tbody>
        </table>
      </div>
      <h2>Tier 2 Watchlist</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Tier</th><th>Pages</th><th>Document</th><th>Why watch</th></tr></thead>
          <tbody>${watchlistRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const selection = readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json"));
  const themes = readJson(path.join(REPORTS_DIR, "thematic-selection-matrix.json"));
  const outline = readJson(path.join(REPORTS_DIR, "chronological-chapter-outline.json"));
  const readiness = readJson(path.join(REPORTS_DIR, "production-readiness-checklist.json"));
  const { rows, watchlistRows } = buildSpineRows(selection, themes, outline, readiness);
  const issues = issueCoverage(rows, themes);
  const phases = phaseCoverage(rows, outline);
  return {
    generatedAt: new Date().toISOString(),
    scope: "Nonbinding draft document-selection spine for the direct Clinton-Yeltsin memcon/telcon chronology.",
    selectionRules: [
      "Include every Tier 1 likely core document.",
      "Add the top Tier 2 representative for each thematic matrix row marked Needs Tier 2 representative.",
      "Add the strongest Tier 2 phase-continuity anchor for phases with no Tier 1 document.",
      "Add the strongest Tier 2 phase-balance anchor for phases with only one Tier 1 document and multiple Tier 2 anchors.",
      "Keep strong remaining Tier 2 candidates in a watchlist rather than automatically selecting them."
    ],
    summary: buildSummary(rows, watchlistRows, issues, phases),
    rows,
    issueCoverage: issues,
    phaseCoverage: phases,
    watchlistRows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "draft-selection-spine.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "draft-selection-spine.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
