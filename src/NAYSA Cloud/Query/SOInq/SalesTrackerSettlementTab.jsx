import React from "react";

const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const badgeClass = (docType) => {
  if (docType === "AR" || docType === "CR") return "bg-green-50 text-green-700 border-green-200";
  if (docType === "ARCM") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (docType === "ARDM") return "bg-orange-50 text-orange-700 border-orange-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
};

const SalesTrackerSettlementTab = ({ rows = [] }) => {
  if (!rows.length) return <EmptyMessage message="No settlement, credit memo, or debit memo found." />;

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-xs">
        <thead className="sticky top-0 z-10 bg-blue-100 shadow-sm">
          <tr>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Doc Type</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Doc No</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Doc Date</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">SI No</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Effect</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Applied Amount</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Remarks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={`${row.docType}-${row.docId || row.docNo}`} className="hover:bg-blue-50/40">
              <td className="px-3 py-2"><span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClass(row.docType)}`}>{row.docType}</span></td>
              <td className="px-3 py-2 font-semibold text-blue-700">{row.docNo}</td>
              <td className="px-3 py-2">{formatDate(row.docDate)}</td>
              <td className="px-3 py-2 font-medium text-gray-700">{row.siNo}</td>
              <td className="px-3 py-2">{row.balanceEffect}</td>
              <td className="px-3 py-2 text-right font-semibold">{formatAmount(row.appliedAmount)}</td>
              <td className="px-3 py-2 text-gray-500">{row.remarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-gray-500">{message}</div>
);

export default SalesTrackerSettlementTab;
