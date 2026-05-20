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
const searchInput = document.querySelector("#record-search");
const filterButtons = [...document.querySelectorAll("[data-record-filter]")];
const statusFilter = document.querySelector("#status-filter");
const sourceFilter = document.querySelector("#source-filter");
const yearFilter = document.querySelector("#year-filter");
const clearFilters = document.querySelector("#clear-filters");

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

function setText(node, value) {
  if (node) node.textContent = String(value);
}

function setChapterCounts(records) {
  const candidates = candidateRecords(records);
  const counted = candidates.filter((record) => Number.isInteger(record.pageCount));
  const pending = candidates.filter((record) => !Number.isInteger(record.pageCount));
  const strobeCount = candidates.reduce((sum, record) => sum + sourceCopyCount(record, "strobeFiles"), 0);

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
  const strobeCount = candidates.reduce((sum, record) => sum + sourceCopyCount(record, "strobeFiles"), 0);
  const driveCount = candidates.reduce((sum, record) => sum + sourceCopyCount(record, "googleDriveFiles"), 0);

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
    sourceCopySummary.textContent = `${strobeCount} Strobe FOIA references and ${driveCount} Drive references are attached to canonical conversation rows for deduped review.`;
  }
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

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = `record-row ${Number.isInteger(record.pageCount) ? "is-counted" : "is-pending"}`;

  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
  date.textContent = formatDate(record.date);

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
    createParagraph("record-source-note", record.sourceNote || "Source: Provenance pending."),
    createCompilerChecklist(record)
  );

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
  if (status === "strobe") return sourceCopyCount(record, "strobeFiles") > 0;
  if (status === "drive") return sourceCopyCount(record, "googleDriveFiles") > 0;
  if (status === "partial") return record.releaseStatus === "Partial" || record.releaseStatus === "Mixed";
  if (status === "unknown") return record.releaseStatus === "Unknown";
  if (status === "lead") return record.type === "Scout Lead" || /Lead/i.test(record.releaseStatus || "");
  return true;
}

function filterRecords() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const status = statusFilter?.value || "all";
  const source = sourceFilter?.value || "all";
  const year = yearFilter?.value || "all";
  const records = allRecords.filter((record) => {
    const matchesFilter = activeTypeFilter === "all" || record.type === activeTypeFilter;
    const matchesStatus = statusMatches(record, status);
    const matchesSource = source === "all" || recordSourceLabel(record) === source;
    const matchesYear = year === "all" || record.date?.startsWith(year);
    const haystack = JSON.stringify(record).toLowerCase();
    return matchesFilter && matchesStatus && matchesSource && matchesYear && (!query || haystack.includes(query));
  });
  renderRecords(records);
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

function enableFilters() {
  searchInput?.addEventListener("input", filterRecords);
  statusFilter?.addEventListener("change", filterRecords);
  sourceFilter?.addEventListener("change", filterRecords);
  yearFilter?.addEventListener("change", filterRecords);

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
