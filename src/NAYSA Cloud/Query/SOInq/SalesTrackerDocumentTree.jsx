import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faFileInvoice,
  faFileInvoiceDollar,
  faMoneyBillWave,
  faReceipt,
  faTruck,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

const formatAmount = (value, currency = "PHP") => `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
const hasValue = (value) => value !== null && value !== undefined && value !== "";

const typeMeta = (docType = "") => {
  const type = String(docType || "").toUpperCase();
  if (type === "SO") return { label: "Sales Order", icon: faFileAlt, color: "blue", line: "border-blue-200" };
  if (type === "DR") return { label: "Delivery Receipt", icon: faTruck, color: "emerald", line: "border-emerald-200" };
  if (type === "SI") return { label: "Sales Invoice", icon: faFileInvoice, color: "orange", line: "border-orange-200" };
  if (type === "AR" || type === "CR" || type === "OR") return { label: "Collection", icon: faReceipt, color: "violet", line: "border-violet-200" };
  if (type === "ARCM" || type === "CM") return { label: "Credit Memo", icon: faUndo, color: "red", line: "border-red-200" };
  if (type === "ARDM" || type === "DM") return { label: "Debit Memo", icon: faFileInvoiceDollar, color: "cyan", line: "border-cyan-200" };
  return { label: docType || "Document", icon: faMoneyBillWave, color: "slate", line: "border-slate-200" };
};

const colorClass = (color) => ({
  blue: "bg-blue-600 text-white",
  emerald: "bg-emerald-600 text-white",
  orange: "bg-orange-500 text-white",
  violet: "bg-violet-600 text-white",
  red: "bg-red-600 text-white",
  cyan: "bg-cyan-600 text-white",
  slate: "bg-slate-500 text-white",
}[color] || "bg-slate-500 text-white");

const textClass = (color) => ({
  blue: "text-blue-700",
  emerald: "text-emerald-700",
  orange: "text-orange-700",
  violet: "text-violet-700",
  red: "text-red-700",
  cyan: "text-cyan-700",
  slate: "text-slate-700",
}[color] || "text-slate-700");

const SalesTrackerDocumentTree = ({ rows = [], currency = "PHP" }) => {
  if (!rows.length) {
    return <EmptyMessage message="No document tree found for the selected SO." />;
  }

  const tableRows = annotateTreeRows(flattenRows(rows));

  return (
    <div className="overflow-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-[920px] w-full text-xs">
        <thead className="sticky top-0 z-10 bg-blue-100 shadow-sm">
          <tr>
            <th className="border-b border-blue-200 px-5 py-2 text-left text-[11px] font-bold text-blue-900">Document</th>
            <th className="w-32 border-b border-blue-200 px-3 py-2 text-left text-[11px] font-bold text-blue-900">Date</th>
            <th className="w-36 border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Amount</th>
            <th className="w-36 border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Balance</th>
            <th className="w-44 border-b border-blue-200 px-3 py-2 text-right text-[11px] font-bold text-blue-900">Applied / Info</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {tableRows.map((row, index) => (
            <DocumentRow key={`${row.docType}-${row.docNo}-${index}`} row={row} currency={currency} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const DocumentRow = ({ row, currency }) => {
  const meta = typeMeta(row.docType);
  const indent = Math.max(0, Number(row.level || 0));
  const hasConnector = indent > 0;
  const connectorOffset = 30;
  const iconSize = 24;
  const branchCenter = 12;
  const childConnectorLevel = indent + 1;

  return (
    <tr className="align-top hover:bg-slate-50/70">
      <td className="px-5 py-2">
        <div
          className="relative flex min-h-8 items-start"
          style={{ paddingLeft: `${indent * connectorOffset}px` }}
        >
          {(row.ancestorConnectors || []).map((connector) => (
            <span
              key={`ancestor-${connector.level}`}
              className={`absolute bottom-[-8px] top-[-8px] border-l-2 ${connector.line}`}
              style={{ left: `${connector.level * connectorOffset - connectorOffset / 2}px` }}
            />
          ))}
          {row.hasChild && (
            <span
              className={`absolute bottom-[-8px] border-l-2 ${row.childLine}`}
              style={{
                left: `${childConnectorLevel * connectorOffset - connectorOffset / 2}px`,
                top: `${iconSize}px`,
              }}
            />
          )}
          {hasConnector && (
            <>
              <span
                className={`absolute border-l-2 ${meta.line}`}
                style={{
                  left: `${indent * connectorOffset - connectorOffset / 2}px`,
                  top: "-8px",
                  bottom: row.hasNextSibling ? "-8px" : `calc(100% - ${branchCenter}px)`,
                }}
              />
              <span
                className={`absolute h-px border-t-2 ${meta.line}`}
                style={{
                  left: `${indent * connectorOffset - connectorOffset / 2}px`,
                  top: `${branchCenter}px`,
                  width: `${connectorOffset / 2}px`,
                }}
              />
            </>
          )}
          <span className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded ${colorClass(meta.color)}`}>
            <FontAwesomeIcon icon={meta.icon} className="text-[11px]" />
          </span>
          <div className="min-w-0">
            <span className={`font-extrabold ${textClass(meta.color)}`}>{row.docNo || "-"}</span>
            <span className={`ml-2 font-bold ${textClass(meta.color)}`}>({meta.label})</span>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 font-medium text-slate-600">{formatDate(row.docDate)}</td>
      <td className="px-3 py-2.5 text-right font-bold text-slate-700">{hasValue(row.amount) ? formatAmount(row.amount, currency) : ""}</td>
      <td className="px-3 py-2.5 text-right font-bold text-slate-700">{hasValue(row.balance) ? formatAmount(row.balance, currency) : ""}</td>
      <td className="px-3 py-2.5 text-right font-medium text-slate-600">{hasValue(row.applied) ? `Applied: ${formatAmount(row.applied, currency)}` : row.info || ""}</td>
    </tr>
  );
};

const annotateTreeRows = (rows) => rows.map((row, index) => {
  const level = Math.max(0, Number(row.level || 0));
  const nextLevel = Math.max(0, Number(rows[index + 1]?.level || 0));
  const hasChild = nextLevel > level;
  const hasNextSibling = hasFollowingSibling(rows, index, level);
  const ancestorConnectors = [];

  for (let connectorLevel = 1; connectorLevel < level; connectorLevel += 1) {
    if (hasFollowingSibling(rows, index, connectorLevel)) {
      ancestorConnectors.push({
        level: connectorLevel,
        line: typeMeta(getNearestDocTypeAtLevel(rows, index, connectorLevel)).line,
      });
    }
  }

  return {
    ...row,
    hasChild,
    childLine: hasChild ? typeMeta(rows[index + 1]?.docType).line : "",
    hasNextSibling,
    ancestorConnectors,
  };
});

const hasFollowingSibling = (rows, rowIndex, level) => {
  if (level <= 0) return false;

  for (let index = rowIndex + 1; index < rows.length; index += 1) {
    const nextLevel = Math.max(0, Number(rows[index]?.level || 0));
    if (nextLevel < level) return false;
    if (nextLevel === level) return true;
  }

  return false;
};

const getNearestDocTypeAtLevel = (rows, rowIndex, level) => {
  for (let index = rowIndex; index >= 0; index -= 1) {
    const row = rows[index];
    if (Math.max(0, Number(row?.level || 0)) === level) {
      return row.docType;
    }
  }

  return "";
};

const flattenRows = (rows) => {
  const result = [];
  const first = rows[0] || {};
  const soNo = first.soNo || first.parentSoNo;

  if (soNo) {
    result.push({
      level: 0,
      docType: "SO",
      docNo: soNo,
      docDate: first.soDate,
      amount: first.soAmount,
      balance: first.balanceAmount ?? first.soBalanceAmount,
      applied: "",
    });
  }

  rows.forEach((dr) => {
    if (dr.drNo) {
      result.push({
        level: 1,
        docType: "DR",
        docNo: dr.drNo,
        docDate: dr.drDate,
        amount: dr.drAmount,
        balance: dr.balanceAmount ?? dr.drBalanceAmount,
        applied: "",
      });
    }

    (dr.invoices || []).forEach((si) => {
      result.push({
        level: 2,
        docType: "SI",
        docNo: si.siNo,
        docDate: si.siDate,
        amount: si.invoiceAmount,
        balance: si.balanceAmount,
        applied: "",
      });

      (si.settlements || []).forEach((settlement) => {
        result.push({
          level: 3,
          docType: normalizeSettlementType(settlement.docType),
          docNo: settlement.docNo,
          docDate: settlement.docDate,
          amount: settlement.amount ?? settlement.appliedAmount,
          balance: "",
          applied: settlement.appliedAmount,
          info: settlement.balanceEffect,
        });
      });
    });
  });

  return result;
};

const normalizeSettlementType = (docType) => {
  const type = String(docType || "").toUpperCase();
  if (type === "AR" || type === "CR") return "OR";
  if (type === "ARCM") return "CM";
  if (type === "ARDM") return "DM";
  return type;
};

const EmptyMessage = ({ message }) => (
  <div className="rounded-lg border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-500">{message}</div>
);

export default SalesTrackerDocumentTree;
