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

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function compactList(values = [], maxItems = 3) {
  const list = values.filter(Boolean);
  if (list.length <= maxItems) return list;
  return [...list.slice(0, maxItems), `+${list.length - maxItems} more`];
}

function pageRangeCount(range) {
  const match = String(range || "").match(/^(\d+)-(\d+)$/);
  if (!match) return "";
  return Number(match[2]) - Number(match[1]) + 1;
}

function phaseMap(outline) {
  const map = new Map();
  for (const phase of outline.phases || []) {
    map.set(phase.id, phase);
  }
  return map;
}

function actionMap(nextActions) {
  const map = new Map();
  for (const task of nextActions.tasks || []) {
    if (!task.id) continue;
    if (!map.has(task.id)) map.set(task.id, []);
    map.get(task.id).push(task);
  }
  return map;
}

function actionSummary(tasks = [], worksheetAction = "") {
  const pieces = [];
  if (worksheetAction) pieces.push(worksheetAction);
  for (const task of tasks.filter((item) => item.priority === "P0" || item.priority === "P1").slice(0, 2)) {
    pieces.push(`${task.priority} ${task.workstream}: ${task.nextAction || task.action}`);
  }
  return [...new Set(pieces)].slice(0, 3);
}

function reviewBlockers(row) {
  const blockers = [];
  if (row.sourceNoteReviewStatus && row.sourceNoteReviewStatus !== "Ready") {
    blockers.push(row.sourceNoteReviewStatus);
  }
  if ((row.sourceNoteFlags || []).length) {
    blockers.push(`Source-note flags: ${row.sourceNoteFlags.join("; ")}`);
  }
  if (row.facePageStatus && row.facePageStatus !== "Ready") {
    blockers.push(row.facePageStatus);
  }
  if ((row.facePageMissingFields || []).length) {
    blockers.push(`Face-page gaps: ${row.facePageMissingFields.join("; ")}`);
  }
  if (row.annotationTreatment) blockers.push(row.annotationTreatment);
  return blockers;
}

function buildRows(inputs) {
  const worksheetById = byId(inputs.worksheet.rows);
  const readinessById = byId(inputs.readiness.rows);
  const sourceElementsById = byId(inputs.sourceElements.rows);
  const phaseById = phaseMap(inputs.outline);
  const actionsById = actionMap(inputs.nextActions);
  let cumulativePages = 0;

  return (inputs.spine.rows || []).map((spineRow, index) => {
    const worksheet = worksheetById.get(spineRow.id) || {};
    const readiness = readinessById.get(spineRow.id) || {};
    const sourceElement = sourceElementsById.get(spineRow.id) || {};
    const phase = phaseById.get(spineRow.phaseId) || {};
    const pages = Number(spineRow.actualConversationPages || worksheet.actualConversationPages || 0);
    cumulativePages += pages;
    const tasks = actionsById.get(spineRow.id) || [];
    const pddRefs = worksheet.pddReferences || [];
    const publicSameDay = worksheet.publicSameDay || [];
    const publicNearby = worksheet.publicNearby || [];
    const sourceCopies = worksheet.sourceCopies || [];
    const strobeContext = worksheet.strobeContext || [];
    const naraSupport = worksheet.naraSupport || [];

    return {
      provisionalDocumentNumber: `D-${String(index + 1).padStart(3, "0")}`,
      provisionalFrusLabel: `Provisional Document ${index + 1}`,
      finalFrusDocumentNumber: "",
      includeDecision: "",
      editorialTreatment: "",
      compilerNotes: "",
      spineOrder: index + 1,
      sequence: spineRow.sequence,
      id: spineRow.id,
      date: spineRow.date,
      type: spineRow.type,
      title: spineRow.title,
      phaseId: spineRow.phaseId,
      phaseLabel: spineRow.phaseLabel,
      phaseNarrativeUse: phase.narrativeUse || "",
      selectionTier: spineRow.selectionTier,
      selectionScore: spineRow.selectionScore,
      selectionReasons: spineRow.selectionReasons || [],
      actualConversationPages: pages,
      cumulativeActualPages: cumulativePages,
      packetPages: worksheet.packetPages || "",
      packetPageCount: pageRangeCount(worksheet.packetPages),
      actualConversationPacketPages: worksheet.actualConversationPacketPages || "",
      provenanceSheetPacketPage: worksheet.provenanceSheetPacketPage || "",
      sourcePdfPages: worksheet.sourcePdfPages || readiness.sourcePdfPages || "",
      markerPage: worksheet.markerPage || "",
      pdfUrl: spineRow.pdfUrl || worksheet.pdfUrl || readiness.derivativePdfUrl || "",
      sourcePacketUrl: spineRow.sourcePacketUrl || worksheet.sourcePacketUrl || readiness.sourcePacketUrl || "",
      dominantIssues: spineRow.dominantIssues || [],
      topTopics: worksheet.topTopics || spineRow.dominantIssues || [],
      topAuthorities: worksheet.topAuthorities || [],
      annotationTreatment: spineRow.annotationTreatment || worksheet.annotationTreatment || readiness.annotationTreatment || "",
      annotationPrompt: worksheet.annotationPrompt || "",
      sourceNoteStatus: worksheet.sourceNoteReviewStatus || spineRow.sourceNoteStatus || readiness.sourceNoteStatus || "",
      sourceNoteFlags: worksheet.sourceNoteFlags || readiness.sourceNoteFlags || [],
      baseFrusSourceNote: worksheet.baseFrusSourceNote || readiness.frusSourceNote || "",
      sourceNoteDraftForReview: worksheet.sourceNoteDraftForReview || "",
      sourceElementChecklist: sourceElement.presentElements || sourceElement.citationElementsPresent || [],
      facePageStatus: worksheet.facePageStatus || spineRow.facePageStatus || readiness.facePageStatus || "",
      facePageMissingFields: worksheet.facePageMissingFields || readiness.facePageMissingFields || [],
      facePageAddendaForReview: worksheet.facePageAddendaForReview || "",
      subject: worksheet.subject || "",
      dateTimePlace: worksheet.dateTimePlace || "",
      participantsBlock: worksheet.participantsBlock || "",
      pddReferenceCount: pddRefs.length || Number(spineRow.pddReferences || 0),
      publicStatementCount: publicSameDay.length + publicNearby.length || Number(spineRow.publicPapers || 0),
      sourceCopyCount: sourceCopies.length || Number(spineRow.sourceCopyControls || 0),
      strobeContextCount: strobeContext.length,
      naraSupportCount: naraSupport.length,
      pddReferences: compactList(pddRefs.map((item) => `${item.date || ""} ${item.title || item.summary || ""}`.trim()), 3),
      publicStatements: compactList([...publicSameDay, ...publicNearby].map((item) => `${item.date || ""} ${item.title || ""}`.trim()), 3),
      sourceCopies: compactList(sourceCopies.map((item) => item.title || item.name || item.url || item.id), 3),
      nextActions: actionSummary(tasks, worksheet.nextActions),
      reviewBlockers: reviewBlockers(worksheet),
      reportLinks: [...new Set(tasks.flatMap((task) => task.reportLinks || []))]
    };
  });
}

function buildPhaseSummary(rows, outline, spine) {
  const byPhase = new Map();
  for (const row of rows) {
    if (!byPhase.has(row.phaseId)) {
      byPhase.set(row.phaseId, {
        phaseId: row.phaseId,
        phaseLabel: row.phaseLabel,
        selectedDocuments: 0,
        selectedPages: 0,
        selectedSequences: [],
        firstProvisionalDocument: row.provisionalDocumentNumber,
        lastProvisionalDocument: row.provisionalDocumentNumber,
        cumulativePagesThroughPhase: 0
      });
    }
    const phase = byPhase.get(row.phaseId);
    phase.selectedDocuments += 1;
    phase.selectedPages += Number(row.actualConversationPages || 0);
    phase.selectedSequences.push(row.sequence);
    phase.lastProvisionalDocument = row.provisionalDocumentNumber;
    phase.cumulativePagesThroughPhase = row.cumulativeActualPages;
  }

  const coverageById = new Map((spine.phaseCoverage || []).map((row) => [row.phaseId, row]));
  return (outline.phases || []).map((phase) => {
    const selected = byPhase.get(phase.id) || {
      phaseId: phase.id,
      phaseLabel: phase.label,
      selectedDocuments: 0,
      selectedPages: 0,
      selectedSequences: [],
      firstProvisionalDocument: "",
      lastProvisionalDocument: "",
      cumulativePagesThroughPhase: 0
    };
    const coverage = coverageById.get(phase.id) || {};
    return {
      ...selected,
      phaseContacts: phase.totalContacts,
      phaseCountedDocuments: phase.countedDocuments,
      phasePendingDocuments: phase.pendingDocuments,
      phaseActualConversationPages: phase.actualConversationPages,
      estimatedHardGapPages: phase.estimatedHardGapPages,
      narrativeUse: phase.narrativeUse || "",
      remainingHardGaps: coverage.remainingHardGaps || (phase.hardGaps || []).map((gap) => `#${gap.sequence} ${gap.date}`)
    };
  });
}

function buildSummary(rows, phaseSummary) {
  return {
    documents: rows.length,
    pages: rows.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    packetPages: rows.reduce((sum, row) => sum + Number(row.packetPageCount || 0), 0),
    tierOne: rows.filter((row) => row.selectionTier === "Tier 1 - likely core").length,
    tierTwo: rows.filter((row) => row.selectionTier === "Tier 2 - strong candidate").length,
    phasesRepresented: phaseSummary.filter((row) => row.selectedDocuments > 0).length,
    sourceNoteReview: rows.filter((row) => row.sourceNoteStatus === "Needs source-note review").length,
    facePageReview: rows.filter((row) => row.facePageStatus === "Review fields").length,
    heavyAnnotation: rows.filter((row) => row.annotationTreatment === "Heavy annotation review").length,
    rowsWithPdd: rows.filter((row) => Number(row.pddReferenceCount || 0) > 0).length,
    rowsWithPublicPapers: rows.filter((row) => Number(row.publicStatementCount || 0) > 0).length,
    rowsWithSourceCopies: rows.filter((row) => Number(row.sourceCopyCount || 0) > 0).length
  };
}

function writeCsv(rows) {
  const fields = [
    "provisionalDocumentNumber",
    "finalFrusDocumentNumber",
    "includeDecision",
    "editorialTreatment",
    "compilerNotes",
    "spineOrder",
    "sequence",
    "date",
    "type",
    "title",
    "phaseLabel",
    "selectionTier",
    "selectionScore",
    "actualConversationPages",
    "cumulativeActualPages",
    "packetPages",
    "sourcePdfPages",
    "markerPage",
    "provenanceSheetPacketPage",
    "dominantIssues",
    "topAuthorities",
    "sourceNoteStatus",
    "sourceNoteFlags",
    "facePageStatus",
    "facePageMissingFields",
    "annotationTreatment",
    "pddReferenceCount",
    "publicStatementCount",
    "sourceCopyCount",
    "selectionReasons",
    "nextActions",
    "baseFrusSourceNote",
    "pdfUrl",
    "sourcePacketUrl"
  ];
  const body = rows.map((row) => fields.map((field) => csvCell(row[field])).join(","));
  fs.writeFileSync(path.join(REPORTS_DIR, "provisional-document-list.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function summaryCards(summary) {
  return [
    ["Docs", summary.documents],
    ["Pages", summary.pages],
    ["Packet Pages", summary.packetPages],
    ["Tier 1", summary.tierOne],
    ["Tier 2", summary.tierTwo],
    ["Phases", summary.phasesRepresented],
    ["Source-Note Review", summary.sourceNoteReview],
    ["Face-Page Review", summary.facePageReview],
    ["Heavy Annotation", summary.heavyAnnotation],
    ["Public Context", summary.rowsWithPublicPapers]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");
}

function linkList(row) {
  const links = [];
  if (row.pdfUrl) links.push(htmlLink("PDF", row.pdfUrl));
  if (row.sourcePacketUrl) links.push(htmlLink("Source packet", row.sourcePacketUrl));
  if (row.reportLinks.length) {
    links.push(...row.reportLinks.slice(0, 2).map((href) => htmlLink(href.replace(/\.html$/, ""), href)));
  }
  return links.join(" ");
}

function listHtml(values = []) {
  if (!values.length) return "";
  return `<ul>${values.map((value) => `<li>${htmlCell(value)}</li>`).join("")}</ul>`;
}

function documentRows(rows) {
  return rows
    .map(
      (row) => `<tr>
        <td><strong>${htmlCell(row.provisionalDocumentNumber)}</strong><br><span>${htmlCell(row.provisionalFrusLabel)}</span></td>
        <td>${htmlCell(row.date)}<br><span>#${htmlCell(row.sequence)} ${htmlCell(row.type)}</span></td>
        <td>${htmlLink(row.title, row.pdfUrl)}<br><span>${htmlCell(row.phaseLabel)}</span></td>
        <td>${htmlCell(row.actualConversationPages)}<br><span>Cume ${htmlCell(row.cumulativeActualPages)}</span></td>
        <td>${htmlCell(row.selectionTier)}<br><span>Score ${htmlCell(row.selectionScore)}</span>${listHtml(row.selectionReasons)}</td>
        <td>${listHtml(compactList(row.dominantIssues, 4))}</td>
        <td><strong>${htmlCell(row.sourceNoteStatus)}</strong><br>${htmlCell(row.facePageStatus)}<br><span>${htmlCell(row.annotationTreatment)}</span>${listHtml(compactList(row.reviewBlockers, 3))}</td>
        <td>${htmlCell(row.packetPages || "n/a")}<br><span>Source pages ${htmlCell(row.sourcePdfPages || "n/a")}; marker ${htmlCell(row.markerPage || "n/a")}; provenance sheet ${htmlCell(row.provenanceSheetPacketPage || "n/a")}</span></td>
        <td>${htmlCell(row.pddReferenceCount)} PDD / ${htmlCell(row.publicStatementCount)} public / ${htmlCell(row.sourceCopyCount)} copies<br>${listHtml(row.nextActions)}</td>
        <td>${linkList(row)}</td>
      </tr>`
    )
    .join("\n");
}

function phaseRows(rows) {
  return rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.phaseLabel)}</td>
        <td>${htmlCell(row.selectedDocuments)}</td>
        <td>${htmlCell(row.selectedPages)}</td>
        <td>${htmlCell(row.firstProvisionalDocument || "n/a")} - ${htmlCell(row.lastProvisionalDocument || "n/a")}</td>
        <td>${htmlCell(row.phaseContacts)} contacts / ${htmlCell(row.phaseCountedDocuments)} counted / ${htmlCell(row.phasePendingDocuments)} pending</td>
        <td>${htmlCell(row.remainingHardGaps.join("; "))}</td>
        <td>${htmlCell(row.narrativeUse)}</td>
      </tr>`
    )
    .join("\n");
}

function buildHtml(report) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Provisional Document List</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1360px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.6rem); }
      h2 { margin-top: 34px; font-size: clamp(1.35rem, 3vw, 2.05rem); }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 1000px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.3rem; font-weight: 800; }
      .note { max-width: 1000px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(1), td:nth-child(2), td:nth-child(4), td:nth-child(8) { white-space: nowrap; }
      td:nth-child(3) { min-width: 260px; }
      td:nth-child(7), td:nth-child(9) { min-width: 220px; }
      ul { margin: 5px 0 0 18px; padding: 0; }
      li { margin: 2px 0; }
      span { color: #687483; font-size: .9em; }
      @media (max-width: 940px) { dl.summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
      @media print {
        body { background: white; }
        main { width: auto; padding: 0; }
        .actions, main > p, .note { display: none; }
        .table-wrap { box-shadow: none; }
      }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Provisional Document List</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This is a nonbinding, FRUS-style draft document list for the 16-document Clinton-Yeltsin spine. It converts selection triage into provisional document numbers, phase placement, page load, source-note status, and the review work still blocking production.</p>
      <div class="actions">
        <a href="provisional-document-list.csv">Download document-list CSV</a>
        <a href="provisional-document-list.json">Open document-list JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="draft-selection-spine.html">Open draft spine</a>
        <a href="draft-spine-worksheet.html">Open spine worksheet</a>
        <a href="compiler-next-actions.html">Open next-action queue</a>
        <a href="chronological-chapter-outline.html">Open chapter outline</a>
        <a href="page-budget-scenarios.html">Open page budgets</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
      </div>
      <p class="note">The document numbers are placeholders. The blank final-number, include-decision, editorial-treatment, and compiler-notes fields in the CSV/JSON are for final compiler judgment after source-note and declassification review.</p>
      <dl class="summary">${summaryCards(report.summary)}</dl>
      <h2>Provisional Document List</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Draft No.</th><th>Date</th><th>Document</th><th>Pages</th><th>Selection</th><th>Issues</th><th>Production Status</th><th>Packet</th><th>Compiler Hooks</th><th>Links</th></tr></thead>
          <tbody>${documentRows(report.rows)}</tbody>
        </table>
      </div>
      <h2>Phase Load</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Phase</th><th>Docs</th><th>Pages</th><th>Draft Nos.</th><th>Full Contact Load</th><th>Hard Gaps</th><th>Narrative Use</th></tr></thead>
          <tbody>${phaseRows(report.phaseSummary)}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    spine: readJson(path.join(REPORTS_DIR, "draft-selection-spine.json")),
    worksheet: readJson(path.join(REPORTS_DIR, "draft-spine-worksheet.json")),
    outline: readJson(path.join(REPORTS_DIR, "chronological-chapter-outline.json")),
    readiness: readJson(path.join(REPORTS_DIR, "production-readiness-checklist.json")),
    sourceElements: readJson(path.join(REPORTS_DIR, "source-note-element-audit.json")),
    nextActions: readJson(path.join(REPORTS_DIR, "compiler-next-actions.json"))
  };
  const rows = buildRows(inputs);
  const phaseSummary = buildPhaseSummary(rows, inputs.outline, inputs.spine);
  return {
    generatedAt: new Date().toISOString(),
    scope: "Nonbinding provisional FRUS document list for the 16-document Clinton-Yeltsin draft spine.",
    caveat: "Provisional document numbers and blank decision fields are generated aids, not final FRUS compilation decisions.",
    summary: buildSummary(rows, phaseSummary),
    rows,
    phaseSummary
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "provisional-document-list.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "provisional-document-list.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
