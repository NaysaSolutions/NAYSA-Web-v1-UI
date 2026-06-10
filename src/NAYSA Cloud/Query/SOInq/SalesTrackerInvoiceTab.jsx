import React from "react";

const formatAmount = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");

const SalesTrackerInvoiceTab = ({ rows = [] }) => {
  if (!rows.length) return <EmptyMessage message="No invoice record found." />;

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="min-w-full text-xs">
        <thead className="sticky top-0 z-10 bg-blue-100 shadow-sm">
          <tr>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">DR No</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">SI No</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">SI Date</th>
            <th className="border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Due Date</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Invoice</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Collected</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Credit Memo</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Debit Memo</th>
            <th className="border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.siId || row.siNo} className="hover:bg-blue-50/40">
              <td className="px-3 py-2 font-medium text-gray-700">{row.drNo}</td>
              <td className="px-3 py-2 font-semibold text-blue-700">{row.siNo}</td>
              <td className="px-3 py-2">{formatDate(row.siDate)}</td>
              <td className="px-3 py-2">{formatDate(row.dueDate)}</td>
              <td className="px-3 py-2 text-right">{formatAmount(row.invoiceAmount)}</td>
              <td className="px-3 py-2 text-right">{formatAmount(row.collectionAmount)}</td>
              <td className="px-3 py-2 text-right">{formatAmount(row.creditMemoAmount)}</td>
              <td className="px-3 py-2 text-right">{formatAmount(row.debitMemoAmount)}</td>
              <td className="px-3 py-2 text-right font-semibold text-blue-700">{formatAmount(row.balanceAmount)}</td>
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

export default SalesTrackerInvoiceTab;
