const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_BASE_URL = "https://therealjameswilson.github.io/Clinton-Russia-High-Level/";

const AUTHORITY_NOTES = {
  Albright: {
    type: "Person",
    role: "Madeleine K. Albright; U.S. Permanent Representative to the United Nations, then Secretary of State.",
    note: "Annotate on first use in the selected volume if the document predates her Secretary of State appointment or if her channel with Primakov/Yeltsin matters."
  },
  Berger: {
    type: "Person",
    role: "Samuel R. Berger; Deputy Assistant to the President for National Security Affairs, then National Security Adviser.",
    note: "Useful for explaining NSC staffing on post-1996 calls and Helsinki/Kosovo documents."
  },
  Christopher: {
    type: "Person",
    role: "Warren Christopher; Secretary of State, 1993-1997.",
    note: "Usually a first-appearance personnel note; cross-reference early Clinton-Russia policy formation if selected."
  },
  Chernomyrdin: {
    type: "Person",
    role: "Viktor S. Chernomyrdin; Chairman of the Russian Government and Gore-Chernomyrdin Commission co-chair.",
    note: "Often needs an annotation when the Gore-Chernomyrdin channel or Kosovo mediation is central."
  },
  Gore: {
    type: "Person",
    role: "Albert Gore, Jr.; Vice President of the United States.",
    note: "Annotate for the Gore-Chernomyrdin Commission and its relation to presidential-level contacts."
  },
  Ivanov: {
    type: "Person",
    role: "Igor S. Ivanov; Russian Foreign Minister from 1998.",
    note: "Likely relevant in Kosovo-era documents and late Yeltsin/Putin transition context."
  },
  Kohl: {
    type: "Person",
    role: "Helmut Kohl; Chancellor of Germany.",
    note: "Annotate where NATO enlargement, European security, or G-7 diplomacy depends on German context."
  },
  Kozyrev: {
    type: "Person",
    role: "Andrei V. Kozyrev; Russian Foreign Minister, 1990-1996.",
    note: "High-value early-volume authority note; appears in Bosnia, NATO, and reform-assistance discussions."
  },
  Kravchuk: {
    type: "Person",
    role: "Leonid M. Kravchuk; President of Ukraine, 1991-1994.",
    note: "Annotate in trilateral/nuclear-security documents and Budapest Memorandum context."
  },
  Milosevic: {
    type: "Person",
    role: "Slobodan Milosevic; President of Serbia and later President of the Federal Republic of Yugoslavia.",
    note: "Annotate in Bosnia/Kosovo documents; connect to Contact Group and NATO air campaign context if selected."
  },
  Primakov: {
    type: "Person",
    role: "Yevgeny M. Primakov; Russian Foreign Minister, then Prime Minister.",
    note: "Frequent late-1990s foreign-policy interlocutor; annotate especially around Kosovo and Iraq."
  },
  Talbott: {
    type: "Person",
    role: "Strobe Talbott; Ambassador-at-large and special adviser on the newly independent states, then Deputy Secretary of State.",
    note: "Annotate for back-channel and implementation context; cross-link to Talbott FOIA source-copy records where useful."
  },
  Tudjman: {
    type: "Person",
    role: "Franjo Tudjman; President of Croatia.",
    note: "Annotate if Bosnia/Croatia settlement context is retained in the selected document."
  },
  Yeltsin: {
    type: "Person",
    role: "Boris N. Yeltsin; President of the Russian Federation through December 31, 1999.",
    note: "Usually central to volume scope; use sparingly except for former-President references or status transitions."
  },
  Zyuganov: {
    type: "Person",
    role: "Gennady A. Zyuganov; Communist Party leader and 1996 Russian presidential candidate.",
    note: "Annotate in documents on Russian elections and U.S. policy toward Russian domestic politics."
  },
  IMF: {
    type: "Organization",
    role: "International Monetary Fund.",
    note: "Annotate where loans, conditionality, or Russian financial stabilization are significant."
  },
  NATO: {
    type: "Organization",
    role: "North Atlantic Treaty Organization.",
    note: "Annotate only when the document turns on enlargement, Partnership for Peace, Bosnia, Kosovo, or NATO-Russia structures."
  },
  UN: {
    type: "Organization",
    role: "United Nations.",
    note: "Annotate when Bosnia, Iraq, Kosovo, peacekeeping, or Security Council action is material."
  },
  "G-7": {
    type: "Organization",
    role: "Group of Seven major industrial democracies.",
    note: "Annotate around Tokyo, Halifax, Denver, Birmingham, Cologne, and assistance coordination."
  }
};

const TOPIC_NOTES = {
  "NATO / European Security": {
    type: "Issue",
    role: "NATO enlargement, Partnership for Peace, NATO-Russia security architecture, and summit diplomacy.",
    note: "Likely needs editorial framing where the document is selected for the NATO-Russia pressure line."
  },
  "Kosovo / Balkans": {
    type: "Issue",
    role: "Bosnia, Kosovo, Serbia/Yugoslavia, Contact Group, KFOR, and Milosevic diplomacy.",
    note: "Use for document-selection clustering and for editorial notes on Balkan diplomacy."
  },
  "Ukraine / Nuclear Security": {
    type: "Issue",
    role: "Ukraine, Kravchuk, trilateral nuclear arrangements, and Budapest security assurances.",
    note: "Annotate treaty/security-assurance context where nuclear transfer or Ukraine status drives the exchange."
  },
  "Arms Control / Nonproliferation": {
    type: "Issue",
    role: "START, ABM, CFE, missile defense, nonproliferation, and weapons control.",
    note: "Expect cross-references to arms-control volumes and treaty documentation."
  },
  "Economic Reform / Assistance": {
    type: "Issue",
    role: "Russian reform, assistance packages, IMF support, loans, ruble policy, privatization, and G-7 coordination.",
    note: "Use to identify documents requiring economic-assistance annotations or Public Papers cross-checks."
  },
  "Russian Politics / Elections": {
    type: "Issue",
    role: "Russian domestic politics, elections, Duma, Communists, opposition, democracy, and constitutional crisis.",
    note: "High annotation value for 1993 constitutional crisis and 1996 election documents."
  },
  "Chechnya / Caucasus": {
    type: "Issue",
    role: "Chechnya, Chechen conflict, Caucasus, and Russian internal security concerns.",
    note: "Annotate carefully as internal-Russia context when retained in a presidential exchange."
  },
  "Iraq / Middle East": {
    type: "Issue",
    role: "Iraq, Saddam Hussein, sanctions, Iran, Jordan, and Middle East diplomacy.",
    note: "Use to flag documents that may require cross-volume Middle East/Iraq coordination."
  }
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function siteUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\.\//, ""), SITE_BASE_URL).href;
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function htmlCell(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function htmlLink(label, url) {
  const href = siteUrl(url);
  if (!href) return htmlCell(label);
  return `<a href="${htmlCell(href)}">${htmlCell(label)}</a>`;
}

function topList(items, count = 4) {
  return [...(items || [])].sort((a, b) => b.hits - a.hits || String(a.label || a.term).localeCompare(String(b.label || b.term))).slice(0, count);
}

function targetPriority(documentCount, totalHits, type) {
  if (type === "Issue" && documentCount >= 25) return "Core issue";
  if (documentCount >= 20 || totalHits >= 60) return "High";
  if (documentCount >= 8 || totalHits >= 20) return "Medium";
  return "Watch";
}

function firstLastDocs(documents) {
  if (!documents.length) return { firstDate: "", lastDate: "" };
  const sorted = [...documents].sort((a, b) => a.date.localeCompare(b.date) || (a.sequence || 0) - (b.sequence || 0));
  return {
    firstDate: sorted[0].date,
    lastDate: sorted[sorted.length - 1].date
  };
}

function buildAuthorityTargets(topicIndex) {
  const nameTargets = topicIndex.nameIndex.map((item) => {
    const meta = AUTHORITY_NOTES[item.term] || {
      type: "Person/Organization",
      role: "",
      note: "Review for possible first-reference or contextual annotation."
    };
    const span = firstLastDocs(item.documents);
    return {
      key: item.term,
      type: meta.type,
      priority: targetPriority(item.documentCount, item.totalHits, meta.type),
      role: meta.role,
      annotationNote: meta.note,
      documentCount: item.documentCount,
      totalHits: item.totalHits,
      firstDate: span.firstDate,
      lastDate: span.lastDate,
      topDocuments: item.documents.slice(0, 8).map((doc) => ({
        sequence: doc.sequence,
        date: doc.date,
        title: doc.title,
        hits: doc.hits,
        pdfUrl: doc.derivativePdfUrl
      }))
    };
  });

  const topicTargets = topicIndex.topicSections.map((item) => {
    const meta = TOPIC_NOTES[item.label] || {
      type: "Issue",
      role: "",
      note: "Review as a possible issue cluster for annotation and editorial-note planning."
    };
    const span = firstLastDocs(item.documents);
    return {
      key: item.label,
      type: meta.type,
      priority: targetPriority(item.documentCount, item.totalHits, meta.type),
      role: meta.role,
      annotationNote: meta.note,
      documentCount: item.documentCount,
      totalHits: item.totalHits,
      firstDate: span.firstDate,
      lastDate: span.lastDate,
      topDocuments: item.documents.slice(0, 8).map((doc) => ({
        sequence: doc.sequence,
        date: doc.date,
        title: doc.title,
        hits: doc.hits,
        terms: doc.terms.map((term) => `${term.term}:${term.hits}`).join("; "),
        pdfUrl: doc.derivativePdfUrl
      }))
    };
  });

  return [...topicTargets, ...nameTargets].sort(
    (a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      b.documentCount - a.documentCount ||
      b.totalHits - a.totalHits ||
      a.key.localeCompare(b.key)
  );
}

function priorityRank(priority) {
  return { "Core issue": 0, High: 1, Medium: 2, Watch: 3 }[priority] ?? 4;
}

function buildDocumentQueue(topicIndex, contactDossier, faceAudit) {
  const dossierById = new Map((contactDossier.rows || []).map((row) => [row.id, row]));
  const faceById = new Map((faceAudit.rows || []).map((row) => [row.id, row]));
  return topicIndex.documents.map((doc) => {
    const dossier = dossierById.get(doc.id) || {};
    const face = faceById.get(doc.id) || {};
    const topTopics = topList(doc.topics, 3);
    const topAuthorities = topList(doc.peopleAndOrgs, 6);
    const companionCount =
      (dossier.pddReferences || []).length +
      (dossier.publicSameDay || []).length +
      (dossier.publicNearby || []).length +
      (dossier.sourceCopies || []).length +
      (dossier.strobeContext || []).length +
      (dossier.naraSupport || []).length;
    const score =
      topTopics.reduce((sum, item) => sum + item.hits, 0) +
      topAuthorities.reduce((sum, item) => sum + item.hits, 0) +
      companionCount * 2 +
      (face.notetaker ? 1 : 0) +
      (face.interpreter ? 1 : 0);
    return {
      id: doc.id,
      sequence: doc.sequence,
      date: doc.date,
      type: doc.type,
      title: doc.title,
      packetPages: doc.packetPageStart ? `${doc.packetPageStart}-${doc.packetPageEnd}` : "",
      actualConversationPacketPages: doc.actualConversationPacketPages,
      pdfUrl: doc.derivativePdfUrl,
      wordCount: doc.wordCount,
      annotationScore: score,
      suggestedTreatment: score >= 45 ? "Heavy annotation review" : score >= 24 ? "Standard annotation review" : "Light annotation check",
      topTopics: topTopics.map((topic) => `${topic.label} (${topic.hits})`),
      topAuthorities: topAuthorities.map((item) => `${item.term} (${item.hits})`),
      pddReferences: (dossier.pddReferences || []).length,
      publicPapers: (dossier.publicSameDay || []).length + (dossier.publicNearby || []).length,
      sourceCopyControls: (dossier.sourceCopies || []).length,
      supportLeads: (dossier.strobeContext || []).length + (dossier.naraSupport || []).length,
      notetaker: face.notetaker || "",
      interpreter: face.interpreter || "",
      dateTimePlace: face.dateTimePlace || "",
      annotationPrompt: annotationPrompt(doc, topTopics, topAuthorities, dossier)
    };
  }).sort((a, b) => b.annotationScore - a.annotationScore || a.date.localeCompare(b.date) || a.sequence - b.sequence);
}

function annotationPrompt(doc, topics, authorities, dossier) {
  const parts = [];
  if (topics.length) parts.push(`Issue context: ${topics.map((topic) => topic.label).join(", ")}.`);
  if (authorities.length) parts.push(`Authority checks: ${authorities.map((item) => item.term).join(", ")}.`);
  if ((dossier.publicSameDay || []).length || (dossier.publicNearby || []).length) parts.push("Compare same-day/nearby Public Papers for public framing.");
  if ((dossier.pddReferences || []).length) parts.push("Use Daily Diary row to verify timing/setting.");
  if ((dossier.sourceCopies || []).length) parts.push("Check duplicate/source-copy controls before final citation.");
  return parts.length ? parts.join(" ") : "Confirm whether only minimal first-reference annotation is needed.";
}

function writeTargetsCsv(targets) {
  const fields = [
    "key",
    "type",
    "priority",
    "documentCount",
    "totalHits",
    "firstDate",
    "lastDate",
    "role",
    "annotationNote",
    "topDocuments"
  ];
  const body = targets.map((target) =>
    [
      target.key,
      target.type,
      target.priority,
      target.documentCount,
      target.totalHits,
      target.firstDate,
      target.lastDate,
      target.role,
      target.annotationNote,
      target.topDocuments.map((doc) => `#${doc.sequence} ${doc.date} ${doc.title} (${doc.hits} hits) <${siteUrl(doc.pdfUrl)}>`).join("; ")
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(path.join(ROOT, "reports/annotation-targets.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function writeQueueCsv(rows) {
  const fields = [
    "sequence",
    "date",
    "type",
    "annotationScore",
    "suggestedTreatment",
    "packetPages",
    "actualConversationPacketPages",
    "title",
    "topTopics",
    "topAuthorities",
    "pddReferences",
    "publicPapers",
    "sourceCopyControls",
    "supportLeads",
    "notetaker",
    "interpreter",
    "dateTimePlace",
    "annotationPrompt",
    "pdfUrl"
  ];
  const body = rows.map((row) =>
    [
      row.sequence,
      row.date,
      row.type,
      row.annotationScore,
      row.suggestedTreatment,
      row.packetPages,
      row.actualConversationPacketPages,
      row.title,
      row.topTopics.join("; "),
      row.topAuthorities.join("; "),
      row.pddReferences,
      row.publicPapers,
      row.sourceCopyControls,
      row.supportLeads,
      row.notetaker,
      row.interpreter,
      row.dateTimePlace,
      row.annotationPrompt,
      row.pdfUrl
    ]
      .map(csvCell)
      .join(",")
  );
  fs.writeFileSync(path.join(ROOT, "reports/annotation-document-queue.csv"), `${fields.join(",")}\n${body.join("\n")}\n`);
}

function topDocumentLinks(docs) {
  return docs
    .slice(0, 5)
    .map((doc) => `${htmlLink(`#${doc.sequence} ${doc.date}`, doc.pdfUrl)} (${htmlCell(doc.hits)} hits)`)
    .join("; ");
}

function buildHtml(report) {
  const targetRows = report.authorityTargets
    .map(
      (target) => `<tr>
        <td>${htmlCell(target.priority)}</td>
        <td>${htmlCell(target.key)}</td>
        <td>${htmlCell(target.type)}</td>
        <td>${htmlCell(target.documentCount)}</td>
        <td>${htmlCell(target.totalHits)}</td>
        <td>${htmlCell(`${target.firstDate} - ${target.lastDate}`)}</td>
        <td>${htmlCell(target.role)}<p>${htmlCell(target.annotationNote)}</p></td>
        <td>${topDocumentLinks(target.topDocuments)}</td>
      </tr>`
    )
    .join("\n");
  const queueRows = report.documentQueue
    .map(
      (row) => `<tr>
        <td>${htmlCell(row.sequence)}</td>
        <td>${htmlCell(row.date)}</td>
        <td>${htmlCell(row.type)}</td>
        <td>${htmlCell(row.annotationScore)}</td>
        <td>${htmlCell(row.suggestedTreatment)}</td>
        <td>${htmlCell(row.packetPages)}</td>
        <td>${htmlLink(row.title, row.pdfUrl)}</td>
        <td>${htmlCell(row.topTopics.join("; "))}</td>
        <td>${htmlCell(row.topAuthorities.join("; "))}</td>
        <td>${htmlCell(row.annotationPrompt)}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>FRUS Annotation Workbench</title>
    <style>
      body { margin: 0; color: #18212d; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f6; }
      main { width: min(1240px, calc(100% - 32px)); margin: 0 auto; padding: 34px 0 56px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; line-height: 1.08; }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3.7rem); }
      h2 { margin-top: 34px; font-size: clamp(1.45rem, 3vw, 2.15rem); }
      a { color: #25364f; font-weight: 800; }
      .lede { max-width: 940px; color: #5f6874; font-size: 1.05rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .actions a { display: inline-flex; min-height: 34px; align-items: center; padding: 0 11px; color: white; text-decoration: none; background: #25364f; border-radius: 6px; }
      .actions a:nth-child(even) { color: #25364f; background: white; border: 1px solid #d7dedb; }
      .summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin: 24px 0; }
      .summary div { padding: 14px; background: white; border: 1px solid #d7dedb; border-radius: 8px; }
      dt { color: #5f6874; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      dd { margin: 4px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: 1.45rem; font-weight: 800; }
      .table-wrap { overflow-x: auto; border-radius: 8px; box-shadow: 0 18px 46px rgba(22, 31, 43, .08); }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #d7dedb; }
      th, td { padding: 8px 9px; border-bottom: 1px solid #d7dedb; vertical-align: top; text-align: left; }
      th { color: #25364f; font-size: .78rem; text-transform: uppercase; }
      td:nth-child(1), td:nth-child(4), td:nth-child(5), td:nth-child(6) { white-space: nowrap; }
      td p { margin: 4px 0 0; color: #5f6874; }
      @media (max-width: 900px) { .summary { grid-template-columns: 1fr 1fr; } table { font-size: .86rem; } }
    </style>
  </head>
  <body>
    <main>
      <p><a href="../">Back to compiler page</a></p>
      <h1>FRUS Annotation Workbench</h1>
      <p class="lede">Generated ${htmlCell(report.generatedAt)} from the topic index, contact dossier crosswalk, and face-page audit. This is a triage aid for authority notes, issue annotations, editorial-note planning, and first-reference checks; it is not a finished FRUS index.</p>
      <div class="actions">
        <a href="annotation-targets.csv">Download authority targets CSV</a>
        <a href="annotation-document-queue.csv">Download document queue CSV</a>
        <a href="annotation-workbench.json">Open annotation JSON</a>
        <a href="topic-index.html">Open topic index</a>
        <a href="contact-dossier-crosswalk.html">Open dossier crosswalk</a>
      </div>
      <dl class="summary">
        <div><dt>Annotation Targets</dt><dd>${htmlCell(report.summary.annotationTargets)}</dd></div>
        <div><dt>Issue Targets</dt><dd>${htmlCell(report.summary.issueTargets)}</dd></div>
        <div><dt>Authority Targets</dt><dd>${htmlCell(report.summary.authorityTargets)}</dd></div>
        <div><dt>Documents Queued</dt><dd>${htmlCell(report.summary.documentsQueued)}</dd></div>
        <div><dt>Heavy Reviews</dt><dd>${htmlCell(report.summary.heavyReviewRows)}</dd></div>
      </dl>
      <h2>Authority And Issue Targets</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Priority</th><th>Target</th><th>Type</th><th>Docs</th><th>Hits</th><th>Span</th><th>Annotation note</th><th>Top documents</th></tr></thead>
          <tbody>${targetRows}</tbody>
        </table>
      </div>
      <h2>Document Annotation Queue</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Seq</th><th>Date</th><th>Type</th><th>Score</th><th>Treatment</th><th>Packet</th><th>Document</th><th>Top topics</th><th>Top authorities</th><th>Prompt</th></tr></thead>
          <tbody>${queueRows}</tbody>
        </table>
      </div>
    </main>
  </body>
</html>
`;
}

function buildReport() {
  const topicIndex = readJson(path.join(ROOT, "reports", "topic-index.json"));
  const contactDossier = readJson(path.join(ROOT, "reports", "contact-dossier-crosswalk.json"));
  const faceAudit = readJson(path.join(ROOT, "reports", "face-page-metadata.json"));
  const authorityTargets = buildAuthorityTargets(topicIndex);
  const documentQueue = buildDocumentQueue(topicIndex, contactDossier, faceAudit);
  return {
    generatedAt: new Date().toISOString(),
    scope:
      "Annotation triage aid for page-counted Clinton-Yeltsin memcons/telcons, generated from keyword/name hits, companion-source crosswalks, and face-page metadata.",
    summary: {
      annotationTargets: authorityTargets.length,
      issueTargets: authorityTargets.filter((target) => target.type === "Issue").length,
      authorityTargets: authorityTargets.filter((target) => target.type !== "Issue").length,
      documentsQueued: documentQueue.length,
      heavyReviewRows: documentQueue.filter((row) => row.suggestedTreatment === "Heavy annotation review").length,
      standardReviewRows: documentQueue.filter((row) => row.suggestedTreatment === "Standard annotation review").length,
      lightReviewRows: documentQueue.filter((row) => row.suggestedTreatment === "Light annotation check").length
    },
    authorityTargets,
    documentQueue
  };
}

const report = buildReport();
fs.writeFileSync(path.join(ROOT, "reports/annotation-workbench.json"), `${JSON.stringify(report, null, 2)}\n`);
writeTargetsCsv(report.authorityTargets);
writeQueueCsv(report.documentQueue);
fs.writeFileSync(path.join(ROOT, "reports/annotation-workbench.html"), buildHtml(report));
console.log(JSON.stringify(report.summary, null, 2));
