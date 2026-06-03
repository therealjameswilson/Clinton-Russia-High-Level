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

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    (a.documentTitle || a.title).localeCompare(b.documentTitle || b.title)
  );
}

function coreContacts(records) {
  return records
    .filter(
      (record) =>
        record.chapter?.name === "Clinton-Yeltsin Chronology" &&
        (record.type === "Memcon" || record.type === "Telcon") &&
        record.potentialFrusDocument !== false
    )
    .sort(chronologySort);
}

function byId(rows = []) {
  return new Map(rows.map((row) => [row.id, row]));
}

function matchOne(text, regex) {
  const match = String(text || "").match(regex);
  return match ? match[1].trim().replace(/[.;,]+$/, "") : "";
}

function matchAll(text, regex) {
  return [...String(text || "").matchAll(regex)].map((match) => match[1].trim().replace(/[.;,]+$/, ""));
}

function parseElements(sourceNote) {
  const releaseIds = matchAll(sourceNote, /\b([12][0-9]{3}-[0-9]{4}-M(?:-[A-Za-z0-9]+)?)\b/g);
  return {
    hasRepository: /William J\. Clinton Presidential Library|Clinton Library/i.test(sourceNote),
    hasClintonPresidentialRecords: /Clinton Presidential Records/i.test(sourceNote),
    hasNscRmoCollection: /Records of the National Security Council Records Management Office/i.test(sourceNote),
    hasDepartmentOfState: /Department of State/i.test(sourceNote),
    hasFoiaVirtualReadingRoom: /FOIA Virtual Reading Room/i.test(sourceNote),
    hasStrobeTalbottFoia: /Strobe Talbott FOIA/i.test(sourceNote),
    hasClintonDigitalLibraryItem: /Clinton Digital Library item/i.test(sourceNote),
    hasParentCollectionNaid: /NAID 7388808/.test(sourceNote),
    hasPrsSeriesNaid: /NAID 7585721/.test(sourceNote),
    documentId: matchOne(sourceNote, /\bDocument ID ([A-Za-z0-9-]+)/i),
    originalOaId: matchOne(sourceNote, /Original OA\/ID ([A-Za-z0-9-]+)/i),
    oaBoxNumber: matchOne(sourceNote, /OA\/Box Number ([^,]+)/i),
    folderRecordId: matchOne(sourceNote, /Folder Title\/Record ID ([^,]+)/i),
    mdrCase: matchOne(sourceNote, /Mandatory Declassification Review ([^,.;]+)/i),
    catalogItem: matchOne(sourceNote, /National Archives Catalog item ([^,.;]+)/i),
    clintonDigitalLibraryItems: matchAll(sourceNote, /Clinton Digital Library item ([A-Za-z0-9-]+)/gi),
    foiaCase: matchOne(sourceNote, /case (F-[0-9-]+)/i),
    foiaDocument: matchOne(sourceNote, /document (C[0-9]+)/i),
    foiaRequest: matchOne(sourceNote, /Freedom of Information Act request ([^,.;]+)/i),
    releaseIds,
    naids: matchAll(sourceNote, /\bNAID ([0-9]+)/gi)
  };
}

function sourceFamily(row, record, elements) {
  if (row.status === "pending") return "Pending source text";
  if (elements.hasDepartmentOfState || elements.hasStrobeTalbottFoia) return "Department of State FOIA/Strobe";
  if (elements.hasClintonDigitalLibraryItem) return "Clinton Digital Library item";
  if (elements.catalogItem) return "NARA Catalog item";
  if (elements.mdrCase) return "Clinton Library MDR";
  if (elements.foiaRequest) return "Clinton Library FOIA request";
  if (/clintonlibrary\.gov/i.test(row.sourcePacketUrl || record.source?.pdfUrl || "")) return "Clinton Library packet";
  return "Unclassified source family";
}

function hasIdentifier(row) {
  return Boolean(
    row.elements.documentId ||
      row.elements.originalOaId ||
      row.elements.folderRecordId ||
      row.elements.oaBoxNumber ||
      row.elements.foiaDocument ||
      row.elements.clintonDigitalLibraryItems.length
  );
}

function familyChecks(row) {
  if (row.sourceFamily === "Department of State FOIA/Strobe") {
    return [
      ["Department of State", row.elements.hasDepartmentOfState],
      ["FOIA Virtual Reading Room", row.elements.hasFoiaVirtualReadingRoom],
      ["Strobe Talbott FOIA", row.elements.hasStrobeTalbottFoia],
      ["FOIA case", Boolean(row.elements.foiaCase)],
      ["document number", Boolean(row.elements.foiaDocument)]
    ];
  }
  if (row.sourceFamily === "Clinton Digital Library item") {
    return [
      ["repository", row.elements.hasRepository],
      ["Clinton Digital Library item", row.elements.hasClintonDigitalLibraryItem && row.elements.clintonDigitalLibraryItems.length > 0],
      ["release/item identifier", row.elements.releaseIds.length > 0 || row.elements.naids.length > 0],
      ["collection or records stem", row.elements.hasClintonPresidentialRecords || /Memcons|Telcons|NSC Cable/i.test(row.frusSourceNote)]
    ];
  }
  if (row.sourceFamily === "NARA Catalog item") {
    return [
      ["repository", row.elements.hasRepository],
      ["Clinton Presidential Records", row.elements.hasClintonPresidentialRecords],
      ["NSC RMO collection", row.elements.hasNscRmoCollection],
      ["parent NAID 7388808", row.elements.hasParentCollectionNaid],
      ["PRS series NAID 7585721", row.elements.hasPrsSeriesNaid],
      ["catalog item", Boolean(row.elements.catalogItem)],
      ["item NAID", row.elements.naids.some((naid) => naid !== "7388808" && naid !== "7585721")]
    ];
  }
  if (row.sourceFamily === "Clinton Library FOIA request") {
    return [
      ["repository", row.elements.hasRepository],
      ["Clinton Presidential Records", row.elements.hasClintonPresidentialRecords],
      ["NSC RMO collection", row.elements.hasNscRmoCollection],
      ["parent NAID 7388808", row.elements.hasParentCollectionNaid],
      ["PRS series NAID 7585721", row.elements.hasPrsSeriesNaid],
      ["FOIA request", Boolean(row.elements.foiaRequest)],
      ["box/folder identifier", Boolean(row.elements.folderRecordId || row.elements.oaBoxNumber)]
    ];
  }
  return [
    ["repository", row.elements.hasRepository],
    ["Clinton Presidential Records", row.elements.hasClintonPresidentialRecords],
    ["NSC RMO collection", row.elements.hasNscRmoCollection],
    ["parent NAID 7388808", row.elements.hasParentCollectionNaid],
    ["PRS series NAID 7585721", row.elements.hasPrsSeriesNaid],
    ["MDR case", Boolean(row.elements.mdrCase)],
    ["box/folder/document identifier", hasIdentifier(row)]
  ];
}

function elementChecklist(row) {
  const checks = [
    ...familyChecks(row),
    ["formal source-note draft excludes page maps", row.status === "pending" ? true : row.formalDraftHasNoWorkingPageMap],
    ["working provenance separated", row.status === "pending" ? true : Boolean(row.workingProvenanceForAudit)],
    ["source page map", Boolean(row.sourcePdfPages)],
    ["source packet URL", Boolean(row.sourcePacketUrl)],
    ["derivative PDF", row.status === "counted" ? Boolean(row.derivativePdfUrl) : true]
  ];
  return checks.map(([label, pass]) => `${pass ? "OK" : "CHECK"} ${label}`);
}

function reviewBucket(row) {
  if (row.status === "pending") return "Pending source text";
  if (familyChecks(row).some(([, pass]) => !pass)) return "Citation element verification";
  if (!hasIdentifier(row)) {
    return "Folder/document identifier verification";
  }
  if (row.sourceNoteReviewStatus === "Needs source-note review" || row.facePageStatus === "Review fields") return "Face-page/source-note review";
  return "Citation elements present";
}

function nextAction(row) {
  if (row.reviewBucket === "Pending source text") {
    return "Do not finalize a source note until released conversation pages are found; preserve current lead and source-page problem.";
  }
  if (row.reviewBucket === "Citation element verification") {
    const missing = familyChecks(row)
      .filter(([, pass]) => !pass)
      .map(([label]) => label);
    return `Verify source-family citation elements before final source-note use: ${missing.join("; ")}.`;
  }
  if (row.reviewBucket === "Folder/document identifier verification") {
    return "Verify OA/Box, folder/record ID, document ID, or original OA/ID from the marker page or catalog metadata.";
  }
  if (row.reviewBucket === "Face-page/source-note review") {
    const flags = [...row.sourceNoteFlags, ...row.facePageMissingFields.map((field) => `face-page ${field}`)];
    return `Verify OCR-derived face-page addenda before final source-note use${flags.length ? `: ${flags.join("; ")}` : "."}`;
  }
  return "Citation elements are present; final FRUS style review still belongs with the compiler.";
}

function buildRows(inputs) {
  const sourceNoteById = byId(inputs.sourceNotes.rows);
  const faceById = byId(inputs.facePages.rows);
  const dossierById = byId(inputs.dossier.rows);
  const readinessById = byId(inputs.readiness.rows);
  return coreContacts(inputs.records).map((record, index) => {
    const sourceNote = sourceNoteById.get(record.id) || {};
    const face = faceById.get(record.id) || {};
    const dossier = dossierById.get(record.id) || {};
    const readiness = readinessById.get(record.id) || {};
    const counted = Number.isInteger(record.pageCount);
    const frusSourceNote = record.frusSourceNote || sourceNote.baseFrusSourceNote || dossier.frusSourceNote || "";
    const row = {
      sequence: index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      status: counted ? "counted" : "pending",
      title: record.documentTitle || record.title,
      actualConversationPages: counted ? record.pageCount : "",
      derivativePdfUrl: counted ? siteUrl(record.pdfUrl || dossier.corePdfUrl || readiness.derivativePdfUrl) : "",
      sourcePacketUrl: dossier.sourcePacketUrl || siteUrl(record.source?.pdfUrl || record.catalogUrl || ""),
      sourcePdfPages: record.sourcePdfPages || dossier.sourcePdfPages || "",
      packetPages: dossier.packetPages || sourceNote.packetPages || readiness.packetPages || "",
      markerPage: dossier.markerPage || record.markerPage || "",
      frusSourceNote,
      sourceNoteDraftForReview: sourceNote.sourceNoteDraftForReview || "",
      workingProvenanceForAudit: sourceNote.workingProvenanceForAudit || "",
      sourceNoteReviewStatus: counted ? sourceNote.sourceNoteReviewStatus || "Needs source-note review" : "Pending source text",
      sourceNoteFlags: counted ? sourceNote.reviewFlags || [] : [],
      facePageStatus: counted ? face.reviewStatus || readiness.facePageStatus || "Review fields" : "Pending source text",
      facePageMissingFields: counted ? face.missingFields || readiness.facePageMissingFields || [] : [],
      subject: face.subject || sourceNote.subject || "",
      dateTimePlace: face.dateTimePlace || sourceNote.dateTimePlace || "",
      notetaker: face.notetaker || sourceNote.notetaker || "",
      interpreter: face.interpreter || sourceNote.interpreter || "",
      classificationMarking: face.classification?.marking || sourceNote.classificationMarking || "",
      elements: parseElements(frusSourceNote)
    };
    row.formalDraftHasNoWorkingPageMap = !/Source PDF pages|Compiler packet pages|actual conversation pages|provenance sheet page/i.test(row.sourceNoteDraftForReview);
    row.sourceFamily = sourceFamily(row, record, row.elements);
    row.reviewBucket = reviewBucket(row);
    row.elementChecklist = elementChecklist(row);
    row.nextAction = nextAction(row);
    return row;
  });
}

function buildSummary(rows) {
  return {
    totalContacts: rows.length,
    countedDocuments: rows.filter((row) => row.status === "counted").length,
    pendingDocuments: rows.filter((row) => row.status === "pending").length,
    citationElementsPresent: rows.filter((row) => row.reviewBucket === "Citation elements present").length,
    rowsNeedingFacePageOrSourceNoteReview: rows.filter((row) => row.reviewBucket === "Face-page/source-note review").length,
    pendingSourceTextRows: rows.filter((row) => row.reviewBucket === "Pending source text").length,
    citationElementVerificationRows: rows.filter((row) => row.reviewBucket === "Citation element verification").length,
    identifierVerificationRows: rows.filter((row) => row.reviewBucket === "Folder/document identifier verification").length,
    rowsWithMdrCase: rows.filter((row) => row.elements.mdrCase).length,
    rowsWithCatalogItem: rows.filter((row) => row.elements.catalogItem).length,
    rowsWithDigitalLibraryItem: rows.filter((row) => row.elements.clintonDigitalLibraryItems.length).length,
    rowsWithFoiaCase: rows.filter((row) => row.elements.foiaCase || row.elements.foiaRequest).length,
    rowsWithDocumentOrRecordId: rows.filter((row) => row.elements.documentId || row.elements.folderRecordId || row.elements.originalOaId).length,
    rowsWithSourcePageMap: rows.filter((row) => row.sourcePdfPages).length,
    rowsWithSourcePacketUrl: rows.filter((row) => row.sourcePacketUrl).length,
    countedFormalDraftsWithoutWorkingPageMaps: rows.filter((row) => row.status === "counted" && row.formalDraftHasNoWorkingPageMap).length,
    countedRowsWithSeparatedWorkingProvenance: rows.filter((row) => row.status === "counted" && row.workingProvenanceForAudit).length
  };
}

function writeCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "status",
    "reviewBucket",
    "sourceFamily",
    "title",
    "actualConversationPages",
    "sourcePdfPages",
    "packetPages",
    "markerPage",
    "repository",
    "clintonPresidentialRecords",
    "nscRmoCollection",
    "parentCollectionNaid",
    "prsSeriesNaid",
    "documentId",
    "originalOaId",
    "oaBoxNumber",
    "folderRecordId",
    "mdrCase",
    "catalogItem",
    "digitalLibraryItems",
    "foiaCase",
    "foiaDocument",
    "foiaRequest",
    "releaseIds",
    "naids",
    "sourceNoteReviewStatus",
    "sourceNoteFlags",
    "facePageStatus",
    "facePageMissingFields",
    "subject",
    "dateTimePlace",
    "notetaker",
    "interpreter",
    "classificationMarking",
    "formalDraftHasNoWorkingPageMap",
    "workingProvenanceForAudit",
    "elementChecklist",
    "nextAction",
    "derivativePdfUrl",
    "sourcePacketUrl",
    "frusSourceNote"
  ];
  const body = rows.map((row) => {
    const values = {
      ...row,
      repository: row.elements.hasRepository,
      clintonPresidentialRecords: row.elements.hasClintonPresidentialRecords,
      nscRmoCollection: row.elements.hasNscRmoCollection,
      parentCollectionNaid: row.elements.hasParentCollectionNaid,
      prsSeriesNaid: row.elements.hasPrsSeriesNaid,
      documentId: row.elements.documentId,
      originalOaId: row.elements.originalOaId,
      oaBoxNumber: row.elements.oaBoxNumber,
      folderRecordId: row.elements.folderRecordId,
      mdrCase: row.elements.mdrCase,
      catalogItem: row.elements.catalogItem,
      digitalLibraryItems: row.elements.clintonDigitalLibraryItems,
      foiaCase: row.elements.foiaCase,
      foiaDocument: row.elements.foiaDocument,
      foiaRequest: row.elements.foiaRequest,
      releaseIds: row.elements.releaseIds,
      naids: row.elements.naids
    };
    return fields.map((field) => csvCell(values[field])).join(",");
  });
  fs.writeFileSync(path.join(REPORTS_DIR, "source-note-element-audit.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function statusBadge(value) {
  return value ? "OK" : "CHECK";
}

function elementTable(row) {
  return familyChecks(row)
    .map(([label, ok]) => `<span class="${ok ? "ok" : "check"}">${htmlCell(statusBadge(ok))}</span> ${htmlCell(label)}`)
    .join("<br>");
}

function buildHtml(report) {
  const summaryRows = [
    ["Contacts", report.summary.totalContacts],
    ["Counted", report.summary.countedDocuments],
    ["Pending", report.summary.pendingDocuments],
    ["Ready", report.summary.citationElementsPresent],
    ["Face/Note Review", report.summary.rowsNeedingFacePageOrSourceNoteReview],
    ["MDR Cases", report.summary.rowsWithMdrCase],
    ["Catalog Items", report.summary.rowsWithCatalogItem],
    ["Digital Items", report.summary.rowsWithDigitalLibraryItem],
    ["FOIA", report.summary.rowsWithFoiaCase],
    ["IDs", report.summary.rowsWithDocumentOrRecordId],
    ["Clean Drafts", report.summary.countedFormalDraftsWithoutWorkingPageMaps],
    ["Separated Provenance", report.summary.countedRowsWithSeparatedWorkingProvenance]
  ]
    .map(([label, value]) => `<div><dt>${htmlCell(label)}</dt><dd>${htmlCell(value)}</dd></div>`)
    .join("\n");

  const rows = report.rows
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.reviewBucket)}<br><span>${htmlCell(row.sourceFamily)}</span></td>
        <td>${row.derivativePdfUrl ? htmlLink(row.title, row.derivativePdfUrl) : htmlCell(row.title)}</td>
        <td>${elementTable(row)}</td>
        <td>${htmlCell(row.elements.mdrCase || row.elements.catalogItem || "")}<br><span>${htmlCell(row.elements.documentId || row.elements.folderRecordId || row.elements.originalOaId || row.elements.oaBoxNumber || "")}</span></td>
        <td>${htmlCell(row.sourcePdfPages)}<br><span>${row.sourcePacketUrl ? htmlLink("source packet", row.sourcePacketUrl) : ""}</span></td>
        <td>${htmlCell(row.sourceNoteReviewStatus)}${row.sourceNoteFlags.length ? `<br><span>${htmlCell(row.sourceNoteFlags.join("; "))}</span>` : ""}</td>
        <td>${htmlCell(row.facePageStatus)}${row.facePageMissingFields.length ? `<br><span>${htmlCell(row.facePageMissingFields.join("; "))}</span>` : ""}</td>
        <td>${htmlCell(row.nextAction)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Source-Note Element Audit</title>
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
      .note { max-width: 980px; padding: 12px 14px; background: #fffaf0; border: 1px solid #ead8aa; border-radius: 8px; color: #645233; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #243d63; font-size: .76rem; text-transform: uppercase; white-space: nowrap; }
      td:nth-child(1), td:nth-child(8) { text-align: right; white-space: nowrap; }
      td:nth-child(5) { min-width: 250px; }
      span { color: #687483; font-size: .9em; }
      .ok { color: #2f675f; font-weight: 900; }
      .check { color: #9a5a00; font-weight: 900; }
      @media (max-width: 900px) { dl.summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Source-Note Element Audit</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)}. This audit breaks every direct Clinton-Yeltsin memcon/telcon source note into checkable elements: repository stem, collection and series NAIDs, release authority, folder/document identifiers, formal source-note draft, separated working provenance, derivative PDF, face-page review flags, and the next source-note action.</p>
      <div class="actions">
        <a href="source-note-element-audit.csv">Download element CSV</a>
        <a href="source-note-element-audit.json">Open element JSON</a>
        <a href="source-note-drafts.html">Open source-note drafts</a>
        <a href="face-page-metadata.html">Open face-page audit</a>
        <a href="production-readiness-checklist.html">Open production checklist</a>
        <a href="compiler-start-here.html">Open start-here packet</a>
        <a href="https://history.state.gov/historicaldocuments/frus1989-92v31/ch1">Compare FRUS source notes</a>
      </div>
      <p class="note">Published FRUS notes put the repository/file path first, then classification and document-production notes. This report therefore checks that page maps, packet ranges, marker pages, and provenance-sheet locations stay outside the formal source-note draft and remain in separate working-provenance fields.</p>
      <dl class="summary">${summaryRows}</dl>
      <h2>Element Queue</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Bucket</th><th>Document</th><th>Elements</th><th>Authority / ID</th><th>Pages</th><th>Source note</th><th>Face page</th><th>Next action</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const inputs = {
    records: readJson(path.join(ROOT, "data", "memcons.json")),
    sourceNotes: readJson(path.join(REPORTS_DIR, "source-note-drafts.json")),
    facePages: readJson(path.join(REPORTS_DIR, "face-page-metadata.json")),
    dossier: readJson(path.join(REPORTS_DIR, "contact-dossier-crosswalk.json")),
    readiness: readJson(path.join(REPORTS_DIR, "production-readiness-checklist.json"))
  };
  const rows = buildRows(inputs);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Source-note element audit for direct Clinton-Yeltsin memcons/telcons in the FRUS 1993-2000, Volume XVIII compiler packet.",
    warning:
      "Element checks are mechanical. Final FRUS source-note style and archival citation judgment remain compiler tasks.",
    publishedFrusStandardModel: {
      pattern:
        "Repository and file path first; classification marking next; drafting, clearance, meeting-place, delivery, or editorial notes after the classification sentence.",
      workingProvenanceRule:
        "Source PDF pages, compiler packet pages, derivative packet ranges, marker pages, and provenance-sheet locations are working controls and should not be folded into the formal source-note draft.",
      officialExamples: [
        "https://history.state.gov/historicaldocuments/frus1989-92v31/ch1",
        "https://history.state.gov/historicaldocuments/frus1989-92v31/ch2",
        "https://history.state.gov/historicaldocuments/frus1989-92v31/d73"
      ]
    },
    summary: buildSummary(rows),
    rows
  };
}

const report = buildReport();
fs.writeFileSync(path.join(REPORTS_DIR, "source-note-element-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
writeCsv(report.rows);
fs.writeFileSync(path.join(REPORTS_DIR, "source-note-element-audit.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
