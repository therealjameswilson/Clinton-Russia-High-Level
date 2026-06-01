const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PDFINFO = process.env.PDFINFO || "pdfinfo";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function candidateConversationRecords(records) {
  return records.filter(
    (record) =>
      record.chapter.name === "Clinton-Yeltsin Chronology" &&
      (record.type === "Memcon" || record.type === "Telcon") &&
      record.potentialFrusDocument !== false
  );
}

function localDocumentPath(record) {
  if (!/^public\/documents\/.+\.pdf$/i.test(record.pdfUrl || "")) return "";
  return path.join(ROOT, record.pdfUrl);
}

function pdfPageCount(filePath) {
  const output = execFileSync(PDFINFO, [filePath], { encoding: "utf8" });
  const match = output.match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error(`Could not read page count from pdfinfo output for ${filePath}`);
  return Number(match[1]);
}

function status(ok) {
  return ok ? "pass" : "fail";
}

function auditRecord(record, manifestByRecordId) {
  const filePath = localDocumentPath(record);
  const manifest = manifestByRecordId.get(record.id) || null;
  const row = {
    id: record.id,
    date: record.date,
    type: record.type,
    title: record.documentTitle || record.title,
    source: record.source?.caseNumber || record.source?.name || record.naid || "",
    pageCount: Number.isInteger(record.pageCount) ? record.pageCount : null,
    recordLocalPdfPageCount: Number.isInteger(record.localPdfPageCount) ? record.localPdfPageCount : null,
    markerPage: Number.isInteger(record.markerPage) ? record.markerPage : null,
    sourcePdfPages: record.sourcePdfPages || "",
    pdfUrl: record.pdfUrl || "",
    hasLocalDerivativePdf: Boolean(filePath),
    fileExists: filePath ? fs.existsSync(filePath) : false,
    diskPdfPageCount: null,
    expectedPdfPageCount: null,
    manifestPdfPageCount: manifest?.localPdfPageCount ?? null,
    manifestConversationTextCheck: manifest?.conversationTextCheck || "",
    checks: {},
    issue: ""
  };

  if (!filePath) {
    row.checks.pendingHasNoDerivativePdf = status(!Number.isInteger(record.pageCount));
    row.issue = Number.isInteger(record.pageCount)
      ? "Counted record does not point to a local derivative PDF."
      : "";
    return row;
  }

  row.expectedPdfPageCount = Number.isInteger(record.pageCount)
    ? record.pageCount + (Number.isInteger(record.markerPage) ? 1 : 0)
    : null;

  if (!row.fileExists) {
    row.issue = "Local derivative PDF is missing on disk.";
    row.checks.fileExists = "fail";
    return row;
  }

  try {
    row.diskPdfPageCount = pdfPageCount(filePath);
  } catch (error) {
    row.issue = error.message;
    row.checks.pdfInfoReadable = "fail";
    return row;
  }

  row.checks.pdfInfoReadable = "pass";
  row.checks.diskMatchesRecordLocalPdfPageCount = status(
    row.diskPdfPageCount === row.recordLocalPdfPageCount
  );
  row.checks.diskMatchesExpectedActualPagesPlusMarker = status(
    row.diskPdfPageCount === row.expectedPdfPageCount
  );
  row.checks.manifestMatchesRecord = status(
    manifest ? row.manifestPdfPageCount === row.recordLocalPdfPageCount : false
  );
  row.checks.manifestTextCheck = status(
    manifest ? row.manifestConversationTextCheck === "pass" : false
  );

  const failedChecks = Object.entries(row.checks)
    .filter(([, value]) => value !== "pass")
    .map(([key]) => key);
  row.issue = failedChecks.length ? `Failed checks: ${failedChecks.join(", ")}.` : "";
  return row;
}

function summarize(rows) {
  const counted = rows.filter((row) => Number.isInteger(row.pageCount));
  const local = rows.filter((row) => row.hasLocalDerivativePdf);
  const pending = rows.filter((row) => !Number.isInteger(row.pageCount));
  const markerExpected = local.filter((row) => Number.isInteger(row.markerPage));
  const issues = rows.filter((row) => row.issue);
  return {
    candidateConversationRecords: rows.length,
    countedConversationRecords: counted.length,
    pendingExtentRecords: pending.length,
    localDerivativePdfRecords: local.length,
    localDerivativePdfFilesPresent: local.filter((row) => row.fileExists).length,
    totalActualConversationPages: counted.reduce((sum, row) => sum + row.pageCount, 0),
    totalLocalPdfPagesOnDisk: local.reduce((sum, row) => sum + (row.diskPdfPageCount || 0), 0),
    provenanceSheetExpectedRecords: markerExpected.length,
    provenanceSheetExpectedRecordsPassing: markerExpected.filter(
      (row) => row.checks.diskMatchesExpectedActualPagesPlusMarker === "pass"
    ).length,
    rowsWithIssues: issues.length,
    missingFiles: rows.filter((row) => row.hasLocalDerivativePdf && !row.fileExists).length,
    diskPageCountMismatches: rows.filter(
      (row) => row.checks.diskMatchesRecordLocalPdfPageCount === "fail"
    ).length,
    manifestMismatches: rows.filter((row) => row.checks.manifestMatchesRecord === "fail").length,
    manifestTextCheckFailures: rows.filter((row) => row.checks.manifestTextCheck === "fail").length
  };
}

const records = readJson(path.join(ROOT, "data", "memcons.json"));
const manifest = readJson(path.join(ROOT, "reports", "extracted-pdf-manifest.json"));
const manifestByRecordId = new Map((manifest.documents || []).map((item) => [item.recordId, item]));
const rows = candidateConversationRecords(records).map((record) =>
  auditRecord(record, manifestByRecordId)
);
const report = {
  generatedAt: new Date().toISOString(),
  scope:
    "Validation of local derivative PDFs for direct Clinton-Yeltsin candidate memcons and telcons. The expected file extent is actual conversation pages plus one appended source marker/provenance sheet when markerPage is present.",
  pdfInfoCommand: PDFINFO,
  summary: summarize(rows),
  issueRows: rows.filter((row) => row.issue),
  rows
};

fs.writeFileSync(
  path.join(ROOT, "reports", "extracted-pdf-validation.json"),
  `${JSON.stringify(report, null, 2)}\n`
);
console.log(JSON.stringify(report.summary, null, 2));
