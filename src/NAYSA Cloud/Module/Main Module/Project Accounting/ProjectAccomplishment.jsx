import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBoxesStacked, faChartLine, faCheck, faChevronLeft, faChevronRight, faClockRotateLeft, faDiagramProject, faFileInvoice, faFolderOpen, faMagnifyingGlass, faPesoSign, faRotate } from "@fortawesome/free-solid-svg-icons";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import SearchProjectRef from "@/NAYSA Cloud/Lookup/SearchProjectRef.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";

const tabs = [
  { key: "overview", label: "Project Overview", icon: faChartLine },
  { key: "tracker", label: "Progress Tracker", icon: faDiagramProject },
  { key: "transactions", label: "Transaction Timeline", icon: faClockRotateLeft },
  { key: "boq", label: "BOQ Item Flow", icon: faBoxesStacked },
];
const transactionColumns = [
  { key: "documentDate", label: "Date", renderType: "date", minWidth: 105 },
  { key: "documentType", label: "Type", minWidth: 80 },
  { key: "documentName", label: "Transaction", minWidth: 170 },
  { key: "documentNo", label: "Document No.", minWidth: 120 },
  { key: "referenceNo", label: "Reference No.", minWidth: 120 },
  { key: "amount", label: "Amount", renderType: "currency", roundingOff: 2, minWidth: 130 },
  { key: "documentStatus", label: "Document Status", minWidth: 120 },
];
const createBoqColumns = (quantityDecimals, unitCostDecimals) => [
  { key: "boqNo", label: "BOQ No.", minWidth: 110 },
  { key: "boqLineNo", label: "LN", renderType: "number", roundingOff: 0, minWidth: 60 },
  { key: "itemType", label: "Type", minWidth: 70 },
  { key: "itemCode", label: "Item Code", minWidth: 120 },
  { key: "itemName", label: "Item Name", minWidth: 220 },
  { key: "uom", label: "UOM", minWidth: 75 },
  { key: "boqQuantity", label: "BOQ Quantity", renderType: "number", roundingOff: quantityDecimals, minWidth: 125 },
  { key: "mrQuantity", label: "MR Quantity", renderType: "number", roundingOff: quantityDecimals, minWidth: 120 },
  { key: "issuedQuantity", label: "Issued Quantity", renderType: "number", roundingOff: quantityDecimals, minWidth: 125 },
  { key: "backloadQuantity", label: "Backload Quantity", renderType: "number", roundingOff: quantityDecimals, minWidth: 135 },
  { key: "issueBalance", label: "Issue Balance", renderType: "number", roundingOff: quantityDecimals, minWidth: 120 },
  { key: "unitCost", label: "Unit Cost", renderType: "number", roundingOff: unitCostDecimals, minWidth: 110 },
  { key: "boqAmount", label: "BOQ Amount", renderType: "currency", roundingOff: 2, minWidth: 130 },
];
const money = (value) => Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—";
const calculateProjectDuration = (startValue, endValue) => {
  if (!startValue) return "—";
  const start = new Date(startValue);
  const end = endValue ? new Date(endValue) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "—";

  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth();
  let anchor = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());
  if (anchor > endDate) {
    months -= 1;
    anchor = new Date(startDate.getFullYear(), startDate.getMonth() + months, startDate.getDate());
  }
  const days = Math.max(0, Math.floor((endDate - anchor) / 86400000));
  const monthLabel = `${months} month${months === 1 ? "" : "s"}`;
  const dayLabel = `${days} day${days === 1 ? "" : "s"}`;
  return `${monthLabel}, ${dayLabel}`;
};
const statusClass = (status = "") => {
  const value = String(status).toUpperCase();
  if (value.includes("CANCEL")) return "border-red-200 bg-red-50 text-red-700";
  if (value.includes("COMPLETE") || value.includes("FINAL")) return "border-blue-200 bg-blue-50 text-blue-700";
  if (value.includes("PROGRESS") || value.includes("OPEN") || value.includes("ON-GOING")) return "border-amber-200 bg-amber-50 text-amber-700";
  if (value === "NEW") return "border-blue-200 bg-blue-100 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};
const projectStatusLabel = (status = "") => ({ N: "New", O: "On-Going", C: "Completed" }[String(status).toUpperCase()] || status || "New");
const EmptyState = ({ text }) => <div className="flex min-h-40 flex-col items-center justify-center text-slate-400"><FontAwesomeIcon icon={faFolderOpen} className="mb-2 text-3xl text-slate-300" /><p className="text-xs font-medium">{text}</p></div>;

const ProjectAccomplishment = () => {
  const { companyInfo } = useAuth();
  const quantityDecimals = Number.isFinite(Number(companyInfo?.itemDecqtyFG)) ? Number(companyInfo.itemDecqtyFG) : 2;
  const unitCostDecimals = Number.isFinite(Number(companyInfo?.itemDecUcostFG)) ? Number(companyInfo.itemDecUcostFG) : 6;
  const boqReportColumns = useMemo(() => createBoqColumns(quantityDecimals, unitCostDecimals), [quantityDecimals, unitCostDecimals]);
  const [activeTab, setActiveTab] = useState("overview");
  const [projectLookup, setProjectLookup] = useState(false);
  const [project, setProject] = useState(null);
  const [report, setReport] = useState({ overview: null, stages: [], transactions: [], boqItems: [] });
  const [loading, setLoading] = useState(false);
  const [documentFilter, setDocumentFilter] = useState("ALL");
  const [hideNav, setHideNav] = useState(false);

  const loadProject = async (selectedProject) => {
    if (!selectedProject?.projectCode) return;
    setProject(selectedProject);
    setLoading(true);
    try {
      const response = await postRequest("getProjectAccomplishmentTracker", { json_data: { projectCode: selectedProject.projectCode } });
      const raw = response?.data?.[0]?.result;
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const stages = Array.isArray(parsed?.stages)
        ? parsed.stages.filter((row) => String(row?.stageCode || "").toUpperCase() !== "AC")
        : [];
      const transactions = Array.isArray(parsed?.transactions)
        ? parsed.transactions.filter((row) => String(row?.documentType || "").toUpperCase() !== "AC")
        : [];
      setReport({ overview: parsed?.overview || null, stages, transactions, boqItems: Array.isArray(parsed?.boqItems) ? parsed.boqItems : [] });
    } catch (error) {
      console.error("Project Accomplishment tracker load error:", error);
      setReport({ overview: null, stages: [], transactions: [], boqItems: [] });
    } finally { setLoading(false); }
  };

  const filteredTransactions = useMemo(() => documentFilter === "ALL" ? report.transactions : report.transactions.filter((row) => row.documentType === documentFilter), [documentFilter, report.transactions]);
  const latestTransactionByStage = useMemo(() => report.transactions.reduce((latest, row) => {
    const stageCode = String(row?.documentType || "").toUpperCase();
    const transactionDate = row?.documentDate ? new Date(row.documentDate) : null;
    if (!stageCode || !transactionDate || Number.isNaN(transactionDate.getTime())) return latest;
    if (!latest[stageCode] || transactionDate > latest[stageCode]) latest[stageCode] = transactionDate;
    return latest;
  }, {}), [report.transactions]);
  const completedStages = report.stages.filter((stage) => stage.status === "Completed").length;
  const activeStages = report.stages.filter((stage) => Number(stage.documentCount) > 0).length;
  const progress = report.stages.length ? Math.round((completedStages / report.stages.length) * 100) : 0;
  const overview = report.overview;
  const projectDuration = calculateProjectDuration(overview?.startDate, overview?.endDate);

  return <div className="global-ref-main-div-ui text-[12px] text-slate-800">
    {loading && <LoadingSpinner />}
    <div className="global-ref-header-ui">
      <div className="flex w-full items-center justify-between gap-3 lg:min-h-[40px]">
        <h1 className="global-ref-headertext-ui truncate">Project Accomplishment</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => project && loadProject(project)} disabled={!project || loading} className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"><FontAwesomeIcon icon={faRotate} /><span className="ml-2 hidden sm:inline">Refresh</span></button>
          <button type="button" onClick={() => setHideNav((value) => !value)} className="hidden shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90 lg:inline-flex"><FontAwesomeIcon icon={hideNav ? faChevronRight : faChevronLeft} /><span className="ml-2 hidden xl:inline">{hideNav ? "Expand Nav" : "Collapse Nav"}</span></button>
        </div>
      </div>
    </div>
    <div className="mt-32 px-0 sm:mt-24">
      <section className="global-tran-tab-div-ui !m-0 !p-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-50 via-white to-white px-4 py-3"><div><div className="text-sm font-semibold text-slate-800">Project Snapshot</div><div className="mt-0.5 text-[11px] text-slate-500">Select a project and review its current financial and operational position.</div></div>{overview && <span className={`inline-flex min-w-[64px] items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-sm ${statusClass(projectStatusLabel(overview.projectStatus))}`}>{projectStatusLabel(overview.projectStatus)}</span>}</div>
          <div className="p-4">
          <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-50 lg:grid-cols-[0.8fr_2fr_1.2fr] lg:divide-x lg:divide-slate-200">
            <button type="button" onClick={() => setProjectLookup(true)} className="flex min-h-[54px] items-center justify-between bg-white px-4 text-left transition hover:bg-blue-50"><span className="min-w-0"><span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">Project Code</span><span className={`mt-1 block truncate text-sm font-bold ${project?.projectCode ? "text-blue-700" : "text-slate-400"}`}>{project?.projectCode || "Select Project"}</span></span><span className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" /></span></button>
            <div className="flex min-h-[54px] flex-col justify-center border-t border-slate-200 px-4 lg:border-t-0"><div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Project Name</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{overview?.projectName || project?.projectName || "—"}</div></div>
            <div className="flex min-h-[54px] flex-col justify-center border-t border-slate-200 px-4 lg:border-t-0"><div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Customer</div><div className="mt-1 truncate text-sm font-semibold text-slate-800">{overview?.customerName || project?.customerName || "—"}</div></div>
          </div>
          {overview && <div className="mt-3 grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 xl:grid-cols-5 xl:divide-x xl:divide-slate-200">{[["Contract Amount",`₱ ${money(overview.contractAmount)}`,faPesoSign,"bg-blue-50 text-blue-600"],["Budget Amount",`₱ ${money(overview.budgetAmount)}`,faChartLine,"bg-cyan-50 text-cyan-600"],["BOQ Amount",`₱ ${money(overview.boqAmount)}`,faFileInvoice,"bg-indigo-50 text-indigo-600"],["Material Issued",`₱ ${money(overview.issuedAmount)}`,faBoxesStacked,"bg-amber-50 text-amber-600"],["Project Progress",`${progress}%`,faCheck,"bg-emerald-50 text-emerald-600"]].map(([label,value,icon,color])=><div key={label} className="flex min-h-[76px] items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 xl:border-b-0"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm ${color}`}><FontAwesomeIcon icon={icon} /></div><div className="min-w-0 flex-1"><div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 truncate text-base font-bold text-slate-800">{value}</div>{label === "Project Progress" && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{width:`${progress}%`}} /></div>}</div></div>)}</div>}
          </div>
        </div>
      </section>
      <div className="mt-3 flex items-stretch gap-3">
      <aside className={`hidden transition-all duration-200 lg:block ${hideNav ? "w-[120px]" : "w-[290px]"}`}><div className="global-tran-tab-div-ui h-full !m-0 !p-4"><div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b px-4 py-4">{hideNav ? <div className="text-center text-[11px] font-semibold text-blue-700">PRJ</div> : <><div className="text-sm font-semibold text-slate-800">Project Accomplishment</div><div className="mt-1 text-xs text-slate-500">Choose a report presentation.</div></>}</div><nav className="space-y-2 p-3">{tabs.map((tab) => <button key={tab.key} type="button" title={tab.label} onClick={() => setActiveTab(tab.key)} className={`flex w-full items-center rounded-xl border px-3 py-3 text-xs font-semibold transition ${hideNav ? "min-h-[58px] flex-col justify-center gap-1.5 text-center" : "gap-3 text-left"} ${activeTab === tab.key ? "border-blue-700 bg-blue-600 text-white shadow-sm" : "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"}`}><FontAwesomeIcon icon={tab.icon} className="w-4 shrink-0" /><span className={hideNav ? "text-[9px] font-semibold leading-tight" : ""}>{hideNav ? tab.label.replace("Project ", "") : tab.label}</span></button>)}</nav>{overview && !hideNav && <div className="mx-3 mb-3 rounded-lg border border-blue-100 bg-blue-50 p-3"><div className="mb-2 flex justify-between text-[10px] font-semibold text-blue-800"><span>Overall Progress</span><span>{progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} /></div><div className="mt-2 text-[10px] text-blue-600">{activeStages} active · {completedStages} completed</div></div>}</div></div></aside>
      <div className="min-w-0 flex-1">
      <main className="min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm">
        {!overview && <EmptyState text="Select a project to view its accomplishment report." />}
        {overview && activeTab === "overview" && <div className="p-4"><div className="mb-3"><h2 className="text-sm font-bold text-blue-700">Project Information</h2><p className="text-[10px] text-slate-500">Detailed project classification, schedule, and responsibility</p></div><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{[["Project Type",overview.projectType],["Project Year",overview.year],["Activity",overview.activityName],["Phase",overview.phaseName],["Site",overview.siteName],["Responsibility Center",overview.rcName],["Start Date",formatDate(overview.startDate)],["End Date",formatDate(overview.endDate)],["Project Duration",projectDuration]].map(([label,value]) => <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"><div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div><div className="mt-0.5 truncate text-xs font-semibold">{value || "—"}</div></div>)}</div></div>}
        {overview && activeTab === "tracker" && <div className="p-3"><div className="mb-3"><h2 className="text-sm font-bold text-blue-700">Project Progress Tracker</h2><p className="text-[10px] text-slate-500">Follow the project from Job Order through material movement</p></div><div className="relative ml-3 border-l border-blue-100 pl-5">{report.stages.map((stage,index) => <div key={stage.stageCode} className="relative mb-2 last:mb-0"><span className={`absolute -left-[26px] top-2.5 h-3 w-3 rounded-full border-2 border-white ${stage.status === "Completed" ? "bg-blue-600" : Number(stage.documentCount) ? "bg-amber-500" : "bg-slate-300"}`} /><div className="grid items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 hover:border-blue-200 md:grid-cols-[32px_1fr_120px_105px_120px]"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{String(index+1).padStart(2,"0")}</div><div><div className="text-xs font-bold">{stage.stageName}</div><div className="text-[9px] text-slate-500">{stage.documentCount} document{Number(stage.documentCount)===1?"":"s"}</div></div><div className="text-right"><div className="text-[9px] text-slate-500">Latest Transaction</div><div className="text-xs font-normal">{formatDate(latestTransactionByStage[String(stage.stageCode || "").toUpperCase()])}</div></div><div className="text-right"><div className="text-[9px] text-slate-500">Total Amount</div><div className="text-xs font-bold">{money(stage.totalAmount)}</div></div><div className="flex justify-end"><span className={`h-fit rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusClass(stage.status)}`}>{stage.status}</span></div></div></div>)}</div></div>}
        {overview && activeTab === "transactions" && <div className="p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-blue-700">Transaction Timeline</h2><p className="text-[10px] text-slate-500">All project documents in chronological order</p></div><select value={documentFilter} onChange={(e)=>setDocumentFilter(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs"><option value="ALL">All Transactions</option>{[...new Set(report.transactions.map((row)=>row.documentType))].map((type)=><option key={type} value={type}>{type}</option>)}</select></div>{filteredTransactions.length ? <div className="h-[440px] min-h-[340px]"><SearchGlobalReportTable columns={transactionColumns} data={filteredTransactions} itemsPerPage={50} docType="Project Accomplishment - Transaction Timeline" autoFit pagination totalExemptions={["documentType","documentName","documentNo","referenceNo","documentStatus"]} /></div> : <EmptyState text="No project transactions found." />}</div>}
        {overview && activeTab === "boq" && <div className="p-3"><div className="mb-2"><h2 className="text-sm font-bold text-blue-700">BOQ Item Flow</h2><p className="text-[10px] text-slate-500">Trace quantities from BOQ through requisition, issuance, and backload</p></div>{report.boqItems.length ? <div className="h-[460px] min-h-[360px]"><SearchGlobalReportTable columns={boqReportColumns} data={report.boqItems} itemsPerPage={50} docType="Project Accomplishment - BOQ Item Flow" pagination alwaysShowHorizontalScroll totalExemptions={["boqlineno","boqno","itemtype","itemcode","itemname","uom","groupid","unitcost"]} /></div> : <EmptyState text="No BOQ item flow found for this project." />}</div>}
      </main>
      </div>
      </div>
    </div>
    <SearchProjectRef isOpen={projectLookup} title="Select Project for Accomplishment Report" onClose={(selected)=>{setProjectLookup(false);if(selected)loadProject(selected);}} />
  </div>;
};

export default ProjectAccomplishment;
