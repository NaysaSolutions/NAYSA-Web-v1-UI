import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "cutoffPeriod", label: "Cut-off Period", required: true },
  { key: "electricityExpense", label: "Production FOH Electricity Expense", type: "amount", required: true, defaultValue: "0.00" },
  { key: "remarks", label: "Remarks", type: "textarea", className: "md:col-span-2" },
];
const columns = [
  { key: "cutoffPeriod", label: "Cut-off Period", width: 140 }, { key: "operatingHours", label: "Total Operating Hours", width: 170, align: "right", numeric: true },
  { key: "electricityCost", label: "Total Electricity Cost", width: 180, align: "right", numeric: true }, { key: "actualHourlyRate", label: "Actual per Hour Rate", width: 180, align: "right", numeric: true },
  { key: "productionHourlyRate", label: "Production Report per Hour Rate", width: 220, align: "right", numeric: true }, { key: "remarks", label: "Remarks", width: 240 },
];
const summaryColumns = [
  { key: "cutoffPeriod", label: "Cut-off Period", width: 180 }, { key: "productionFohExpense", label: "Production FOH Expense", width: 220, align: "right", numeric: true, decimals: 2 },
  { key: "registeredBy", label: "Registered By", width: 180 }, { key: "registeredDate", label: "Registered Date", width: 220 },
];
const Electricity = (props) => <FOHTransactionPanel {...props} title="FOH Electricity Expense" detailTitle="Electricity Expense History" headerFields={headerFields} columns={columns} initialRows={4} totalLabel="Current Rate" endpoints={{ load: "/prodFOHTransaction/loadElectricity", get: "/prodFOHTransaction/getElectricity", upsert: "/prodFOHTransaction/upsertElectricity" }} summaryColumns={summaryColumns} />;

export default Electricity;
