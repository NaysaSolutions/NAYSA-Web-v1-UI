import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "workOrderNo", label: "Work Order No.", type: "lookup", required: true, readOnly: true }, { key: "workOrderDate", label: "Work Order Date", type: "date", disabled: true },
  { key: "itemCode", label: "Item Code", disabled: true }, { key: "itemDescription", label: "Item Description", disabled: true },
  { key: "uom", label: "UOM", disabled: true }, { key: "bomQty", label: "BOM Qty", type: "amount", disabled: true },
  { key: "batchQty", label: "Batch Qty", type: "amount", disabled: true }, { key: "qtyToProduce", label: "Qty to Produce", type: "amount", disabled: true },
];
const columns = [
  { key: "processCode", label: "Process Code", width: 130 }, { key: "processDescription", label: "Process Description", width: 420 },
  { key: "cycleTime", label: "Cycle Time (Hour)", width: 160, align: "right", numeric: true }, { key: "standardHourlyRate", label: "Std Hourly Rate", width: 160, align: "right", numeric: true },
  { key: "amount", label: "Amount", width: 170, align: "right", numeric: true },
];
const summaryColumns = [
  { key: "workOrderNo", label: "Work Order No.", width: 140 }, { key: "workOrderDate", label: "Work Order Date", width: 140 },
  { key: "itemCode", label: "Item Code", width: 150 }, { key: "itemDescription", label: "Item Name", width: 320 },
  { key: "qtyToProduce", label: "Quantity to Produce", width: 170, align: "right", numeric: true }, { key: "registeredBy", label: "Registered By", width: 140 },
];
const RentAllocation = (props) => <FOHTransactionPanel {...props} title="Rent Allocation Transaction" detailTitle="Rent Allocation Details" headerFields={headerFields} columns={columns} totalLabel="Total Rent Allocation" totalKey="amount" endpoints={{ load: "/prodFOHTransaction/loadRentAllocation", get: "/prodFOHTransaction/getRentAllocation", upsert: "/prodFOHTransaction/upsertRentAllocation", lookupDetails: "/prodFOHTransaction/lookupRentByWorkOrder", lookupType: "rentAllocation" }} summaryColumns={summaryColumns} />;

export default RentAllocation;
