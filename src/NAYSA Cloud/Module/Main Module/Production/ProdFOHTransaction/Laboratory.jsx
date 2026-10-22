import React from "react";
import FOHTransactionPanel from "./FOHTransactionPanel.jsx";

const headerFields = [
  { key: "workOrderNo", label: "Work Order No.", type: "lookup", required: true, readOnly: true },
  { key: "workOrderDate", label: "Work Order Date", type: "date", disabled: true },
  { key: "itemCode", label: "Item Code", disabled: true },
  { key: "itemDescription", label: "Item Description", disabled: true },
  { key: "categoryCode", label: "Category Code", disabled: true },
  { key: "categoryDescription", label: "Category Description", disabled: true },
  { key: "uom", label: "UOM", disabled: true },
  { key: "bomQty", label: "BOM Qty", type: "amount", disabled: true },
  { key: "batchQty", label: "Batch Qty", type: "amount", disabled: true },
  { key: "qtyToProduce", label: "Qty to Produce", type: "amount", disabled: true },
  { key: "remarks", label: "Remarks", type: "textarea", className: "md:col-span-2 xl:col-span-4" },
];

const columns = [
  { key: "laboratoryCode", label: "Laboratory Code", width: 150 },
  { key: "laboratoryDescription", label: "Laboratory Description", width: 360 },
  { key: "testQuantity", label: "Test Quantity", width: 140, align: "right", numeric: true, quantity: true },
  { key: "unitCost", label: "Unit Cost", width: 150, align: "right", numeric: true },
  { key: "laboratoryCost", label: "Laboratory Cost", width: 170, align: "right", numeric: true },
  { key: "remarks", label: "Remarks", width: 260 },
];
const summaryColumns = [
  { key: "workOrderNo", label: "Work Order No.", width: 140 }, { key: "workOrderDate", label: "Work Order Date", width: 140 },
  { key: "itemCode", label: "Item Code", width: 150 }, { key: "itemDescription", label: "Item Name", width: 320 },
  { key: "qtyToProduce", label: "Quantity to Produce", width: 170, align: "right", numeric: true }, { key: "registeredBy", label: "Registered By", width: 140 },
];

const Laboratory = (props) => <FOHTransactionPanel {...props} title="Laboratory Cost Reporting" detailTitle="Laboratory Details" headerFields={headerFields} columns={columns} totalLabel="Total Laboratory Cost" totalKey="laboratoryCost" endpoints={{ load: "/prodFOHTransaction/loadLaboratory", get: "/prodFOHTransaction/getLaboratory", upsert: "/prodFOHTransaction/upsertLaboratory", lookupDetails: "/prodFOHTransaction/lookupLaboratoryByCategory" }} summaryColumns={summaryColumns} />;

export default Laboratory;
