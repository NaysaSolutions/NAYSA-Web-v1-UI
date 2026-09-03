import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Search, Trash2, Undo2 } from "lucide-react";
import Swal from "sweetalert2";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import SearchUOM from "@/NAYSA Cloud/Lookup/SearchUOM.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalErrorAlert as showErrorAlert,
  useSwalSuccessAlert as showSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";

const DOC_TYPE = "ItemConversionMatrix";
const TABS = [
  { key: "setup", label: "Conversion Setup" },
  { key: "details", label: "Conversion Details" },
];
const INVENTORY_TYPES = [
  { value: "FG", label: "Finished Goods" },
  { value: "RM", label: "Raw Materials" },
  { value: "MS", label: "Material Supplies" },
];

const EMPTY_HEADER = {
  invType: "FG",
  itemCode: "",
  itemName: "",
  baseUomCode: "",
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const safeJson = (value, fallback) => {
  if (value && typeof value === "object") return value;
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
};

const responseResult = (response, fallback = []) => {
  const result = response?.data?.data?.[0]?.result;
  return safeJson(result, fallback);
};

const fieldValue = (valueOrEvent) =>
  valueOrEvent?.target?.value ?? valueOrEvent ?? "";

const formatConversionQuantity = (value, decimals = 2) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity.toFixed(decimals) : Number(0).toFixed(decimals);
};

const normalizeConversionRow = (row, decimals = 2) => ({
  ...row,
  baseQtyRatio: formatConversionQuantity(row.baseQtyRatio ?? row.convQty ?? 1, decimals),
  uomQtyRatio: formatConversionQuantity(row.uomQtyRatio ?? 1, decimals),
});

const createBaseConversionRow = (invType, itemCode, baseUomCode, decimals = 2) => ({
  id: `base-${invType}-${itemCode}`,
  itemUomConvId: "",
  invType,
  itemCode,
  uomCode: baseUomCode,
  convQty: "1.000000000000",
  baseQtyRatio: formatConversionQuantity(1, decimals),
  uomQtyRatio: formatConversionQuantity(1, decimals),
  baseUomCode,
  seqNo: 1,
  active: "Y",
});

const normalizeSelectedItem = (selected) => {
  const records = Array.isArray(selected?.records)
    ? selected.records
    : selected?.records
      ? [selected.records]
      : [];
  const item = records[0] || selected || {};

  return {
    itemCode: item.itemCode || "",
    itemName: item.itemName || "",
    uomCode: item.uomCode || "",
  };
};

export default function ItemConversionMatrix() {
  const { currentUserRow, companyInfo } = useAuth();
  const [activeTab, setActiveTab] = useState("setup");
  const [loading, setLoading] = useState(false);
  const [showItemLookup, setShowItemLookup] = useState(false);
  const [uomLookupRowId, setUomLookupRowId] = useState(null);
  const [header, setHeader] = useState(EMPTY_HEADER);
  const [allRows, setAllRows] = useState([]);
  const [rows, setRows] = useState([]);
  const [detailsInvType, setDetailsInvType] = useState("FG");
  const [detailRows, setDetailRows] = useState([]);

  const userCode = currentUserRow?.userCode || "ADMIN";
  const itemLookupEndpoint = `getInvLookup${header.invType}`;
  const getQuantityDecimals = (invType = header.invType) => {
    const configuredDecimals = {
      FG: companyInfo?.itemDescQtyFG,
      RM: companyInfo?.itemDescQtyRM,
      MS: companyInfo?.itemDecqtyMS,
    }[invType];
    const decimals = Number(configuredDecimals ?? 2);
    return Number.isInteger(decimals) ? Math.min(6, Math.max(0, decimals)) : 2;
  };
  const quantityDecimals = getQuantityDecimals();

  useEffect(() => {
    document.title = "Item Conversion Matrix";
    loadConversions();
  }, []);

  const loadConversions = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/itemConversion");
      const result = responseResult(response, []);
      setAllRows(Array.isArray(result) ? result : []);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      showErrorAlert(
        "Item Conversions",
        error?.response?.data?.message || "Unable to load item conversions."
      );
      return [];
    } finally {
      setLoading(false);
    }
  };

  const filterItemRows = (sourceRows, invType, itemCode) =>
    sourceRows
      .filter((row) => row.invType === invType && row.itemCode === itemCode)
      .sort((left, right) =>
        Number(left.seqNo || 0) - Number(right.seqNo || 0)
      )
      .map((row) => ({
        ...normalizeConversionRow(row, getQuantityDecimals(invType)),
        id: row.itemUomConvId,
      }));

  const selectItem = async (selected) => {
    const item = normalizeSelectedItem(selected);
    if (!item.itemCode) return;

    const nextHeader = {
      ...EMPTY_HEADER,
      invType: header.invType,
      itemCode: item.itemCode,
      itemName: item.itemName,
      baseUomCode: item.uomCode,
    };

    let sourceRows = allRows;
    if (!sourceRows.length) sourceRows = await loadConversions();

    const itemRows = filterItemRows(sourceRows, nextHeader.invType, item.itemCode);
    const auditRow = itemRows[0] || {};

    setHeader({
      ...nextHeader,
      registeredBy: auditRow.registeredBy || "",
      registeredDate: auditRow.registeredDate || "",
      lastUpdatedBy: auditRow.lastUpdatedBy || "",
      lastUpdatedDate: auditRow.lastUpdatedDate || "",
    });
    setRows(
      itemRows.length
        ? itemRows
        : [createBaseConversionRow(
            nextHeader.invType,
            item.itemCode,
            item.uomCode,
            getQuantityDecimals(nextHeader.invType)
          )]
    );
  };

  const resetMatrix = () => {
    setHeader((previous) => ({ ...EMPTY_HEADER, invType: previous.invType }));
    setRows([]);
    setActiveTab("setup");
  };

  const changeInventoryType = (valueOrEvent) => {
    const invType = fieldValue(valueOrEvent);
    setHeader({ ...EMPTY_HEADER, invType });
    setRows([]);
  };

  const resetDetails = () => {
    setDetailsInvType("FG");
    setDetailRows([]);
  };

  const findDetails = async () => {
    const sourceRows = await loadConversions();
    const historicalRows = sourceRows
      .filter((row) => row.invType === detailsInvType)
      .map((row) => ({
        ...normalizeConversionRow(row, getQuantityDecimals(detailsInvType)),
        id: row.itemUomConvId,
      }))
      .sort((left, right) => {
        const itemComparison = left.itemCode.localeCompare(right.itemCode);
        return itemComparison || Number(left.seqNo || 0) - Number(right.seqNo || 0);
      });

    setDetailRows(historicalRows);
  };

  const retrieveDetail = (record) => {
    const itemRows = filterItemRows(allRows, record.invType, record.itemCode);
    const auditRow = itemRows[0] || record;

    setHeader({
      ...EMPTY_HEADER,
      invType: record.invType,
      itemCode: record.itemCode,
      itemName: record.itemName,
      baseUomCode: record.baseUomCode,
      registeredBy: auditRow.registeredBy || "",
      registeredDate: auditRow.registeredDate || "",
      lastUpdatedBy: auditRow.lastUpdatedBy || "",
      lastUpdatedDate: auditRow.lastUpdatedDate || "",
    });
    setRows(itemRows);
    setActiveTab("setup");
  };

  const isBaseRow = (row) =>
    String(row.uomCode || "").toUpperCase() ===
      String(header.baseUomCode || "").toUpperCase() &&
    Number(row.baseQtyRatio) === Number(row.uomQtyRatio);

  const updateRow = (rowId, field, value) => {
    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: field === "uomCode" ? String(value).toUpperCase() : value,
            }
          : row
      )
    );
  };

  const addRow = () => {
    if (!header.itemCode) {
      showErrorAlert("Required Field", "Please select an item first.");
      return;
    }

    const nextSequence =
      Math.max(0, ...rows.map((row) => Number(row.seqNo || 0))) + 1;
    const temporaryId = `new-${Date.now()}`;

    setRows((previous) => [
      ...previous,
      {
        id: temporaryId,
        itemUomConvId: "",
        invType: header.invType,
        itemCode: header.itemCode,
        uomCode: "",
        convQty: "1.000000000000",
        baseQtyRatio: formatConversionQuantity(1, quantityDecimals),
        uomQtyRatio: formatConversionQuantity(1, quantityDecimals),
        baseUomCode: header.baseUomCode,
        seqNo: nextSequence,
        active: "Y",
      },
    ]);
  };

  const removeRow = async (row) => {
    if (isBaseRow(row)) {
      showErrorAlert(
        "Base UOM",
        "The base UOM is maintained in the selected item master."
      );
      return;
    }

    if (!row.itemUomConvId) {
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      return;
    }

    const answer = await Swal.fire({
      title: "Delete UOM Conversion?",
      text: `Delete ${row.uomCode} conversion for ${header.itemCode}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!answer.isConfirmed) return;

    setLoading(true);
    try {
      await apiClient.post("/deleteItemConversion", {
        json_data: {
          itemUomConvId: row.itemUomConvId,
          invType: row.invType,
          itemCode: row.itemCode,
          uomCode: row.uomCode,
          userCode,
        },
      });
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      setAllRows((previous) =>
        previous.filter(
          (item) => item.itemUomConvId !== row.itemUomConvId
        )
      );
      showSuccessAlert("Deleted", "UOM conversion deleted successfully.");
    } catch (error) {
      showErrorAlert(
        "Delete Failed",
        error?.response?.data?.message || "Unable to delete UOM conversion."
      );
    } finally {
      setLoading(false);
    }
  };

  const validateRows = () => {
    if (!header.itemCode || !header.baseUomCode) {
      return "Inventory item and Base UOM are required.";
    }

    if (!rows.length) return "At least one UOM conversion is required.";

    const uomCodes = rows.map((row) => String(row.uomCode || "").trim().toUpperCase());
    if (uomCodes.some((code) => !code)) return "UOM Code is required for every row.";
    if (new Set(uomCodes).size !== uomCodes.length) {
      return "Duplicate UOM Codes are not allowed for the same item.";
    }
    if (rows.some((row) =>
      !Number.isFinite(Number(row.baseQtyRatio)) || Number(row.baseQtyRatio) <= 0 ||
      !Number.isFinite(Number(row.uomQtyRatio)) || Number(row.uomQtyRatio) <= 0
    )) {
      return "Base Quantity and UOM Quantity must be greater than zero for every row.";
    }

    return "";
  };

  const saveMatrix = async () => {
    const validationMessage = validateRows();
    if (validationMessage) {
      showErrorAlert("Validation", validationMessage);
      return;
    }

    setLoading(true);
    try {
      for (const row of rows) {
        const response = await apiClient.post("/upsertItemConversion", {
          json_data: JSON.stringify({
            json_data: {
              itemUomConvId: row.itemUomConvId || "",
              invType: header.invType,
              itemCode: header.itemCode,
              uomCode: String(row.uomCode).trim().toUpperCase(),
              convQty: Number(row.baseQtyRatio) / Number(row.uomQtyRatio),
              baseQtyRatio: Number(row.baseQtyRatio),
              uomQtyRatio: Number(row.uomQtyRatio),
              baseUomCode: header.baseUomCode,
              seqNo: Number(row.seqNo || 0),
              active: isBaseRow(row) ? "Y" : row.active || "Y",
              userCode,
            },
          }),
        });

        const sqlRow = response?.data?.data?.[0];
        if (Number(sqlRow?.errorcount || 0) > 0) {
          throw new Error(sqlRow?.errormsg || "Unable to save UOM conversion.");
        }
      }

      const refreshed = await loadConversions();
      const itemRows = filterItemRows(
        refreshed,
        header.invType,
        header.itemCode
      );
      setRows(itemRows);
      showSuccessAlert("Saved", "Item conversion matrix saved successfully.");
    } catch (error) {
      showErrorAlert(
        "Save Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save item conversion matrix."
      );
    } finally {
      setLoading(false);
    }
  };

  const tableColumns = [
      {
        key: "__actions",
        label: "Action",
        sortable: false,
        filterable: false,
        width: 80,
        render: (row) => (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              removeRow(row);
            }}
            disabled={loading || isBaseRow(row)}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title={isBaseRow(row) ? "Base UOM" : "Delete"}
          >
            <Trash2 size={14} />
          </button>
        ),
      },
      {
        key: "seqNo",
        label: "Sequence",
        width: 100,
        render: (row) => (
          <input
            type="number"
            min="1"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-xs outline-none focus:border-blue-500 disabled:bg-slate-100"
            value={row.seqNo ?? ""}
            disabled={isBaseRow(row)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateRow(row.id, "seqNo", event.target.value)}
          />
        ),
      },
      {
        key: "uomCode",
        label: "UOM Code",
        width: 140,
        render: (row) => (
          <div onClick={(event) => event.stopPropagation()}>
            <FieldRenderer
              type="lookup"
              value={row.uomCode || ""}
              onLookup={() => setUomLookupRowId(row.id)}
              readOnly
              disabled={isBaseRow(row)}
            />
          </div>
        ),
      },
      {
        key: "conversionDefinition",
        label: "Conversion Definition",
        width: 430,
        render: (row) => {
          if (isBaseRow(row)) {
            return (
              <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                <span className="rounded bg-blue-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">Base UOM</span>
                <span>{formatConversionQuantity(1, quantityDecimals)} {header.baseUomCode}</span>
              </div>
            );
          }

          const quantityInput = (field, value) => (
            <input
              type="text"
              inputMode="decimal"
              className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-none focus:border-blue-500"
              value={value ?? ""}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const nextValue = event.target.value;
                const numericPattern = new RegExp(`^\\d*\\.?\\d{0,${quantityDecimals}}$`);
                if (nextValue === "" || numericPattern.test(nextValue)) updateRow(row.id, field, nextValue);
              }}
              onBlur={(event) =>
                updateRow(row.id, field, formatConversionQuantity(event.target.value, quantityDecimals))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          );

          return (
            <div className="flex min-w-max items-center gap-2 text-xs text-slate-700">
              {quantityInput("uomQtyRatio", row.uomQtyRatio)}
              <span className="min-w-10 font-semibold">{row.uomCode || "UOM"}</span>
              <span className="font-bold text-slate-400">=</span>
              {quantityInput("baseQtyRatio", row.baseQtyRatio)}
              <span className="font-semibold">{header.baseUomCode || "Base UOM"}</span>
            </div>
          );
        },
      },
      {
        key: "active",
        label: "Status",
        width: 120,
        render: (row) => (
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            value={isBaseRow(row) ? "Y" : row.active || "Y"}
            disabled={isBaseRow(row)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateRow(row.id, "active", event.target.value)}
          >
            <option value="Y">Active</option>
            <option value="N">Inactive</option>
          </select>
        ),
      },
    ];

  const detailColumns = [
    {
      key: "__actions",
      label: "Action",
      sortable: false,
      filterable: false,
      width: 80,
      render: (row) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            retrieveDetail(row);
          }}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-blue-100 bg-blue-50 text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          title="Retrieve"
        >
          <Pencil size={14} />
        </button>
      ),
    },
    { key: "invType", label: "Inventory Type", width: 130 },
    { key: "itemCode", label: "Item Code", width: 150 },
    { key: "itemName", label: "Item Name", width: 280 },
    { key: "uomCode", label: "UOM Code", width: 110 },
    {
      key: "conversionDefinition",
      label: "Conversion Definition",
      width: 300,
      render: (row) => {
        const decimals = getQuantityDecimals(row.invType);
        const isDetailBaseUom = String(row.uomCode || "").toUpperCase() ===
          String(row.baseUomCode || "").toUpperCase() &&
          Number(row.baseQtyRatio) === Number(row.uomQtyRatio);
        return isDetailBaseUom
          ? `Base UOM — ${formatConversionQuantity(1, decimals)} ${row.baseUomCode}`
          : `${formatConversionQuantity(row.uomQtyRatio, decimals)} ${row.uomCode} = ${formatConversionQuantity(row.baseQtyRatio, decimals)} ${row.baseUomCode}`;
      },
    },
    { key: "seqNo", label: "Sequence", width: 100 },
    {
      key: "active",
      label: "Status",
      width: 100,
      render: (row) => (row.active === "Y" ? "Active" : "Inactive"),
    },
    { key: "registeredBy", label: "Registered By", width: 150 },
    { key: "registeredDate", label: "Registered Date", width: 190 },
    { key: "lastUpdatedBy", label: "Updated By", width: 150 },
    { key: "lastUpdatedDate", label: "Updated Date", width: 190 },
  ];

  const actionButton = (label, Icon, onClick, disabled = false) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-3"
    >
      <Icon size={14} />
      <span className="ml-1 hidden sm:inline">{label}</span>
    </button>
  );

  const renderActions = () => {
    if (activeTab === "setup") {
      return (
        <>
          {actionButton("Find", Search, () => setShowItemLookup(true))}
          {actionButton("Add", Plus, addRow, !header.itemCode)}
          {actionButton("Save", Save, saveMatrix, !rows.length)}
          {actionButton("Reset", Undo2, resetMatrix)}
        </>
      );
    }

    return (
      <>
        {actionButton("Find", Search, findDetails)}
        {actionButton("Reset", Undo2, resetDetails)}
      </>
    );
  };

  return (
    <div className="global-ref-main-div-ui">
      {loading && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-3 md:items-center">
          <h1 className="global-ref-headertext-ui text-center md:text-left">
            Item Conversion Matrix
          </h1>

          <div className="flex w-full justify-center">
            <div className="w-full md:w-auto">
              <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-[12px] font-bold transition-all ${
                      activeTab === tab.key
                        ? "border-blue-600 bg-blue-50/50 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-blue-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap text-xs md:justify-end">
            {renderActions()}
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui px-3 pb-4 pt-44 sm:px-4 sm:pt-32 md:mt-24 md:p-6">
        {activeTab === "setup" && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="rounded-xl border bg-white p-4 shadow-sm md:col-span-9">
                <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Item Conversion Information
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <FieldRenderer
                    label="Inventory Type"
                    type="select"
                    value={header.invType}
                    onChange={changeInventoryType}
                    options={INVENTORY_TYPES}
                    disabled={loading}
                    required
                  />
                  <FieldRenderer
                    label="Item Code"
                    type="lookup"
                    value={header.itemCode}
                    onLookup={() => setShowItemLookup(true)}
                    readOnly
                    required
                  />
                  <FieldRenderer
                    label="Item Name"
                    value={header.itemName}
                    readOnly
                    disabled
                  />
                  <FieldRenderer
                    label="Base UOM"
                    value={header.baseUomCode}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <RegistrationInfo data={header} layout="minimize" />
              </div>
            </div>

            <div className="global-tran-table-main-div-ui mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}Setup`}
                columns={tableColumns}
                data={rows}
                itemsPerPage={200}
                showFilters
                showGlobalSearch
                isLoading={loading}
              />
            </div>
          </>
        )}

        {activeTab === "details" && (
          <>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <h3 className="mb-3 border-b pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Item Conversion History
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <FieldRenderer
                  label="Inventory Type"
                  type="select"
                  value={detailsInvType}
                  onChange={(valueOrEvent) => {
                    setDetailsInvType(fieldValue(valueOrEvent));
                    setDetailRows([]);
                  }}
                  options={INVENTORY_TYPES}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="global-tran-table-main-div-ui mt-4 overflow-x-auto rounded-xl border bg-white shadow-sm">
              <SearchGlobalReferenceTable
                docType={`${DOC_TYPE}Details`}
                columns={detailColumns}
                data={detailRows}
                itemsPerPage={50}
                showFilters
                showGlobalSearch
                onRowDoubleClick={retrieveDetail}
                isLoading={loading}
              />
            </div>
          </>
        )}
      </div>

      {showItemLookup && (
        <ItemMastLookupModal
          isOpen={showItemLookup}
          endpoint={itemLookupEndpoint}
          enableMultiSelect={false}
          docType="MATRIX"
          onClose={(selected) => {
            if (selected) selectItem(selected);
            setShowItemLookup(false);
          }}
        />
      )}

      <SearchUOM
        isOpen={uomLookupRowId !== null}
        onClose={(selected) => {
          if (selected && uomLookupRowId !== null) {
            updateRow(uomLookupRowId, "uomCode", selected.uomCode || "");
          }
          setUomLookupRowId(null);
        }}
      />
    </div>
  );
}
