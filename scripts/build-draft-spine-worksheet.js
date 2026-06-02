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

function compactText(value, maxLength = 520) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function taskSummary(tasks = []) {
  return tasks
    .map((task) => `${task.priority} ${task.workstream}: ${task.action}`)
    .join(" | ");
}

function buildRows(inputs) {
  const sourceDraftById = byId(inputs.sourceDrafts.rows);
  const sourceElementById = byId(inputs.sourceElements.rows);
  const faceById = byId(inputs.facePages.rows);
  const annotationById = byId(inputs.annotation.documentQueue);
  const dossierById = byId(inputs.dossier.rows);
  const manifestById = byId(inputs.manifest.rows);
  const readinessById = byId(inputs.readiness.rows);
  const tasksById = new Map();
  for (const task of inputs.nextActions.tasks || []) {
    if (!tasksById.has(task.id)) tasksById.set(task.id, []);
    tasksById.get(task.id).push(task);
  }

  return inputs.spine.rows.map((spineRow, index) => {
    const sourceDraft = sourceDraftById.get(spineRow.id) || {};
    const sourceElement = sourceElementById.get(spineRow.id) || {};
    const face = faceById.get(spineRow.id) || {};
    const annotation = annotationById.get(spineRow.id) || {};
    const dossier = dossierById.get(spineRow.id) || {};
    const manifest = manifestById.get(spineRow.id) || {};
    const readiness = readinessById.get(spineRow.id) || {};
    const tasks = tasksById.get(spineRow.id) || [];
    return {
      spineOrder: index + 1,
      sequence: spineRow.sequence,
      id: spineRow.id,
      date: spineRow.date,
      type: spineRow.type,
      title: spineRow.title,
      phaseLabel: spineRow.phaseLabel,
      selectionTier: spineRow.selectionTier,
      selectionScore: spineRow.selectionScore,
      selectionReasons: spineRow.selectionReasons || [],
      actualConversationPages: spineRow.actualConversationPages,
      packetPages: manifest.packetPageStart ? `${manifest.packetPageStart}-${manifest.packetPageEnd}` : sourceDraft.packetPages || readiness.packetPages || "",
      actualConversationPacketPages:
        manifest.actualConversationPacketPageStart && manifest.actualConversationPacketPageEnd
          ? `${manifest.actualConversationPacketPageStart}-${manifest.actualConversationPacketPageEnd}`
          : sourceDraft.actualConversationPacketPages || "",
      provenanceSheetPacketPage: manifest.provenanceSheetPacketPage || "",
      sourcePdfPages: spineRow.sourcePdfPages || readiness.sourcePdfPages || sourceDraft.sourcePdfPages || dossier.sourcePdfPages || "",
      markerPage: dossier.markerPage || sourceElement.markerPage || "",
      pdfUrl: spineRow.pdfUrl || sourceDraft.pdfUrl || annotation.pdfUrl || readiness.derivativePdfUrl || "",
      sourcePacketUrl: spineRow.sourcePacketUrl || sourceDraft.sourcePacketUrl || readiness.sourcePacketUrl || dossier.sourcePacketUrl || "",
      sourceNoteDraftForReview: sourceDraft.sourceNoteDraftForReview || sourceElement.sourceNoteDraftForReview || "",
      baseFrusSourceNote: sourceDraft.baseFrusSourceNote || sourceElement.frusSourceNote || dossier.frusSourceNote || "",
      sourceNoteReviewStatus: sourceDraft.sourceNoteReviewStatus || sourceElement.sourceNoteReviewStatus || readiness.sourceNoteStatus || "",
      sourceNoteFlags: sourceDraft.reviewFlags || sourceElement.sourceNoteFlags || readiness.sourceNoteFlags || [],
      facePageStatus: face.reviewStatus || sourceElement.facePageStatus || readiness.facePageStatus || "",
      facePageMissingFields: face.missingFields || sourceElement.facePageMissingFields || readiness.facePageMissingFields || [],
      facePageAddendaForReview: sourceDraft.facePageAddendaForReview || "",
      subject: face.subject || sourceDraft.subject || sourceElement.subject || "",
      dateTimePlace: face.dateTimePlace || sourceDraft.dateTimePlace || sourceElement.dateTimePlace || "",
      participantsBlock: face.participantsBlock || sourceDraft.participantsBlock || "",
      notetaker: face.notetaker || sourceDraft.notetaker || sourceElement.notetaker || "",
      interpreter: face.interpreter || sourceDraft.interpreter || sourceElement.interpreter || "",
      classificationMarking: face.classification?.marking || sourceDraft.classificationMarking || sourceElement.classificationMarking || "",
      annotationPrompt: annotation.annotationPrompt || "",
      topTopics: annotation.topTopics || spineRow.dominantIssues || [],
      topAuthorities: annotation.topAuthorities || [],
      annotationTreatment: annotation.suggestedTreatment || spineRow.annotationTreatment || "",
      pddReferences: dossier.pddReferences || [],
      publicSameDay: dossier.publicSameDay || [],
      publicNearby: dossier.publicNearby || [],
      sourceCopies: dossier.sourceCopies || [],
      strobeContext: dossier.strobeContext || [],
      naraSupport: dossier.naraSupport || [],
      nextActions: taskSummary(tasks),
      compilerDecision: "",
      proposedDocumentNumber: "",
      printTreatment: "",
      sourceNoteChecked: "",
      facePageChecked: "",
      annotationChecked: "",
      declassificationNotes: "",
      compilerNotes: ""
    };
  });
}

function buildSummary(rows) {
  return {
    documents: rows.length,
    pages: rows.reduce((sum, row) => sum + Number(row.actualConversationPages || 0), 0),
    tierOne: rows.filter((row) => row.selectionTier === "Tier 1 - likely core").length,
    tierTwo: rows.filter((row) => row.selectionTier === "Tier 2 - strong candidate").length,
    sourceNoteReview: rows.filter((row) => row.sourceNoteReviewStatus === "Needs source-note review").length,
    facePageReview: rows.filter((row) => row.facePageStatus === "Review fields").length,
    heavyAnnotation: rows.filter((row) => row.annotationTreatment === "Heavy annotation review").length,
    rowsWithPdd: rows.filter((row) => row.pddReferences.length).length,
    rowsWithPublicPapers: rows.filter((row) => row.publicSameDay.length || row.publicNearby.length).length,
    rowsWithSourceCopies: rows.filter((row) => row.sourceCopies.length).length
  };
}

function writeCsv(rows) {
  const fields = [
    "spineOrder",
    "compilerDecision",
    "proposedDocumentNumber",
    "printTreatment",
    "sourceNoteChecked",
    "facePageChecked",
    "annotationChecked",
    "declassificationNotes",
    "compilerNotes",
    "sequence",
    "date",
    "type",
    "selectionTier",
    "selectionScore",
    "actualConversationPages",
    "phaseLabel",
    "title",
    "selectionReasons",
    "topTopics",
    "topAuthorities",
    "annotationPrompt",
    "sourceNoteReviewStatus",
    "sourceNoteFlags",
    "facePageStatus",
    "facePageMissingFields",
    "subject",
    "dateTimePlace",
    "notetaker",
    "interpreter",
    "classificationMarking",
    "sourceNoteDraftForReview",
    "packetPages",
    "actualConversationPacketPages",
    "sourcePdfPages",
    "markerPage",
    "provenanceSheetPacketPage",
    "pddReferences",
    "publicPapers",
    "sourceCopies",
    "strobeContext",
    "naraSupport",
    "nextActions",
    "pdfUrl",
    "sourcePacketUrl",
    "baseFrusSourceNote"
  ];
  const body = rows.map((row) => {
    const values = {
      ...row,
      pddReferences: row.pddReferences.length,
      publicPapers: row.publicSameDay.length + row.publicNearby.length,
      sourceCopies: row.sourceCopies.length,
      strobeContext: row.strobeContext.length,
      naraSupport: row.naraSupport.length
    };
    return fields.map((field) => csvCell(values[field])).join(",");
  });
  fs.writeFileSync(path.join(REPORTS_DIR, "draft-spine-worksheet.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function summaryCards(summary) {
  const rows = [
    ["Docs", summary.documents],
    ["Pages", summary.pages],
    ["Tier 1", summary.tierOne],
    ["Tier 2", summary.tierTwo],
    ["Source-Note Review", summary.sourceNoteReview],
    ["Face-Page Review", summary.facePageReview],
    ["Heavy Annotation", summary.heavyAnnotation],
    ["PDD Refs", summary.rowsWithPdd],
    ["Public Papers", summary.rowsWithPublicPapers],
    ["Source Copies", summary.rowsWithSourceCopies]
  ];
  return rows.map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`).join("\n");
}

function checkboxList(items) {
  return items.map((item) => `<span>[ ] ${htmlCell(item)}</span>`).join(" ");
}

function worksheetCards(rows) {
  return rows
    .map(
      (row) => `<article class="worksheet-card">
        <header>
          <p class="meta">#${htmlCell(row.spineOrder)} / Seq. ${htmlCell(row.sequence)} / ${htmlCell(row.date)} / ${htmlCell(row.type)} / ${htmlCell(row.selectionTier)} / ${htmlCell(row.actualConversationPages)} pp.</p>
          <h2>${row.pdfUrl ? htmlLink(row.title, row.pdfUrl) : htmlCell(row.title)}</h2>
          <p>${htmlCell(row.phaseLabel)}. ${htmlCell(row.selectionReasons.join("; "))}</p>
        </header>
        <div class="decision-grid">
          <div><strong>Compiler Decision</strong>${checkboxList(["include", "excerpt", "editorial note", "background", "drop"])}</div>
          <div><strong>Production Checks</strong>${checkboxList(["source note", "face page", "annotation", "declass/excisions"])}</div>
        </div>
        <dl class="details">
          <div><dt>Packet Pages</dt><dd>${htmlCell(row.packetPages)}; conversation ${htmlCell(row.actualConversationPacketPages)}; provenance sheet ${htmlCell(row.provenanceSheetPacketPage || "check")}</dd></div>
          <div><dt>Source Pages</dt><dd>${htmlCell(row.sourcePdfPages)}; marker ${htmlCell(row.markerPage || "check")}; ${row.sourcePacketUrl ? htmlLink("source packet", row.sourcePacketUrl) : "source packet"}</dd></div>
          <div><dt>Source Note Flags</dt><dd>${htmlCell(row.sourceNoteReviewStatus)}${row.sourceNoteFlags.length ? `: ${htmlCell(row.sourceNoteFlags.join("; "))}` : ""}</dd></div>
          <div><dt>Face Page Flags</dt><dd>${htmlCell(row.facePageStatus)}${row.facePageMissingFields.length ? `: ${htmlCell(row.facePageMissingFields.join("; "))}` : ""}</dd></div>
          <div><dt>Meeting/Call Metadata</dt><dd>${htmlCell(row.subject)} ${htmlCell(row.dateTimePlace)} ${htmlCell(row.notetaker ? `Notetaker: ${row.notetaker}.` : "")} ${htmlCell(row.interpreter ? `Interpreter: ${row.interpreter}.` : "")}</dd></div>
          <div><dt>Annotation Prompt</dt><dd>${htmlCell(row.annotationPrompt)}</dd></div>
          <div><dt>Topics</dt><dd>${htmlCell(row.topTopics.join("; "))}</dd></div>
          <div><dt>Authorities</dt><dd>${htmlCell(row.topAuthorities.join("; "))}</dd></div>
          <div><dt>Companion Controls</dt><dd>${htmlCell(row.pddReferences.length)} PDD; ${htmlCell(row.publicSameDay.length + row.publicNearby.length)} Public Papers; ${htmlCell(row.sourceCopies.length)} source copies; ${htmlCell(row.strobeContext.length)} Strobe; ${htmlCell(row.naraSupport.length)} NARA.</dd></div>
          <div><dt>Next Actions</dt><dd>${htmlCell(row.nextActions)}</dd></div>
        </dl>
        <h3>Source Note Draft For Verification</h3>
        <pre>${htmlCell(compactText(row.sourceNoteDraftForReview, 1600))}</pre>
        <h3>Compiler Notes</h3>
        <div class="blank-lines"></div>
      </article>`
    )
    .join("\n");
}

function buildHtml(report) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Draft Spine Worksheet</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin: 0 0 8px; font-size: clamp(1.35rem, 3vw, 2.05rem); }
      h3 { margin: 18px 0 8px; font-size: 1.05rem; }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; }
      dl.summary dd { font-family: Georgia, "Times New Roman", serif; font-size: 1.32rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .worksheet-card { margin: 18px 0; padding: 18px; background: white; border: 1px solid #d7dedb; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); break-inside: avoid; }
      .meta { margin: 0 0 7px; color: #5b6470; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      .decision-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
      .decision-grid div { padding: 10px; background: #f5f7f8; border: 1px solid #d7dedb; border-radius: 8px; }
      .decision-grid strong { display: block; margin-bottom: 6px; }
      .decision-grid span { display: inline-block; margin-right: 12px; white-space: nowrap; }
      .details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 14px; margin: 12px 0; }
      .details div { padding-bottom: 8px; border-bottom: 1px solid #edf1ef; }
      pre { overflow-x: auto; white-space: pre-wrap; padding: 12px; background: #f6f3ec; border: 1px solid #e0d3bd; border-radius: 8px; }
      .blank-lines { min-height: 74px; background: repeating-linear-gradient(to bottom, transparent 0 27px, #d7dedb 27px 28px); }
      @media (max-width: 760px) { dl.summary, .decision-grid, .details { grid-template-columns: 1fr; } }
      @media print {
        body { background: white; }
        main { width: auto; padding: 0; }
        .actions, main > p, .note { display: none; }
        .worksheet-card { box-shadow: none; page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Draft Spine Worksheet</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This print-and-spreadsheet worksheet joins the 16-document draft spine to source-note drafts, face-page flags, annotation prompts, companion-source counts, packet pages, and blank compiler decision fields.</p>
      <div class="actions">
        <a href="draft-spine-worksheet.csv">Download worksheet CSV</a>
        <a href="draft-spine-worksheet.json">Open worksheet JSON</a>
        <a href="draft-selection-spine.html">Open draft spine</a>
        <a href="provisional-document-list.html">Open provisional document list</a>
        <a href="compiler-next-actions.html">Open next-action queue</a>
        <a href="source-note-drafts.html">Open source-note drafts</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
      </div>
      <p class="note">Blank checkbox fields are intentional: they are for compiler decisions, not generated claims.</p>
      <dl class="summary">${summaryCards(report.summary)}</dl>
      ${worksheetCards(report.rows)}
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    spine: readJson(path.join(REPORTS_DIR, "draft-selection-spine.json")),
    sourceDrafts: readJson(path.join(REPORTS_DIR, "source-note-drafts.json")),
    sourceElements: readJson(path.join(REPORTS_DIR, "source-note-element-audit.json")),
    facePages: readJson(path.join(REPORTS_DIR, "face-page-metadata.json")),
    annotation: readJson(path.join(REPORTS_DIR, "annotation-workbench.json")),
    dossier: readJson(path.join(REPORTS_DIR, "contact-dossier-crosswalk.json")),
    manifest: readJson(path.join(REPORTS_DIR, "reading-packet-manifest.json")),
    readiness: readJson(path.join(REPORTS_DIR, "production-readiness-checklist.json")),
    nextActions: readJson(path.join(REPORTS_DIR, "compiler-next-actions.json"))
  };
  const rows = buildRows(inputs);
  return {
    generatedAt: new Date().toISOString(),
    scope: "First-pass working worksheet for the nonbinding draft Clinton-Yeltsin document spine.",
    summary: buildSummary(rows),
    rows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "draft-spine-worksheet.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "draft-spine-worksheet.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
