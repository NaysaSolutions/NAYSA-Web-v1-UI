import React from "react";

const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const SalesTrackerTimelineTab = ({ rows = [] }) => {
  if (!rows.length) return <EmptyMessage message="No timeline record found." />;

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={`${row.docType}-${row.docId || row.docNo}-${index}`} className="relative pl-8">
          <div className="absolute left-2 top-0 h-full border-l-2 border-blue-100" />
          <div className="absolute left-[3px] top-3 h-4 w-4 rounded-full border-2 border-blue-300 bg-white" />
          <div className="rounded-lg border bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{row.docType}</span>
              <span className="text-sm font-semibold text-gray-800">{row.docNo}</span>
              <span className="text-xs text-gray-500">{formatDate(row.docDate)}</span>
              <span className="ml-auto text-sm font-semibold text-gray-800">{formatAmount(row.amount)}</span>
            </div>
            <div className="mt-1 text-xs text-gray-600">{row.activity}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-gray-500">{message}</div>
);

export default SalesTrackerTimelineTab;
