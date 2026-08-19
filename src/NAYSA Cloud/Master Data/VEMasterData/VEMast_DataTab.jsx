import React, { useMemo } from "react";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const pick = (obj, keys = []) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== null && value !== undefined && String(value).trim() !== "") return value;
  }
  return "";
};

const VEMast_DataTab = ({
  isLoading = false,
  rows = [],
  onRowDoubleClick,
}) => {
  const docType = "VEMast";

  const tableColumns = useMemo(
    () => [
      { key: "itemCode", label: "Vehicle No", sortable: true, width: 140 },
      { key: "itemDesc", label: "Vehicle Description", sortable: true, width: 260 },
      { key: "uom", label: "UOM", sortable: true, width: 90 },
      { key: "categoryCode", label: "Category Code", sortable: true, width: 140 },
      { key: "categoryName", label: "Category Name", sortable: true, width: 180 },
      { key: "classCode", label: "Class Code", sortable: true, width: 120 },
      { key: "className", label: "Class Name", sortable: true, width: 180 },
      { key: "qtyOnHand", label: "Qty on Hand", sortable: true, width: 120 },
      { key: "sellingPrice", label: "Selling Price", sortable: true, width: 120 },
      { key: "stdPoPrice", label: "Std PO Price", sortable: true, width: 120 },
      { key: "unitCost", label: "Unit Cost", sortable: true, width: 120 },
      { key: "lastPurPrice", label: "Last Purchase Price", sortable: true, width: 140 },
      { key: "active", label: "Active", sortable: true, width: 80 },
    ],
    []
  );

  const tableData = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];

    return list.map((row) => ({
      ...row,
      itemCode: pick(row, ["itemCode", "item_code", "ITEM_CODE"]),
      itemDesc: pick(row, ["itemDesc", "item_name", "ITEM_NAME", "itemName"]),
      uom: pick(row, ["uom", "UOM", "uomCode", "uom_code"]),
      categoryCode: pick(row, ["categoryCode", "categCode", "categ_code", "CATEGORY_CODE"]),
      categoryName: pick(row, ["categoryName", "categName", "categ_name", "CATEGORY_NAME"]),
      classCode: pick(row, ["classCode", "class_code", "CLASS_CODE"]),
      className: pick(row, ["className", "class_name", "CLASS_NAME"]),
      qtyOnHand: pick(row, ["qtyOnHand", "qty_onhand", "QTY_ONHAND"]),
      sellingPrice: pick(row, ["sellingPrice", "selling_price", "SELLING_PRICE"]),
      stdPoPrice: pick(row, ["stdPoPrice", "std_po_price", "STD_PO_PRICE"]),
      unitCost: pick(row, ["unitCost", "unit_cost", "UNIT_COST"]),
      lastPurPrice: pick(row, ["lastPurPrice", "lastpur_price", "LASTPUR_PRICE"]),
      active: pick(row, ["active", "ACTIVE"]),
    }));
  }, [rows]);

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <SearchGlobalReferenceTable
        columns={tableColumns}
        data={tableData}
        itemsPerPage={50}
        showFilters={false}
        showGlobalSearch={false}
        rightActionLabel="View"
        docType={docType}
        onRowDoubleClick={onRowDoubleClick}
        isLoading={isLoading}
      />
    </div>
  );
};

export default VEMast_DataTab;
