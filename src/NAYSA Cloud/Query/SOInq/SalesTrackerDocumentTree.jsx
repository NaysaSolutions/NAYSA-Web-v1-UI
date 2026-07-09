import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileInvoiceDollar,
  faMoneyBillWave,
  faProjectDiagram,
  faTruck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

const toNumber = (value) => Number(value || 0);
const currencySymbol = (currency = "PHP") => (String(currency || "").toUpperCase() === "PHP" ? "₱" : currency || "");
const formatAmount = (value, currency = "PHP") => `${currencySymbol(currency)} ${toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatQty = (value) => toNumber(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "-");

const SalesTrackerDocumentTree = ({ rows = [], header = {}, currency = "PHP" }) => {
  const hasRows = rows.length > 0;

  if (!hasRows && !header?.soNo) {
    return <EmptyMessage message="No document flow found for the selected SO." />;
  }

  const branches = hasRows ? rows : [{
    soNo: header.soNo,
    soDate: header.soDate,
    soAmount: header.soAmount,
    drNo: null,
    invoices: [],
  }];

  return (
    <div className="space-y-1.5">
      {branches.map((branch, index) => (
        <FlowBranch key={`${branch.drNo || "no-dr"}-${index}`} branch={branch} header={header} currency={currency} />
      ))}
    </div>
  );
};

const FlowBranch = ({ branch, header, currency }) => {
  const invoices = branch.invoices || [];
  const hasDr = !!branch.drNo;

  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex min-w-[650px] items-start gap-2">
        <DocCard
          type="SO"
          title="Sales Order"
          docNo={branch.soNo || header.soNo}
          date={branch.soDate || header.soDate}
          value={formatAmount(branch.soAmount ?? header.soAmount, currency)}
          tone="blue"
          icon={faProjectDiagram}
          caption="Order amount"
        />

        <Connector />

        {hasDr ? (
          <DocCard
            type="DR"
            title="Delivery Receipt"
            docNo={branch.drNo}
            date={branch.drDate}
            value={`Qty ${formatQty(branch.drQuantity)}`}
            tone="emerald"
            icon={faTruck}
            caption="DR Quantity"
          />
        ) : (
          <PendingCard title="No DR" description="Pending delivery" />
        )}

        <Connector />

        <div className="min-w-[165px] max-w-[220px] space-y-1.5">
          {invoices.length ? invoices.map((invoice) => (
            <InvoiceStack key={invoice.siId || invoice.siNo} invoice={invoice} currency={currency} />
          )) : <PendingCard title="No SI" description="Pending invoice" />}
        </div>
      </div>
    </div>
  );
};

const InvoiceStack = ({ invoice, currency }) => (
  <div className="space-y-1.5">
    <DocCard
      type="SI"
      title="Sales Invoice"
      docNo={invoice.siNo}
      date={invoice.siDate}
      value={formatAmount(invoice.invoiceAmount, currency)}
      tone="amber"
      icon={faFileInvoiceDollar}
      caption="Invoice amount"
    />

    {(invoice.settlements || []).length > 0 && (
      <div className="ml-2 space-y-1.5 border-l border-dashed border-slate-200 pl-2">
        {(invoice.settlements || []).map((settlement) => (
          <DocCard
            key={`${settlement.docType}-${settlement.docNo}`}
            type={settlement.docType}
            title={getSettlementTitle(settlement.docType)}
            docNo={settlement.docNo}
            date={settlement.docDate}
            value={formatAmount(settlement.appliedAmount, currency)}
            tone={getSettlementTone(settlement.docType)}
            icon={getSettlementIcon(settlement.docType)}
            caption={settlement.balanceEffect}
            compact
          />
        ))}
      </div>
    )}
  </div>
);

const DocCard = ({ type, title, docNo, date, value, tone, icon, caption, compact = false }) => {
  const cls = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    orange: "border-orange-100 bg-orange-50 text-orange-700",
    red: "border-red-100 bg-red-50 text-red-700",
    slate: "border-slate-100 bg-slate-50 text-slate-700",
  }[tone] || "border-slate-100 bg-slate-50 text-slate-700";

  return (
    <div className={`min-w-[155px] rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${compact ? "min-w-[150px]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${cls}`}>
          <FontAwesomeIcon icon={icon} className="text-[10px]" />
        </span>
        <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold ${cls}`}>{type}</span>
      </div>
      <div className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">{title}</div>
      <div className="mt-0.5 truncate text-xs font-extrabold text-slate-900">{docNo || "-"}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{formatDate(date)}</div>
      <div className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-right text-xs font-extrabold text-slate-800">{value}</div>
      {caption && <div className="mt-1.5 text-right text-[9px] font-semibold text-slate-400">{caption}</div>}
    </div>
  );
};

const PendingCard = ({ title, description }) => (
  <div className="flex min-h-[112px] min-w-[155px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
    <div className="text-xs font-extrabold text-slate-500">{title}</div>
    <div className="mt-0.5 text-[11px] text-slate-400">{description}</div>
  </div>
);

const Connector = () => (
  <div className="mt-[54px] flex w-6 shrink-0 items-center justify-center">
    <div className="h-0.5 flex-1 bg-slate-200" />
    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
  </div>
);

const getSettlementTitle = (docType) => {
  const type = String(docType || "").toUpperCase();
  if (type === "ARDM") return "Debit Memo";
  if (type === "ARCM") return "Credit Memo";
  return "Collection";
};

const getSettlementTone = (docType) => {
  const type = String(docType || "").toUpperCase();
  if (type === "ARDM") return "orange";
  if (type === "ARCM") return "violet";
  return "emerald";
};

const getSettlementIcon = (docType) => {
  const type = String(docType || "").toUpperCase();
  if (type === "ARDM" || type === "ARCM") return faUndo;
  return faMoneyBillWave;
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-medium text-slate-500">{message}</div>
);

export default SalesTrackerDocumentTree;
