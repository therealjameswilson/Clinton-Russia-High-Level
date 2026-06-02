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

function priorityWeight(priority) {
  return { P0: 0, P1: 1, P2: 2, P3: 3 }[priority] ?? 9;
}

function tierWeight(tier) {
  if (tier === "Tier 1 - likely core") return 0;
  if (tier === "Tier 2 - strong candidate") return 1;
  if (tier === "Tier 3 - supporting candidate") return 2;
  if (tier === "Tier 4 - concise/confirmatory") return 3;
  if (tier === "Hard source gap") return 0;
  return 9;
}

function taskSort(a, b) {
  return (
    priorityWeight(a.priority) - priorityWeight(b.priority) ||
    workstreamWeight(a.workstream) - workstreamWeight(b.workstream) ||
    tierWeight(a.selectionTier) - tierWeight(b.selectionTier) ||
    String(a.date || "").localeCompare(String(b.date || "")) ||
    Number(a.sequence || 0) - Number(b.sequence || 0) ||
    Number(b.selectionScore || 0) - Number(a.selectionScore || 0) ||
    a.workstream.localeCompare(b.workstream)
  );
}

function workstreamWeight(workstream) {
  return (
    {
      "Hard source follow-up": 0,
      "Draft spine closeout": 1,
      "Tier 2 watchlist decision": 2,
      "Source-note cleanup backlog": 3,
      "Face-page metadata backlog": 4,
      "Annotation backlog": 5
    }[workstream] ?? 9
  );
}

function cleanIssue(issue) {
  return String(issue || "").replace(/\s+\(\d+\)$/, "");
}

function compact(value, maxLength = 220) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
}

function mergeDocumentData(id, maps) {
  const readiness = maps.readiness.get(id) || {};
  const selection = maps.selection.get(id) || {};
  const source = maps.sourceNotes.get(id) || {};
  const gap = maps.gaps.get(id) || {};
  const spine = maps.spine.get(id) || {};
  const watch = maps.watchlist.get(id) || {};
  return {
    id,
    sequence: readiness.sequence ?? selection.sequence ?? source.sequence ?? gap.sequence ?? spine.sequence ?? watch.sequence ?? "",
    date: readiness.date ?? selection.date ?? source.date ?? gap.date ?? spine.date ?? watch.date ?? "",
    type: readiness.type ?? selection.type ?? source.type ?? gap.type ?? spine.type ?? "",
    title: readiness.title ?? selection.title ?? source.title ?? gap.title ?? spine.title ?? watch.title ?? "",
    pages: readiness.actualConversationPages || selection.actualConversationPages || spine.actualConversationPages || watch.pages || "",
    packetPages: readiness.packetPages || source.packetPages || "",
    selectionTier: readiness.selectionTier || selection.selectionTier || spine.selectionTier || watch.tier || "",
    selectionScore: readiness.selectionScore || selection.selectionScore || spine.selectionScore || watch.score || "",
    readinessBucket: readiness.readinessBucket || "",
    sourceNoteStatus: readiness.sourceNoteStatus || source.sourceNoteReviewStatus || "",
    sourceNoteFlags: readiness.sourceNoteFlags || source.sourceNoteFlags || [],
    facePageStatus: readiness.facePageStatus || source.facePageStatus || "",
    facePageMissingFields: readiness.facePageMissingFields || source.facePageMissingFields || [],
    annotationTreatment: readiness.annotationTreatment || selection.annotationTreatment || spine.annotationTreatment || "",
    dominantIssues: readiness.dominantIssues || selection.dominantIssues || spine.dominantIssues || [],
    derivativePdfUrl: readiness.derivativePdfUrl || selection.pdfUrl || source.derivativePdfUrl || spine.pdfUrl || watch.pdfUrl || "",
    sourcePacketUrl: readiness.sourcePacketUrl || selection.sourcePacketUrl || source.sourcePacketUrl || gap.sourcePacketUrl || spine.sourcePacketUrl || "",
    sourcePdfPages: readiness.sourcePdfPages || selection.sourcePdfPages || source.sourcePdfPages || gap.sourcePdfPages || "",
    sourceFamily: source.sourceFamily || "",
    reviewBucket: source.reviewBucket || "",
    nextAction: readiness.nextAction || source.nextAction || gap.nextAction || selection.decisionRemaining || ""
  };
}

function createTask(task, maps) {
  const row = mergeDocumentData(task.id, maps);
  return {
    taskId: task.taskId,
    priority: task.priority,
    workstream: task.workstream,
    action: task.action,
    why: task.why,
    blockingIssue: task.blockingIssue || "",
    ...row,
    reportLinks: task.reportLinks || []
  };
}

function countBy(rows, labelFor) {
  const counts = new Map();
  for (const row of rows) {
    const label = labelFor(row) || "Unspecified";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildTasks(inputs) {
  const maps = {
    readiness: byId(inputs.readiness.rows),
    selection: byId(inputs.selection.rows),
    sourceNotes: byId(inputs.sourceNotes.rows),
    gaps: byId(inputs.gaps.rows),
    spine: byId(inputs.spine.rows),
    watchlist: byId(inputs.spine.watchlistRows)
  };
  const spineIds = new Set(inputs.spine.rows.map((row) => row.id));
  const watchlistIds = new Set(inputs.spine.watchlistRows.map((row) => row.id));
  const tasks = [];

  for (const row of inputs.gaps.rows) {
    tasks.push(
      createTask(
        {
          taskId: `hard-gap-${row.id}`,
          id: row.id,
          priority: "P0",
          workstream: "Hard source follow-up",
          action: row.nextAction || "Locate released actual conversation pages before document selection.",
          why: `${row.gapClass}; ${row.requestTarget}`,
          blockingIssue: row.currentFinding,
          reportLinks: ["hard-source-gap-packet.html", "compiler-start-here.html"]
        },
        maps
      )
    );
  }

  for (const row of inputs.spine.rows) {
    const sourceNote = row.sourceNoteStatus === "Needs source-note review";
    const facePage = row.facePageStatus === "Review fields";
    const flags = [
      sourceNote ? "source-note review" : "",
      facePage ? "face-page fields" : "",
      row.annotationTreatment === "Heavy annotation review" ? "heavy annotation review" : ""
    ].filter(Boolean);
    tasks.push(
      createTask(
        {
          taskId: `spine-closeout-${row.id}`,
          id: row.id,
          priority: row.selectionTier === "Tier 1 - likely core" ? "P0" : "P1",
          workstream: "Draft spine closeout",
          action:
            "Read the derivative PDF, verify source-note/face-page addenda, capture annotation hooks, and make the include/excerpt/background call.",
          why: `Draft spine document; ${row.selectionReasons.join("; ")}${flags.length ? `; close ${flags.join(", ")}` : ""}.`,
          reportLinks: ["draft-selection-spine.html", "source-note-element-audit.html", "face-page-metadata.html"]
        },
        maps
      )
    );
  }

  for (const row of inputs.spine.watchlistRows) {
    tasks.push(
      createTask(
        {
          taskId: `watchlist-${row.id}`,
          id: row.id,
          priority: "P1",
          workstream: "Tier 2 watchlist decision",
          action: "Compare against the draft spine and decide whether to add, swap, excerpt, or hold for annotation/background use.",
          why: row.reason,
          reportLinks: ["draft-selection-spine.html", "selection-priority-workbench.html", "thematic-selection-matrix.html"]
        },
        maps
      )
    );
  }

  for (const row of inputs.readiness.rows) {
    if (row.sourceNoteStatus === "Needs source-note review" && !spineIds.has(row.id)) {
      tasks.push(
        createTask(
          {
            taskId: `source-note-${row.id}`,
            id: row.id,
            priority: /Tier 2/.test(row.selectionTier) || watchlistIds.has(row.id) ? "P2" : "P3",
            workstream: "Source-note cleanup backlog",
            action: "Verify source-note elements and OCR-derived face-page addenda against the derivative PDF.",
            why: `Source-note flags: ${(row.sourceNoteFlags || []).join("; ") || "needs compiler review"}.`,
            reportLinks: ["source-note-element-audit.html", "source-note-drafts.html", "production-readiness-checklist.html"]
          },
          maps
        )
      );
    }

    if (row.facePageStatus === "Review fields" && !spineIds.has(row.id)) {
      tasks.push(
        createTask(
          {
            taskId: `face-page-${row.id}`,
            id: row.id,
            priority: /Tier 2/.test(row.selectionTier) || watchlistIds.has(row.id) ? "P2" : "P3",
            workstream: "Face-page metadata backlog",
            action: "Review first-page metadata and fill any missing participants, classification, notetaker, interpreter, or date/time/place fields.",
            why: `Face-page gaps: ${(row.facePageMissingFields || []).join("; ") || "review fields"}.`,
            reportLinks: ["face-page-metadata.html", "source-note-element-audit.html"]
          },
          maps
        )
      );
    }

    if (
      row.annotationTreatment === "Heavy annotation review" &&
      !spineIds.has(row.id) &&
      !watchlistIds.has(row.id) &&
      row.readinessBucket !== "Hard source gap"
    ) {
      tasks.push(
        createTask(
          {
            taskId: `annotation-${row.id}`,
            id: row.id,
            priority: /Tier 2/.test(row.selectionTier) ? "P2" : "P3",
            workstream: "Annotation backlog",
            action: "Capture authorities, issue hooks, and possible editorial-note use before final pruning.",
            why: `Heavy annotation row outside the draft spine; dominant issues: ${(row.dominantIssues || []).map(cleanIssue).join("; ")}.`,
            reportLinks: ["annotation-workbench.html", "topic-index.html", "contact-dossier-crosswalk.html"]
          },
          maps
        )
      );
    }
  }

  return tasks.sort(taskSort);
}

function sourceNoteBatches(readinessRows, sourceRows) {
  const readinessById = byId(readinessRows);
  const flagged = sourceRows.filter((row) => row.sourceNoteReviewStatus === "Needs source-note review");
  return {
    byFlag: countBy(
      flagged.flatMap((row) => (row.sourceNoteFlags || []).map((flag) => ({ flag }))),
      (row) => row.flag
    ),
    byFamily: countBy(flagged, (row) => row.sourceFamily),
    byTier: countBy(flagged, (row) => readinessById.get(row.id)?.selectionTier || "Unscored")
  };
}

function facePageBatches(readinessRows) {
  const rows = readinessRows.filter((row) => row.facePageStatus === "Review fields");
  return {
    byMissingField: countBy(
      rows.flatMap((row) => (row.facePageMissingFields || []).map((field) => ({ field }))),
      (row) => row.field
    ),
    byTier: countBy(rows, (row) => row.selectionTier || "Unscored")
  };
}

function buildSummary(tasks, inputs) {
  const uniqueDocs = new Set(tasks.map((task) => task.id));
  const dayOne = tasks.filter((task) => ["P0", "P1"].includes(task.priority));
  return {
    totalTasks: tasks.length,
    uniqueDocuments: uniqueDocs.size,
    dayOneTasks: dayOne.length,
    hardGapTasks: tasks.filter((task) => task.workstream === "Hard source follow-up").length,
    draftSpineTasks: tasks.filter((task) => task.workstream === "Draft spine closeout").length,
    watchlistTasks: tasks.filter((task) => task.workstream === "Tier 2 watchlist decision").length,
    sourceNoteBacklogTasks: tasks.filter((task) => task.workstream === "Source-note cleanup backlog").length,
    facePageBacklogTasks: tasks.filter((task) => task.workstream === "Face-page metadata backlog").length,
    annotationBacklogTasks: tasks.filter((task) => task.workstream === "Annotation backlog").length,
    draftSpinePages: inputs.spine.summary.selectedActualPages,
    fullCountedPages: inputs.readiness.summary.actualConversationPages,
    p0Tasks: tasks.filter((task) => task.priority === "P0").length,
    p1Tasks: tasks.filter((task) => task.priority === "P1").length,
    p2Tasks: tasks.filter((task) => task.priority === "P2").length,
    p3Tasks: tasks.filter((task) => task.priority === "P3").length
  };
}

function writeCsv(tasks) {
  const fields = [
    "priority",
    "workstream",
    "sequence",
    "date",
    "type",
    "selectionTier",
    "selectionScore",
    "pages",
    "title",
    "action",
    "why",
    "blockingIssue",
    "sourceNoteStatus",
    "sourceNoteFlags",
    "facePageStatus",
    "facePageMissingFields",
    "annotationTreatment",
    "readinessBucket",
    "dominantIssues",
    "packetPages",
    "sourcePdfPages",
    "derivativePdfUrl",
    "sourcePacketUrl",
    "reportLinks"
  ];
  const body = tasks.map((row) => fields.map((field) => csvCell(row[field])).join(","));
  fs.writeFileSync(path.join(REPORTS_DIR, "compiler-next-actions.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function writeFrontendData(report) {
  const payload = {
    generatedAt: report.generatedAt,
    summary: report.summary,
    dayOneTasks: report.tasks
      .filter((task) => ["P0", "P1"].includes(task.priority))
      .slice(0, 10)
      .map((task) => ({
        priority: task.priority,
        workstream: task.workstream,
        sequence: task.sequence,
        date: task.date,
        type: task.type,
        selectionTier: task.selectionTier,
        pages: task.pages,
        title: task.title,
        action: task.action,
        why: task.why,
        derivativePdfUrl: task.derivativePdfUrl,
        sourcePacketUrl: task.sourcePacketUrl,
        reportLinks: task.reportLinks
      })),
    sourceNoteBatches: {
      byFlag: report.sourceNoteBatches.byFlag.slice(0, 5)
    },
    facePageBatches: {
      byMissingField: report.facePageBatches.byMissingField.slice(0, 5)
    }
  };
  fs.writeFileSync(
    path.join(ROOT, "data", "compiler-next-actions.js"),
    `window.COMPILER_NEXT_ACTIONS = ${JSON.stringify(payload, null, 2)};\n`
  );
}

function summaryCards(summary) {
  const rows = [
    ["Tasks", summary.totalTasks],
    ["Documents", summary.uniqueDocuments],
    ["Day-One Tasks", summary.dayOneTasks],
    ["Hard Gaps", summary.hardGapTasks],
    ["Spine Docs", summary.draftSpineTasks],
    ["Watchlist", summary.watchlistTasks],
    ["Source-Note Backlog", summary.sourceNoteBacklogTasks],
    ["Face-Page Backlog", summary.facePageBacklogTasks],
    ["Annotation Backlog", summary.annotationBacklogTasks],
    ["Spine Pages", summary.draftSpinePages],
    ["Full Pages", summary.fullCountedPages],
    ["P0 / P1", `${summary.p0Tasks} / ${summary.p1Tasks}`]
  ];
  return rows.map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`).join("\n");
}

function batchTable(rows) {
  if (!rows.length) return "<p class=\"note\">No rows in this batch.</p>";
  return `<table><thead><tr><th>Batch</th><th>Rows</th></tr></thead><tbody>${rows
    .map((row) => `<tr><td>${htmlCell(row.label)}</td><td>${htmlCell(row.count)}</td></tr>`)
    .join("\n")}</tbody></table>`;
}

function taskRows(rows) {
  return rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.priority)}</td>
        <td>${htmlCell(row.workstream)}</td>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.selectionTier)}</td>
        <td>${htmlCell(row.pages)}</td>
        <td>${row.derivativePdfUrl ? htmlLink(row.title, row.derivativePdfUrl) : htmlCell(row.title)}</td>
        <td>${htmlCell(row.action)}<br><span>${htmlCell(row.why)}</span></td>
        <td>${htmlCell(compact(row.blockingIssue || row.nextAction, 260))}</td>
        <td>${htmlCell(row.reportLinks.join("; "))}</td>
      </tr>`
    )
    .join("\n");
}

function buildHtml(report) {
  const dayOneRows = report.tasks.filter((task) => ["P0", "P1"].includes(task.priority));
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Compiler Next Actions</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f7f8; }
      main { width: min(1320px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.65rem); }
      h2 { margin-top: 34px; font-size: clamp(1.45rem, 3vw, 2.15rem); }
      h3 { margin: 0 0 10px; font-size: 1.1rem; }
      a { color: #243d63; font-weight: 800; }
      .lede { max-width: 980px; color: #5b6470; font-size: 1.04rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #243d63; border-radius: 6px; }
      .actions a:nth-child(even) { color: #243d63; background: white; border: 1px solid #d7dedb; }
      dl.summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      dl.summary div, .batch-card { padding: 13px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5b6470; font-size: .76rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.28rem; font-weight: 800; }
      .note { max-width: 980px; padding: 12px 14px; background: #eef7f2; border: 1px solid #bdd6c9; border-radius: 8px; color: #335849; }
      .workflow { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0 26px; }
      .workflow div { padding: 13px; background: white; border-left: 5px solid #8c3b3f; border-radius: 8px; }
      .workflow strong { display: block; margin-bottom: 4px; color: #243d63; }
      .batch-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td { min-width: 90px; }
      td:nth-child(1), td:nth-child(3), td:nth-child(7) { text-align: right; white-space: nowrap; }
      td:nth-child(8) { min-width: 260px; }
      td:nth-child(9), td:nth-child(10) { min-width: 320px; }
      span { color: #687483; font-size: .9em; }
      @media (max-width: 980px) { dl.summary, .workflow, .batch-grid { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
      @media (max-width: 680px) { dl.summary, .workflow, .batch-grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Compiler Next Actions</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This board converts the source-note, face-page, hard-gap, annotation, and selection reports into a prioritized production queue for the Clinton-Yeltsin chronology.</p>
      <div class="actions">
        <a href="compiler-next-actions.csv">Download task CSV</a>
        <a href="compiler-next-actions.json">Open task JSON</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="draft-selection-spine.html">Open draft selection spine</a>
        <a href="draft-spine-worksheet.html">Open spine worksheet</a>
        <a href="provisional-document-list.html">Open provisional document list</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
        <a href="hard-source-gap-packet.html">Open hard-gap packet</a>
        <a href="source-note-element-audit.html">Open source-note elements</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="annotation-workbench.html">Open annotation workbench</a>
      </div>
      <p class="note">Priority does not decide final FRUS inclusion. It orders work that would unlock the most compiler value fastest: missing source text, spine closeout, Tier 2 swaps, and then reusable source-note/face-page cleanup batches.</p>
      <dl class="summary">${summaryCards(report.summary)}</dl>
      <section class="workflow" aria-label="Suggested workflow">
        <div><strong>1. Source Text</strong>Clear the six hard gaps or keep them explicitly uncounted.</div>
        <div><strong>2. Spine Closeout</strong>Read and production-check the 16 draft-spine documents.</div>
        <div><strong>3. Watchlist Calls</strong>Decide the 12 Tier 2 alternates: add, swap, excerpt, or background.</div>
        <div><strong>4. Batch Cleanup</strong>Work source-note and face-page flags by repeated field type.</div>
      </section>
      <h2>Day-One Queue</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Priority</th><th>Workstream</th><th>Seq</th><th>Date</th><th>Type</th><th>Tier</th><th>Pages</th><th>Document</th><th>Action / why</th><th>Blocker or current note</th><th>Reports</th></tr></thead>
          <tbody>${taskRows(dayOneRows)}</tbody>
        </table>
      </div>
      <h2>Cleanup Batches</h2>
      <div class="batch-grid">
        <div class="batch-card"><h3>Source-Note Flags</h3>${batchTable(report.sourceNoteBatches.byFlag)}</div>
        <div class="batch-card"><h3>Source Families</h3>${batchTable(report.sourceNoteBatches.byFamily)}</div>
        <div class="batch-card"><h3>Face-Page Gaps</h3>${batchTable(report.facePageBatches.byMissingField)}</div>
      </div>
      <h2>Full Task List</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Priority</th><th>Workstream</th><th>Seq</th><th>Date</th><th>Type</th><th>Tier</th><th>Pages</th><th>Document</th><th>Action / why</th><th>Blocker or current note</th><th>Reports</th></tr></thead>
          <tbody>${taskRows(report.tasks)}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    readiness: readJson(path.join(REPORTS_DIR, "production-readiness-checklist.json")),
    selection: readJson(path.join(REPORTS_DIR, "selection-priority-workbench.json")),
    sourceNotes: readJson(path.join(REPORTS_DIR, "source-note-element-audit.json")),
    gaps: readJson(path.join(REPORTS_DIR, "hard-source-gap-packet.json")),
    spine: readJson(path.join(REPORTS_DIR, "draft-selection-spine.json"))
  };
  const tasks = buildTasks(inputs);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Prioritized next-action board for compiler work on direct Clinton-Yeltsin memcons/telcons in FRUS 1993-2000, Volume XVIII.",
    summary: buildSummary(tasks, inputs),
    sourceNoteBatches: sourceNoteBatches(inputs.readiness.rows, inputs.sourceNotes.rows),
    facePageBatches: facePageBatches(inputs.readiness.rows),
    tasks
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "compiler-next-actions.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.tasks);
fs.writeFileSync(path.join(REPORTS_DIR, "compiler-next-actions.html"), buildHtml(report));
writeFrontendData(report);
console.log(JSON.stringify(report.summary, null, 2));
