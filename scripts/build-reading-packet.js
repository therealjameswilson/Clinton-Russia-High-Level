const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";
const QPDF = process.env.QPDF || "qpdf";
const PDFINFO = process.env.PDFINFO || "pdfinfo";
const OUTPUT_PDF = "public/documents/clinton-yeltsin-core-reading-packet.pdf";
const OUTPUT_MANIFEST = "reports/reading-packet-manifest.json";
const OUTPUT_TOC = "reports/reading-packet-toc.csv";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function pdfPageCount(filePath) {
  const output = execFileSync(PDFINFO, [filePath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Could not read page count from pdfinfo output for ${filePath}`);
  return Number(match[1]);
}

function chronologySort(a, b) {
  return (
    a.sortDate.localeCompare(b.sortDate) ||
    (a.sortOrder || 0) - (b.sortOrder || 0) ||
    a.title.localeCompare(b.title)
  );
}

function candidateDocuments(records) {
  return records
    .filter(
      (record) =>
        record.chapter.name === "Clinton-Yeltsin Chronology" &&
        (record.type === "Memcon" || record.type === "Telcon") &&
        record.potentialFrusDocument !== false &&
        Number.isInteger(record.pageCount) &&
        /^public\/documents\/.+\.pdf$/i.test(record.pdfUrl || "")
    )
    .sort(chronologySort);
}

function packetRows(records) {
  let nextPage = 1;
  return candidateDocuments(records).map((record, index) => {
    const filePath = path.join(ROOT, record.pdfUrl);
    if (!fs.existsSync(filePath)) throw new Error(`Missing derivative PDF: ${record.pdfUrl}`);
    const diskPdfPageCount = pdfPageCount(filePath);
    const expectedPdfPageCount = record.pageCount + (Number.isInteger(record.markerPage) ? 1 : 0);
    if (diskPdfPageCount !== record.localPdfPageCount) {
      throw new Error(`${record.id} disk pages ${diskPdfPageCount} do not match record localPdfPageCount ${record.localPdfPageCount}`);
    }
    if (diskPdfPageCount !== expectedPdfPageCount) {
      throw new Error(`${record.id} disk pages ${diskPdfPageCount} do not match actual pages plus marker ${expectedPdfPageCount}`);
    }

    const packetPageStart = nextPage;
    const packetPageEnd = packetPageStart + diskPdfPageCount - 1;
    const actualConversationPacketPageStart = packetPageStart;
    const actualConversationPacketPageEnd = packetPageStart + record.pageCount - 1;
    const provenanceSheetPacketPage = Number.isInteger(record.markerPage)
      ? actualConversationPacketPageEnd + 1
      : null;
    nextPage = packetPageEnd + 1;

    return {
      sequence: index + 1,
      id: record.id,
      date: record.date,
      type: record.type,
      title: record.documentTitle || record.title,
      source: record.source?.caseNumber || record.source?.name || record.naid || "",
      sourcePdfPages: record.sourcePdfPages || "",
      markerPage: Number.isInteger(record.markerPage) ? record.markerPage : null,
      actualConversationPages: record.pageCount,
      componentLocalPdfPages: diskPdfPageCount,
      packetPageStart,
      packetPageEnd,
      actualConversationPacketPageStart,
      actualConversationPacketPageEnd,
      provenanceSheetPacketPage,
      derivativePdf: record.pdfUrl,
      derivativePdfUrl: siteUrl(record.pdfUrl),
      sourcePacketUrl: siteUrl(record.sourcePdfUrl || record.source?.pdfUrl || record.catalogUrl || ""),
      frusSourceNote: record.frusSourceNote || ""
    };
  });
}

function writeToc(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "packetPageStart",
    "packetPageEnd",
    "actualConversationPacketPages",
    "provenanceSheetPacketPage",
    "actualConversationPages",
    "title",
    "source",
    "sourcePdfPages",
    "derivativePdfUrl",
    "sourcePacketUrl",
    "frusSourceNote"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.packetPageStart,
      row.packetPageEnd,
      `${row.actualConversationPacketPageStart}-${row.actualConversationPacketPageEnd}`,
      row.provenanceSheetPacketPage || "",
      row.actualConversationPages,
      row.title,
      row.source,
      row.sourcePdfPages,
      row.derivativePdfUrl,
      row.sourcePacketUrl,
      row.frusSourceNote
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(path.join(ROOT, OUTPUT_TOC), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function buildPacket(rows) {
  const outputPath = path.join(ROOT, OUTPUT_PDF);
  const args = ["--empty", "--pages"];
  for (const row of rows) args.push(path.join(ROOT, row.derivativePdf));
  args.push("--", outputPath);
  execFileSync(QPDF, args, { stdio: "inherit" });
  return pdfPageCount(outputPath);
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const rows = packetRows(records);
const totalPacketPages = buildPacket(rows);
writeToc(rows);

const manifest = {
  generatedAt: new Date().toISOString(),
  scope:
    "Chronological combined PDF of the 85 page-counted Clinton-Yeltsin memcons and telcons. Each component PDF contributes actual conversation pages followed by its provenance/marker sheet when one exists.",
  packetPdf: OUTPUT_PDF,
  packetPdfUrl: siteUrl(OUTPUT_PDF),
  tocCsv: OUTPUT_TOC,
  totalDocuments: rows.length,
  totalActualConversationPages: rows.reduce((sum, row) => sum + row.actualConversationPages, 0),
  totalPacketPages,
  provenanceSheetPages: rows.filter((row) => Number.isInteger(row.provenanceSheetPacketPage)).length,
  rows
};

fs.writeFileSync(path.join(ROOT, OUTPUT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      packetPdf: manifest.packetPdf,
      totalDocuments: manifest.totalDocuments,
      totalActualConversationPages: manifest.totalActualConversationPages,
      totalPacketPages: manifest.totalPacketPages,
      provenanceSheetPages: manifest.provenanceSheetPages,
      tocCsv: manifest.tocCsv,
      manifest: OUTPUT_MANIFEST
    },
    null,
    2
  )
);
