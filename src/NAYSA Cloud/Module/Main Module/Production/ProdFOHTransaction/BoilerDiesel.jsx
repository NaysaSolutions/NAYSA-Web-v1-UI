import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "cutoffPeriod", label: "Cut-off Period", required: true },
  { key: "dieselExpense", label: "Production FOH Boiler Diesel Expense", type: "amount", required: true, defaultValue: "0.00" },
  { key: "remarks", label: "Remarks", type: "textarea", className: "md:col-span-2" },
];

const columns = [
  { key: "cutoffPeriod", label: "Cut-off Period", width: 140 },
  { key: "operatingHours", label: "Total Boiler Operating Hours", width: 200, align: "right", numeric: true },
  { key: "dieselCost", label: "Total Boiler Diesel Cost", width: 190, align: "right", numeric: true },
  { key: "actualHourlyRate", label: "Actual per Hour Rate", width: 180, align: "right", numeric: true },
  { key: "productionHourlyRate", label: "Production Report per Hour Rate", width: 220, align: "right", numeric: true },
  { key: "remarks", label: "Remarks", width: 240 },
];
const summaryColumns = [
  { key: "cutoffPeriod", label: "Cut-off Period", width: 180 }, { key: "productionFohExpense", label: "Production FOH Expense", width: 220, align: "right", numeric: true, decimals: 2 },
  { key: "registeredBy", label: "Registered By", width: 180 }, { key: "registeredDate", label: "Registered Date", width: 220 },
];

const BoilerDiesel = (props) => <FOHTransactionPanel {...props} title="Boiler Diesel Expense" detailTitle="Boiler Diesel Expense History" headerFields={headerFields} columns={columns} initialRows={4} totalLabel="Current Rate" endpoints={{ load: "/prodFOHTransaction/loadBoilerDiesel", get: "/prodFOHTransaction/getBoilerDiesel", upsert: "/prodFOHTransaction/upsertBoilerDiesel" }} summaryColumns={summaryColumns} />;

export default BoilerDiesel;
