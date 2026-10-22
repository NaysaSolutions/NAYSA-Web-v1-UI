import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "workOrderNo", label: "Work Order No.", type: "lookup", required: true, readOnly: true }, { key: "workOrderDate", label: "Work Order Date", type: "date", disabled: true },
  { key: "itemCode", label: "Item Code", disabled: true }, { key: "itemDescription", label: "Item Description", disabled: true },
  { key: "uom", label: "UOM", disabled: true }, { key: "bomQty", label: "BOM Qty", type: "amount", disabled: true },
  { key: "batchQty", label: "Batch Qty", type: "amount", disabled: true }, { key: "qtyToProduce", label: "Qty to Produce", type: "amount", disabled: true },
];
const columns = [
  { key: "processCode", label: "Process Code", width: 130 }, { key: "processDescription", label: "Process Description", width: 360 },
  { key: "actualCycleTime", label: "Actual Cycle Time - Hours", width: 170, align: "right", numeric: true }, { key: "actualHeadCount", label: "Actual Total Head Count", width: 170, align: "right", numeric: true },
  { key: "actualHourlyRate", label: "Actual Hourly Rate", width: 160, align: "right", numeric: true }, { key: "actualLaborCost", label: "Actual Labor Cost", width: 170, align: "right", numeric: true },
];
const summaryColumns = [
  { key: "workOrderNo", label: "Work Order No.", width: 140 },
  { key: "workOrderDate", label: "Work Order Date", width: 140 },
  { key: "itemCode", label: "Item Code", width: 150 },
  { key: "itemDescription", label: "Item Name", width: 320 },
  { key: "qtyToProduce", label: "Quantity to Produce", width: 170, align: "right", numeric: true },
  { key: "registeredBy", label: "Registered By", width: 140 },
  { key: "registeredDate", label: "Registered Date", width: 190 },
];

const DirectLabor = (props) => <FOHTransactionPanel {...props} title="Direct Labor Reporting" detailTitle="Direct Labor Details" headerFields={headerFields} columns={columns} totalLabel="Total Labor Cost" endpoints={{ load: "/prodFOHTransaction/loadDirectLabor", get: "/prodFOHTransaction/getDirectLabor", upsert: "/prodFOHTransaction/upsertDirectLabor" }} summaryColumns={summaryColumns} />;

export default DirectLabor;
