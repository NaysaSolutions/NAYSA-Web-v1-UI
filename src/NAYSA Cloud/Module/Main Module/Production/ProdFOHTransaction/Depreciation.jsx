import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "cutoffPeriod", label: "Cut-off Period", required: true },
  { key: "depreciationExpense", label: "Production FOH Depreciation Expense", type: "amount", required: true, defaultValue: "0.00" },
  { key: "remarks", label: "Remarks", type: "textarea", className: "md:col-span-2" },
];
const columns = [
  { key: "cutoffPeriod", label: "Cut-off Period", width: 140 }, { key: "operatingHours", label: "Total Operating Hours", width: 170, align: "right", numeric: true },
  { key: "depreciationCost", label: "Total Depreciation Cost", width: 190, align: "right", numeric: true }, { key: "actualHourlyRate", label: "Actual per Hour Rate", width: 180, align: "right", numeric: true },
  { key: "productionHourlyRate", label: "Production Report per Hour Rate", width: 220, align: "right", numeric: true }, { key: "remarks", label: "Remarks", width: 240 },
];
const Depreciation = (props) => <FOHTransactionPanel {...props} title="FOH Monthly Depreciation Expense" detailTitle="Depreciation Expense History" headerFields={headerFields} columns={columns} initialRows={4} totalLabel="Current Rate" />;

export default Depreciation;
