const CHAPTER_ORDER = [
  "Clinton-Yeltsin Chronology",
  "Released Clinton Library Packets",
  "Talbott FOIA Context",
  "NARA Scout Leads"
];

const recordsRoot = document.querySelector("#records-root");
const totalRecords = document.querySelector("#total-records");
const candidateDocuments = document.querySelector("#candidate-documents");
const countedPages = document.querySelector("#counted-pages");
const pendingDocuments = document.querySelector("#pending-documents");
const strobeSources = document.querySelector("#strobe-sources");
const candidateSetCount = document.querySelector("#candidate-set-count");
const candidateCountedCount = document.querySelector("#candidate-counted-count");
const candidatePendingCount = document.querySelector("#candidate-pending-count");
const candidatePageCount = document.querySelector("#candidate-page-count");
const pendingSummary = document.querySelector("#pending-summary");
const pendingList = document.querySelector("#pending-list");
const sourceCopySummary = document.querySelector("#source-copy-summary");
const auditRoot = document.querySelector("#audit-root");
const coverageRoot = document.querySelector("#coverage-root");
const sourceLedgerRoot = document.querySelector("#source-ledger-root");
const frusMethodRoot = document.querySelector("#frus-method-root");
const readinessRoot = document.querySelector("#readiness-root");
const sourceNoteRoot = document.querySelector("#source-note-root");
const searchInput = document.querySelector("#record-search");
const recordsSummary = document.querySelector("#records-summary");
const filterButtons = [...document.querySelectorAll("[data-record-filter]")];
const statusFilter = document.querySelector("#status-filter");
const sourceFilter = document.querySelector("#source-filter");
const yearFilter = document.querySelector("#year-filter");
const clearFilters = document.querySelector("#clear-filters");
const exportRecords = document.querySelector("#export-records");

let allRecords = [];
let activeTypeFilter = "all";

function chapterId(chapterName) {
  return `chapter-${chapterName.toLowerCase().replaceAll(" ", "-")}`;
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function byChapterThenDate(a, b) {
  return (
    a.chapter.number - b.chapter.number ||
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    a.title.localeCompare(b.title)
  );
}

function isConversationCandidate(record) {
  return (
    record.chapter.name === "Clinton-Yeltsin Chronology" &&
    (record.type === "Memcon" || record.type === "Telcon") &&
    record.potentialFrusDocument !== false
  );
}

function candidateRecords(records) {
  return records.filter(isConversationCandidate);
}

function pageSum(records) {
  return records.reduce((sum, record) => sum + (Number.isInteger(record.pageCount) ? record.pageCount : 0), 0);
}

function recordSourceLabel(record) {
  return record.source?.caseNumber || record.source?.name || record.naid || "Unknown source";
}

function sourceCopyCount(record, field) {
  return Array.isArray(record[field]) ? record[field].length : 0;
}

function sourceFileKey(file) {
  return file?.url || file?.id || file?.title || JSON.stringify(file || {});
}

function sourceFileReferenceCount(records, field) {
  return records.reduce((sum, record) => sum + sourceCopyCount(record, field), 0);
}

function uniqueSourceFileCount(records, field) {
  const keys = new Set();
  for (const record of records) {
    for (const file of record[field] || []) keys.add(sourceFileKey(file));
  }
  return keys.size;
}

function setText(node, value) {
  if (node) node.textContent = String(value);
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function sortByValueDesc(items) {
  return items.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function groupCounts(records, labelFor) {
  const groups = new Map();
  for (const record of records) {
    const label = labelFor(record) || "Unsorted";
    const item = groups.get(label) || { label, count: 0, pages: 0 };
    item.count += 1;
    item.pages += Number.isInteger(record.pageCount) ? record.pageCount : 0;
    groups.set(label, item);
  }
  return [...groups.values()];
}

function hasAnyPdf(record) {
  return Boolean(record.pdfUrl || record.catalogUrl);
}

function isDerivativePdf(record) {
  return /^public\/documents\//.test(record.pdfUrl || "");
}

function hasProvenanceSheet(record) {
  const status = record.extractionStatus || "";
  return (
    (isDerivativePdf(record) && Number.isInteger(record.localPdfPageCount)) ||
    /appended .*provenance sheet|appended original marker page|appended source page 1|final provenance sheet/i.test(status)
  );
}

function readinessClass(status) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function pageLabel(record) {
  return Number.isInteger(record.pageCount) ? `${record.pageCount} pages` : record.countStatus || "Extent pending";
}

function citationOpenItems(record) {
  const items = [
    "classification and handling controls",
    record.type === "Telcon" ? "call time, participants, and notetakers" : "meeting place/time, participants, and notetakers",
    "drafting, clearance, approval, and distribution lines",
    "annotations, attachments, excisions, and withheld-text accounting"
  ];

  if (!Number.isInteger(record.pageCount)) items.unshift("actual conversation-page extent");
  if (!hasProvenanceSheet(record) && isConversationCandidate(record)) items.push("marker/provenance sheet");
  return items.join("; ");
}

function setChapterCounts(records) {
  const candidates = candidateRecords(records);
  const counted = candidates.filter((record) => Number.isInteger(record.pageCount));
  const pending = candidates.filter((record) => !Number.isInteger(record.pageCount));
  const strobeCount = uniqueSourceFileCount(candidates, "strobeFiles");

  setText(totalRecords, records.length);
  setText(candidateDocuments, candidates.length);
  setText(countedPages, pageSum(candidates));
  setText(pendingDocuments, pending.length);
  setText(strobeSources, strobeCount);
  setText(candidateSetCount, candidates.length);
  setText(candidateCountedCount, counted.length);
  setText(candidatePendingCount, pending.length);
  setText(candidatePageCount, pageSum(candidates));

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = records.filter((record) => record.chapter.name === chapterName);
    const countNode = document.querySelector(`[data-chapter-count="${chapterName}"]`);
    const pagesNode = document.querySelector(`[data-chapter-pages="${chapterName}"]`);
    const pageTotal = pageSum(chapterRecords);

    if (countNode) countNode.textContent = chapterRecords.length.toString();
    if (pagesNode) pagesNode.textContent = pageTotal ? `${pageTotal}` : "source";
  }
}

function populateSelect(select, values, fallbackLabel) {
  if (!select) return;
  select.replaceChildren(new Option(fallbackLabel, "all"));
  for (const value of values) {
    select.append(new Option(value, value));
  }
}

function populateCompilerControls(records) {
  const years = [...new Set(records.map((record) => record.date?.slice(0, 4)).filter(Boolean))].sort();
  const sources = [...new Set(records.map(recordSourceLabel).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  populateSelect(yearFilter, years, "All years");
  populateSelect(sourceFilter, sources, "All sources");
}

function renderWorkbench(records) {
  const candidates = candidateRecords(records);
  const pending = candidates
    .filter((record) => !Number.isInteger(record.pageCount))
    .sort(byChapterThenDate);
  const strobeRefs = sourceFileReferenceCount(candidates, "strobeFiles");
  const driveRefs = sourceFileReferenceCount(candidates, "googleDriveFiles");
  const strobeFiles = uniqueSourceFileCount(candidates, "strobeFiles");
  const driveFiles = uniqueSourceFileCount(candidates, "googleDriveFiles");
  const strobeManifestPdfs = records.filter((record) => record.strobeManifestPdf).length;

  if (pendingSummary) {
    pendingSummary.textContent = pending.length
      ? `${pending.length} candidate records still need actual-page verification.`
      : "All candidate memcons and telcons have counted extents.";
  }

  if (pendingList) {
    pendingList.replaceChildren(
      ...pending.slice(0, 6).map((record) => {
        const item = document.createElement("li");
        const link = document.createElement("button");
        link.type = "button";
        link.textContent = `${formatDate(record.date)}: ${record.documentTitle || record.title}`;
        link.addEventListener("click", () => {
          applyQuickFilter("pending");
          if (searchInput) searchInput.value = record.date;
          filterRecords();
          document.querySelector("#records")?.scrollIntoView({ block: "start" });
        });
        item.append(link);
        return item;
      })
    );
  }

  if (sourceCopySummary) {
    sourceCopySummary.textContent = `${strobeFiles} unique Strobe FOIA source-copy files (${strobeRefs} row refs) and ${driveFiles} unique Drive files (${driveRefs} row refs) are attached to canonical conversation rows. The Talbott chapter also lists ${strobeManifestPdfs} visible Strobe manifest PDF rows for context review.`;
  }
}

function auditCard(title, value, detail, meta) {
  const card = document.createElement("article");
  card.className = "audit-card";

  const heading = document.createElement("h3");
  heading.textContent = title;
  const stat = document.createElement("p");
  stat.className = "audit-stat";
  stat.textContent = value;
  const body = document.createElement("p");
  body.textContent = detail;

  card.append(heading, stat, body);

  if (meta) {
    const note = document.createElement("p");
    note.className = "audit-meta";
    note.textContent = meta;
    card.append(note);
  }

  return card;
}

function renderCoverage(records) {
  if (!coverageRoot) return;

  const candidates = candidateRecords(records);
  const byYear = groupCounts(candidates, (record) => record.date.slice(0, 4)).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  const byType = groupCounts(candidates, (record) => record.type).sort((a, b) => a.label.localeCompare(b.label));
  const maxPages = Math.max(...byYear.map((item) => item.pages), ...byType.map((item) => item.pages), 1);

  const heading = document.createElement("h3");
  heading.textContent = "Coverage by Year and Form";
  const list = document.createElement("div");
  list.className = "coverage-list";

  for (const item of [...byYear, ...byType]) {
    const row = document.createElement("div");
    row.className = "coverage-row";
    const label = document.createElement("span");
    label.textContent = item.label;
    const meter = document.createElement("span");
    meter.className = "coverage-meter";
    meter.style.setProperty("--meter-width", `${Math.max(8, (item.pages / maxPages) * 100)}%`);
    const value = document.createElement("span");
    value.textContent = `${formatNumber(item.count)} records / ${formatNumber(item.pages)} pages`;
    row.append(label, meter, value);
    list.append(row);
  }

  coverageRoot.replaceChildren(heading, list);
}

function renderSourceLedger(records) {
  if (!sourceLedgerRoot) return;

  const candidates = candidateRecords(records);
  const sources = groupCounts(candidates, recordSourceLabel)
    .sort((a, b) => b.count - a.count || b.pages - a.pages || a.label.localeCompare(b.label))
    .slice(0, 10);

  const heading = document.createElement("h3");
  heading.textContent = "Source Ledger";
  const list = document.createElement("div");
  list.className = "source-ledger-list";

  for (const item of sources) {
    const row = document.createElement("div");
    row.className = "source-ledger-row";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("span");
    value.textContent = `${formatNumber(item.count)} / ${formatNumber(item.pages)} pp.`;
    row.append(label, value);
    list.append(row);
  }

  sourceLedgerRoot.replaceChildren(heading, list);
}

function renderCompilerAudit(records) {
  if (!auditRoot) return;

  const candidates = candidateRecords(records);
  const counted = candidates.filter((record) => Number.isInteger(record.pageCount));
  const pending = candidates.filter((record) => !Number.isInteger(record.pageCount));
  const memcons = candidates.filter((record) => record.type === "Memcon");
  const telcons = candidates.filter((record) => record.type === "Telcon");
  const derivativePdfs = candidates.filter(isDerivativePdf);
  const provenanceSheets = candidates.filter(hasProvenanceSheet);
  const strobeRefs = sourceFileReferenceCount(candidates, "strobeFiles");
  const driveRefs = sourceFileReferenceCount(candidates, "googleDriveFiles");
  const strobeFiles = uniqueSourceFileCount(candidates, "strobeFiles");
  const driveFiles = uniqueSourceFileCount(candidates, "googleDriveFiles");
  const scoutLeads = records.filter((record) => record.chapter.name === "NARA Scout Leads");
  const denseYear = sortByValueDesc(
    groupCounts(candidates, (record) => record.date.slice(0, 4)).map((item) => ({
      label: item.label,
      value: item.count,
      pages: item.pages
    }))
  )[0];

  auditRoot.replaceChildren(
    auditCard(
      "Candidate Evidence",
      `${formatNumber(candidates.length)} records`,
      `${formatNumber(pageSum(candidates))} actual conversation pages across ${formatNumber(memcons.length)} memcons and ${formatNumber(telcons.length)} telcons.`,
      `${formatNumber(counted.length)} counted; ${formatNumber(pending.length)} still pending.`
    ),
    auditCard(
      "PDF Provenance",
      `${formatNumber(derivativePdfs.length)} derivatives`,
      `${formatNumber(provenanceSheets.length)} candidate records have a marker/provenance sheet or equivalent note.`,
      `${formatNumber(candidates.filter(hasAnyPdf).length)} candidates have a source or PDF locator.`
    ),
    auditCard(
      "Source Files",
      `${formatNumber(strobeFiles + driveFiles)} unique`,
      `${formatNumber(strobeRefs)} Strobe FOIA row references and ${formatNumber(driveRefs)} Google Drive row references collapse to ${formatNumber(strobeFiles + driveFiles)} unique files.`,
      "Canonical rows keep duplicate source copies out of the page tally."
    ),
    auditCard(
      "Search Coverage",
      `${formatNumber(scoutLeads.length)} Scout leads`,
      denseYear
        ? `${denseYear.label} is the densest year with ${formatNumber(denseYear.value)} candidate records and ${formatNumber(denseYear.pages)} pages.`
        : "No dated candidate records available.",
      "NARA Scout search trails document the negative pass as well as confirmed Vancouver and Hyde Park records."
    )
  );

  renderCoverage(records);
  renderSourceLedger(records);
}

function methodCard(title, status, detail, measure) {
  const card = document.createElement("article");
  card.className = "frus-method-card";

  const top = document.createElement("div");
  top.className = "method-card-top";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const badge = document.createElement("span");
  badge.className = `readiness-status ${readinessClass(status)}`;
  badge.textContent = status;
  top.append(heading, badge);

  const body = document.createElement("p");
  body.textContent = detail;
  const foot = document.createElement("p");
  foot.className = "audit-meta";
  foot.textContent = measure;

  card.append(top, body, foot);
  return card;
}

function readinessRow(label, status, count, detail) {
  const row = document.createElement("div");
  row.className = "readiness-row";

  const labelWrap = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = label;
  const note = document.createElement("p");
  note.textContent = detail;
  labelWrap.append(name, note);

  const countItem = document.createElement("span");
  countItem.className = "readiness-count";
  countItem.textContent = count;

  const statusItem = document.createElement("span");
  statusItem.className = `readiness-status ${readinessClass(status)}`;
  statusItem.textContent = status;

  row.append(labelWrap, countItem, statusItem);
  return row;
}

function renderReadinessPanel(records) {
  if (!readinessRoot) return;

  const candidates = candidateRecords(records);
  const withSourceNotes = records.filter((record) => record.frusSourceNote);
  const withPages = candidates.filter((record) => Number.isInteger(record.pageCount));
  const withSourceRanges = candidates.filter((record) => record.sourcePdfPages);
  const withPdf = candidates.filter(hasAnyPdf);
  const withExtractionNotes = candidates.filter((record) => record.extractionStatus);
  const withProvenance = candidates.filter(hasProvenanceSheet);

  const heading = document.createElement("h3");
  heading.textContent = "Inventory Readiness";
  const list = document.createElement("div");
  list.className = "readiness-list";
  list.append(
    readinessRow(
      "FRUS-style citation stems",
      withSourceNotes.length === records.length ? "Ready" : "Gap",
      `${withSourceNotes.length}/${records.length}`,
      "Visible source notes start with repository, collection/control, case, document ID, or NAID where known."
    ),
    readinessRow(
      "Candidate page counts",
      withPages.length === candidates.length ? "Ready" : "Partial",
      `${withPages.length}/${candidates.length}`,
      "Only actual memcon/telcon pages count toward the consolidated page total."
    ),
    readinessRow(
      "Source page ranges",
      withSourceRanges.length === candidates.length ? "Ready" : "Partial",
      `${withSourceRanges.length}/${candidates.length}`,
      "Source packet pages are preserved separately from displayed document-page counts."
    ),
    readinessRow(
      "PDF and source links",
      withPdf.length === candidates.length ? "Ready" : "Partial",
      `${withPdf.length}/${candidates.length}`,
      "Each candidate should open to either a PDF, a catalog item, or a source packet."
    ),
    readinessRow(
      "Extraction accounting",
      withExtractionNotes.length === candidates.length ? "Ready" : "Partial",
      `${withExtractionNotes.length}/${candidates.length}`,
      "Extraction notes explain excluded administrative, duplicate, withheld, and non-conversation pages."
    ),
    readinessRow(
      "Marker/provenance control",
      withProvenance.length === candidates.length ? "Ready" : "Partial",
      `${withProvenance.length}/${candidates.length}`,
      "Derivative PDFs should append the original marker page where one exists."
    )
  );

  readinessRoot.replaceChildren(heading, list);
}

function renderSourceNotePanel(records) {
  if (!sourceNoteRoot) return;

  const candidates = candidateRecords(records);
  const pending = candidates.filter((record) => !Number.isInteger(record.pageCount));
  const derivativePdfs = candidates.filter(isDerivativePdf);
  const notes = candidates.filter((record) => record.frusSourceNote);

  const heading = document.createElement("h3");
  heading.textContent = "Source Note Worklist";
  const list = document.createElement("div");
  list.className = "source-note-list";
  list.append(
    readinessRow(
      "Source locator stem",
      "Ready",
      `${notes.length}/${candidates.length}`,
      "Repository and source-control fields are now separated from extraction audit prose."
    ),
    readinessRow(
      "Pending extents",
      pending.length ? "Next" : "Ready",
      `${pending.length}`,
      "Resolve only if released actual conversation pages can be located; do not substitute briefing or schedule material."
    ),
    readinessRow(
      "Classification / handling",
      "Next",
      "PDF/OCR",
      "Extract original markings from the face page or header before final FRUS treatment."
    ),
    readinessRow(
      "Drafting / clearance / distribution",
      "Next",
      "PDF/OCR",
      "Capture drafter, notetaker, clearance, approval, sent/received, and distribution lines where present."
    ),
    readinessRow(
      "Annotations / attachments / excisions",
      "Next",
      "Manual",
      "Record marginalia, attached-but-not-printed tabs, deletion counts, and wholly withheld cross-references."
    ),
    readinessRow(
      "Derivative PDF audit",
      derivativePdfs.length ? "Partial" : "Next",
      `${derivativePdfs.length}`,
      "Open each local derivative to confirm it contains only actual conversation pages plus the provenance sheet."
    )
  );

  sourceNoteRoot.replaceChildren(heading, list);
}

function renderFrusMethod(records) {
  if (!frusMethodRoot) return;

  const candidates = candidateRecords(records);
  const counted = candidates.filter((record) => Number.isInteger(record.pageCount));
  const years = groupCounts(candidates, (record) => record.date.slice(0, 4))
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((item) => `${item.label}: ${item.count}`)
    .join(" / ");
  const sourceNotes = records.filter((record) => record.frusSourceNote);
  const extractionNotes = candidates.filter((record) => record.extractionStatus);
  const sourceCopyRefs =
    sourceFileReferenceCount(candidates, "strobeFiles") +
    sourceFileReferenceCount(candidates, "googleDriveFiles");
  const sourceFiles =
    uniqueSourceFileCount(candidates, "strobeFiles") +
    uniqueSourceFileCount(candidates, "googleDriveFiles");

  frusMethodRoot.replaceChildren(
    methodCard(
      "Mission Boundary",
      "Set",
      "This page is an evidence inventory for compiler review. It is not a proposed document selection list or volume outline.",
      "Records stay in research lanes but candidate conversations remain chronologically sortable."
    ),
    methodCard(
      "Chronological Control",
      "Ready",
      "Candidate memcons and telcons are ordered by conversation date, with source packet and context records kept nearby for provenance.",
      years
    ),
    methodCard(
      "Citation Discipline",
      sourceNotes.length === records.length ? "Ready" : "Partial",
      "Displayed citations use a FRUS-style source-note stem while extraction, duplicate, and page-count notes stay separate.",
      `${sourceNotes.length}/${records.length} records have FRUS-style source-note text.`
    ),
    methodCard(
      "Declassification Accounting",
      counted.length === candidates.length ? "Ready" : "Partial",
      "Actual conversation pages, source packet pages, duplicate source copies, and pending extents are tracked as separate fields.",
      `${pageSum(candidates)} pages; ${extractionNotes.length}/${candidates.length} extraction notes; ${sourceFiles} unique source-copy files from ${sourceCopyRefs} row refs.`
    )
  );

  renderReadinessPanel(records);
  renderSourceNotePanel(records);
}

function createMeta(record) {
  const meta = document.createElement("div");
  meta.className = "record-meta";

  const countries = record.countries?.filter((country) => country !== "United States").join(", ");
  const sourceId = record.naid
    ? record.naid.startsWith("query-")
      ? record.naid
      : record.naid.match(/^\d+$/)
        ? `NAID ${record.naid}`
        : record.naid
    : record.source?.caseNumber;
  let extent = "Extent pending";
  if (record.type === "Scout Lead") {
    if (record.pageCount && record.digitalObjects && record.pageCount !== record.digitalObjects) {
      extent = `${record.pageCount} pages / ${record.digitalObjects} digital objects`;
    } else if (record.digitalObjects) {
      extent = `${record.digitalObjects} digital objects`;
    } else if (record.pageCount) {
      extent = `${record.pageCount} pages or digital objects`;
    }
  } else if (record.pageCount) {
    extent = `${record.pageCount} pages`;
  } else if (record.digitalObjects) {
    extent = `${record.digitalObjects} digital objects`;
  }

  for (const value of [record.type, countries, extent, sourceId, record.releaseStatus]) {
    if (!value) continue;
    const item = document.createElement("span");
    item.textContent = value;
    meta.append(item);
  }

  return meta;
}

function createParagraph(className, text) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

function createChecklistItem(label, value, tone = "") {
  const item = document.createElement("div");
  item.className = tone ? `check-item ${tone}` : "check-item";

  const title = document.createElement("span");
  title.textContent = label;

  const body = document.createElement("strong");
  body.textContent = value || "Needs review";

  item.append(title, body);
  return item;
}

function createCompilerChecklist(record) {
  const checklist = document.createElement("div");
  checklist.className = "record-checklist";

  const extent = Number.isInteger(record.pageCount)
    ? `${record.pageCount} actual pages`
    : record.countStatus || "Extent pending";
  const extentTone = Number.isInteger(record.pageCount) ? "ok" : "needs-review";
  const sourcePages = record.sourcePdfPages || "Page map pending";
  const provenance =
    record.markerPage
      ? `Marker page ${record.markerPage}`
      : record.localPdfPageCount
        ? "Derivative PDF checked"
        : record.sourcePdfPages
          ? "Source pages identified"
          : "Provenance pending";
  const copies = [
    sourceCopyCount(record, "strobeFiles") ? `${sourceCopyCount(record, "strobeFiles")} Strobe` : "",
    sourceCopyCount(record, "googleDriveFiles") ? `${sourceCopyCount(record, "googleDriveFiles")} Drive` : ""
  ]
    .filter(Boolean)
    .join(" / ");
  const accounting = record.extractionStatus
    ? "Extraction note present"
    : record.potentialFrusDocument === false
      ? "Lead, not counted"
      : "Needs extraction note";

  checklist.append(
    createChecklistItem("Placement", record.dateLine || formatDate(record.date)),
    createChecklistItem("Extent", extent, extentTone),
    createChecklistItem("Source Pages", sourcePages),
    createChecklistItem("Provenance", provenance),
    createChecklistItem("Copies", copies || "No duplicate copy logged"),
    createChecklistItem("Accounting", accounting, record.extractionStatus ? "ok" : "")
  );

  return checklist;
}

function citationLedgerRow(label, status, value) {
  const item = document.createElement("div");
  item.className = "citation-ledger-row";
  const term = document.createElement("dt");
  term.textContent = label;
  const definition = document.createElement("dd");
  const badge = document.createElement("span");
  badge.className = `citation-status ${readinessClass(status)}`;
  badge.textContent = status;
  definition.append(badge, document.createTextNode(value || "Needs review"));
  item.append(term, definition);
  return item;
}

function citationRows(record) {
  const sourceId = [recordSourceLabel(record), record.naid ? `NAID/control ${record.naid}` : ""]
    .filter(Boolean)
    .join("; ");
  const pdfLabel = [
    pageLabel(record),
    record.sourcePdfPages ? `source pages ${record.sourcePdfPages}` : "source page map pending",
    record.localPdfPageCount ? `${record.localPdfPageCount} local PDF pages` : "",
    record.markerPage ? `marker page ${record.markerPage}` : ""
  ]
    .filter(Boolean)
    .join("; ");
  const metadata =
    record.type === "Telcon" || record.type === "Memcon"
      ? `${record.type}; ${record.dateLine || formatDate(record.date)}; participants: ${(record.participants || []).join(", ") || "verify"}.`
      : `${record.type}; ${record.dateLine || formatDate(record.date)}.`;

  return [
    ["Repository / source", "Ready", record.frusSourceNote || record.sourceNote],
    ["Control locator", "Ready", sourceId],
    ["PDF / page range", Number.isInteger(record.pageCount) ? "Ready" : "Partial", pdfLabel],
    ["Classification / handling", "PDF", "Extract from original markings in the source PDF before final source-note treatment."],
    ["Meeting / call metadata", record.type === "Telcon" || record.type === "Memcon" ? "Check" : "Ready", metadata],
    ["Drafting / distribution", "PDF", "Verify drafter, notetaker, clearance, approval, distribution, and sent/received lines."],
    ["Declassification accounting", record.extractionStatus ? "Partial" : "Next", record.extractionStatus || "Add excisions, annotations, attachments, deletion counts, and withheld cross-references."],
    ["Open items", "Next", citationOpenItems(record)]
  ];
}

function createSourceNoteDetails(record) {
  const details = document.createElement("details");
  details.className = "source-note-details";

  const summary = document.createElement("summary");
  summary.textContent = "Compiler citation ledger";

  const draft = document.createElement("p");
  draft.className = "source-note-draft";
  draft.textContent = record.frusSourceNote || record.sourceNote || "Source: Provenance pending.";

  const ledger = document.createElement("dl");
  ledger.className = "citation-ledger";
  for (const [label, status, value] of citationRows(record)) {
    ledger.append(citationLedgerRow(label, status, value));
  }

  details.append(summary, draft, ledger);
  return details;
}

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = `record-row ${Number.isInteger(record.pageCount) ? "is-counted" : "is-pending"}`;

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
  date.textContent = record.dateDisplay || formatDate(record.date);

  const body = document.createElement("div");
  const title = document.createElement(record.catalogUrl || record.pdfUrl ? "a" : "span");
  title.className = "record-title";
  if (record.catalogUrl || record.pdfUrl) {
    title.href = record.catalogUrl || record.pdfUrl;
    title.rel = "noreferrer";
  }
  title.textContent = record.documentTitle || record.title;

  body.append(
    title,
    createParagraph("record-date-line", record.dateLine || formatDate(record.date)),
    createParagraph("record-subject", record.subjectLine || record.title),
    createMeta(record),
    createParagraph("record-source-note", record.frusSourceNote || record.sourceNote || "Source: Provenance pending."),
    createCompilerChecklist(record)
  );

  body.append(createSourceNoteDetails(record));

  if (record.extractionStatus) {
    body.append(createParagraph("record-extraction-note", `Extraction: ${record.extractionStatus}`));
  }

  const links = document.createElement("div");
  links.className = "record-links";

  if (record.catalogUrl) {
    const source = document.createElement("a");
    source.href = record.catalogUrl;
    source.rel = "noreferrer";
    source.textContent = record.naid?.match(/^\d+$/) ? "Catalog" : "Source";
    links.append(source);
  }

  if (record.pdfUrl && record.pdfUrl !== record.catalogUrl) {
    const pdf = document.createElement("a");
    pdf.href = record.pdfUrl;
    pdf.rel = "noreferrer";
    pdf.target = "_blank";
    pdf.textContent = "Open PDF";
    links.append(pdf);
  }

  for (const file of record.googleDriveFiles || []) {
    if (!file.url) continue;
    if (file.url === record.catalogUrl || file.url === record.pdfUrl) continue;
    const drive = document.createElement("a");
    drive.href = file.url;
    drive.rel = "noreferrer";
    drive.target = "_blank";
    drive.textContent = "Drive";
    drive.title = file.title || "Google Drive candidate";
    links.append(drive);
  }

  for (const file of record.strobeFiles || []) {
    if (!file.url) continue;
    if (file.url === record.catalogUrl || file.url === record.pdfUrl) continue;
    const strobe = document.createElement("a");
    strobe.href = file.url;
    strobe.rel = "noreferrer";
    strobe.target = "_blank";
    strobe.textContent = "Strobe";
    strobe.title = file.title || "Strobe FOIA source copy";
    links.append(strobe);
  }

  row.append(date, body, links);
  return row;
}

function renderRecords(records) {
  const sorted = [...records].sort(byChapterThenDate);
  recordsRoot.replaceChildren();

  if (recordsSummary) {
    const candidates = records.filter(isConversationCandidate);
    const pending = candidates.filter((record) => !Number.isInteger(record.pageCount));
    recordsSummary.textContent = `Showing ${formatNumber(records.length)} of ${formatNumber(allRecords.length)} records; ${formatNumber(candidates.length)} candidate memcons/telcons; ${formatNumber(pageSum(candidates))} actual conversation pages; ${formatNumber(pending.length)} pending extents.`;
  }

  if (!sorted.length) {
    recordsRoot.innerHTML = '<p class="loading">No records match this filter.</p>';
    return;
  }

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = sorted.filter((record) => record.chapter.name === chapterName);
    if (!chapterRecords.length) continue;

    const section = document.createElement("section");
    section.className = "record-chapter";
    section.id = chapterId(chapterName);

    const header = document.createElement("div");
    header.className = "record-chapter-header";

    const heading = document.createElement("h3");
    heading.textContent = `Chapter ${CHAPTER_ORDER.indexOf(chapterName) + 1}: ${chapterName}`;

    const count = document.createElement("p");
    count.className = "record-count";
    const pageTotal = pageSum(chapterRecords);
    const pendingTotal = chapterRecords.filter((record) => !Number.isInteger(record.pageCount)).length;
    count.textContent = pageTotal
      ? `${chapterRecords.length} records / ${pageTotal} pages or digital objects / ${pendingTotal} pending`
      : `${chapterRecords.length} records`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of chapterRecords) list.append(createRecordRow(record));

    section.append(header, list);
    recordsRoot.append(section);
  }
}

function statusMatches(record, status) {
  if (status === "all") return true;
  if (status === "candidate") return isConversationCandidate(record);
  if (status === "counted") return isConversationCandidate(record) && Number.isInteger(record.pageCount);
  if (status === "pending") return isConversationCandidate(record) && !Number.isInteger(record.pageCount);
  if (status === "strobe") {
    return (
      sourceCopyCount(record, "strobeFiles") > 0 ||
      record.strobeManifestPdf ||
      /Strobe Talbott/i.test(record.source?.name || "")
    );
  }
  if (status === "drive") return sourceCopyCount(record, "googleDriveFiles") > 0;
  if (status === "partial") return record.releaseStatus === "Partial" || record.releaseStatus === "Mixed";
  if (status === "unknown") return record.releaseStatus === "Unknown";
  if (status === "lead") return record.type === "Scout Lead" || /Lead/i.test(record.releaseStatus || "");
  return true;
}

function currentFilteredRecords() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const status = statusFilter?.value || "all";
  const source = sourceFilter?.value || "all";
  const year = yearFilter?.value || "all";
  return allRecords.filter((record) => {
    const matchesFilter = activeTypeFilter === "all" || record.type === activeTypeFilter;
    const matchesStatus = statusMatches(record, status);
    const matchesSource = source === "all" || recordSourceLabel(record) === source;
    const matchesYear = year === "all" || record.date?.startsWith(year);
    const haystack = JSON.stringify(record).toLowerCase();
    return matchesFilter && matchesStatus && matchesSource && matchesYear && (!query || haystack.includes(query));
  });
}

function filterRecords() {
  renderRecords(currentFilteredRecords());
}

function setTypeFilter(type) {
  activeTypeFilter = type;
  for (const item of filterButtons) {
    item.setAttribute("aria-pressed", String(item.dataset.recordFilter === type));
  }
}

function applyQuickFilter(kind) {
  if (!kind) return;
  if (searchInput) searchInput.value = "";
  if (sourceFilter) sourceFilter.value = "all";
  if (yearFilter) yearFilter.value = "all";
  setTypeFilter("all");

  const statusByKind = {
    candidate: "candidate",
    counted: "counted",
    pending: "pending",
    strobe: "strobe",
    drive: "drive",
    partial: "partial",
    unknown: "unknown",
    lead: "lead"
  };

  if (statusFilter) statusFilter.value = statusByKind[kind] || "all";
  filterRecords();
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function recordUrlList(record, field) {
  return (record[field] || []).map((file) => file.url || file.id || file.title).filter(Boolean).join(" | ");
}

function exportFilteredRecords() {
  const fields = [
    "date",
    "type",
    "title",
    "source",
    "releaseStatus",
    "pageCount",
    "sourcePdfPages",
    "markerPage",
    "frusSourceNote",
    "extractionStatus",
    "citationOpenItems",
    "catalogUrl",
    "pdfUrl",
    "strobePdfCategory",
    "googleDriveFiles",
    "strobeFiles"
  ];
  const rows = currentFilteredRecords()
    .sort(byChapterThenDate)
    .map((record) => [
      record.date,
      record.type,
      record.documentTitle || record.title,
      recordSourceLabel(record),
      record.releaseStatus,
      Number.isInteger(record.pageCount) ? record.pageCount : "",
      record.sourcePdfPages || "",
      record.markerPage || "",
      record.frusSourceNote || record.sourceNote || "",
      record.extractionStatus || "",
      citationOpenItems(record),
      record.catalogUrl || "",
      record.pdfUrl || "",
      record.strobePdfCategory || "",
      recordUrlList(record, "googleDriveFiles"),
      recordUrlList(record, "strobeFiles")
    ]);
  const csv = [fields, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = "clinton-russia-frus-filtered-records.csv";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function enableFilters() {
  searchInput?.addEventListener("input", filterRecords);
  statusFilter?.addEventListener("change", filterRecords);
  sourceFilter?.addEventListener("change", filterRecords);
  yearFilter?.addEventListener("change", filterRecords);
  exportRecords?.addEventListener("click", exportFilteredRecords);

  clearFilters?.addEventListener("click", () => {
    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "all";
    if (sourceFilter) sourceFilter.value = "all";
    if (yearFilter) yearFilter.value = "all";
    setTypeFilter("all");
    filterRecords();
  });

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      setTypeFilter(button.dataset.recordFilter);
      filterRecords();
    });
  }

  for (const trigger of document.querySelectorAll("[data-quick-filter]")) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      applyQuickFilter(trigger.dataset.quickFilter);
      document.querySelector("#records")?.scrollIntoView({ block: "start" });
    });
  }
}

function enableChapterCards() {
  for (const card of document.querySelectorAll(".chapter-card")) {
    card.addEventListener("click", (event) => {
      const targetId = card.getAttribute("href");
      if (!targetId?.startsWith("#")) return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      history.pushState(null, "", targetId);
      target.scrollIntoView({ block: "start" });
    });
  }
}

async function loadRecords() {
  const response = await fetch("data/memcons.json");
  if (!response.ok) throw new Error(`Could not load records: ${response.status}`);
  return response.json();
}

async function init() {
  try {
    allRecords = window.MEMCONS || window.MEMCON_RECORDS || (await loadRecords());
    setChapterCounts(allRecords);
    populateCompilerControls(allRecords);
    renderCompilerAudit(allRecords);
    renderFrusMethod(allRecords);
    renderWorkbench(allRecords);
    renderRecords(allRecords);
    enableFilters();
    enableChapterCards();
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  } catch (error) {
    recordsRoot.innerHTML =
      '<p class="error">The research records could not be loaded. Try opening this site through a local server or GitHub Pages.</p>';
  }
}

init();
