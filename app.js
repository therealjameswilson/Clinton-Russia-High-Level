const CHAPTER_ORDER = [
  "Clinton-Yeltsin Chronology",
  "Released Clinton Library Packets",
  "Talbott FOIA Context",
  "NARA Scout Leads"
];

const recordsRoot = document.querySelector("#records-root");
const totalRecords = document.querySelector("#total-records");
const totalPages = document.querySelector("#total-pages");
const searchInput = document.querySelector("#record-search");
const filterButtons = [...document.querySelectorAll("[data-record-filter]")];

let allRecords = [];
let activeFilter = "all";

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

function setChapterCounts(records) {
  totalRecords.textContent = records.length.toString();
  totalPages.textContent = records.reduce((sum, record) => sum + (record.pageCount || 0), 0).toString();

  for (const chapterName of CHAPTER_ORDER) {
    const chapterRecords = records.filter((record) => record.chapter.name === chapterName);
    const countNode = document.querySelector(`[data-chapter-count="${chapterName}"]`);
    const pagesNode = document.querySelector(`[data-chapter-pages="${chapterName}"]`);
    const pageTotal = chapterRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0);

    if (countNode) countNode.textContent = chapterRecords.length.toString();
    if (pagesNode) pagesNode.textContent = pageTotal ? `${pageTotal}` : "source";
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

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = "record-row";

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
    createParagraph("record-source-note", record.sourceNote || "Source: Provenance pending.")
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
    const pageTotal = chapterRecords.reduce((sum, record) => sum + (record.pageCount || 0), 0);
    count.textContent = pageTotal
      ? `${chapterRecords.length} records / ${pageTotal} pages or digital objects`
      : `${chapterRecords.length} records`;
    header.append(heading, count);

    const list = document.createElement("div");
    list.className = "record-list";
    for (const record of chapterRecords) list.append(createRecordRow(record));

    section.append(header, list);
    recordsRoot.append(section);
  }
}

function filterRecords() {
  const query = searchInput?.value.trim().toLowerCase() || "";
  const records = allRecords.filter((record) => {
    const matchesFilter = activeFilter === "all" || record.type === activeFilter;
    const haystack = JSON.stringify(record).toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
  renderRecords(records);
}

function enableFilters() {
  searchInput?.addEventListener("input", filterRecords);

  for (const button of filterButtons) {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.recordFilter;
      for (const item of filterButtons) {
        item.setAttribute("aria-pressed", String(item === button));
      }
      filterRecords();
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
