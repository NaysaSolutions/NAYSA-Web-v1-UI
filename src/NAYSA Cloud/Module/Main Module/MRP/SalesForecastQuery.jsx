import { useCallback, useMemo, useState } from "react";



import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";

import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";



import CutoffLookupModal from "@/NAYSA Cloud/Lookup/SearchCutoffRef";

import CustomerMastLookupModal from "@/NAYSA Cloud/Lookup/SearchCustMast.jsx";
import SearchGlobalReportTable from "@/NAYSA Cloud/Lookup/SearchGlobalReportTable.jsx";
import { useResizableTableColumns } from "@/NAYSA Cloud/Global/datatable.jsx";



import {

  formatNumber,

  parseFormattedNumber,

  useSwalErrorAlert,

} from "@/NAYSA Cloud/Global/behavior.jsx";



const SalesForecastQuery = () => {

  const { user, currentUserRow } = useAuth();



  const defaultBranchCode =

    currentUserRow?.branchCode ||

    user?.branchCode ||

    user?.BRANCH_CODE ||

    "HO";



  const [filters, setFilters] = useState({

    branchCode: defaultBranchCode,

    itemCode: "",

    custCode: "",

    forecastFrom: "",

    forecastTo: "",

    forecastType: "All",

  });



  const [rows, setRows] = useState([]);

  const [summaryRows, setSummaryRows] = useState([]);

  const [activeView, setActiveView] = useState("inquiry");

  const [isLoading, setIsLoading] = useState(false);

  const [cutoffLookupOpen, setCutoffLookupOpen] = useState(false);

  const [cutoffLookupMode, setCutoffLookupMode] = useState("");

  const [customerLookupOpen, setCustomerLookupOpen] = useState(false);

  const [itemLookupOpen, setItemLookupOpen] = useState(false);

  const [forecastItems, setForecastItems] = useState([]);



  const updateFilters = useCallback((updates) => {

    setFilters((prev) => ({ ...prev, ...updates }));

  }, []);



  const detailColumns = useMemo(

    () => [

      { key: "docDate", label: "Date", width: 110, renderType: "date" },

      { key: "docType", label: "Doc Type.", width: 100 },

      { key: "docNo", label: "Doc No.", width: 120 },

      { key: "forecastType", label: "Forecast Type", width: 120 },

      { key: "custCode", label: "Customer Code", width: 120 },

      { key: "custName", label: "Customer Name", width: 180 },

      { key: "itemCode", label: "Item Code", width: 120 },

      { key: "itemName", label: "Item Description", width: 260 },

      { key: "uomCode", label: "UOM", width: 80 },

      { key: "forecastCutoff", label: "Period", width: 90 },

      { key: "movement", label: "Movement", width: 110 },

      { key: "quantity", label: "Qty", width: 120, renderType: "number", roundingOff: 6 },

      { key: "baselineForecast", label: "Baseline Forecast", width: 145, renderType: "number", roundingOff: 6 },

      { key: "customerForecast", label: "Customer Forecast", width: 145, renderType: "number", roundingOff: 6 },

      { key: "remarks", label: "Remarks", width: 240 },

    ],

    [],

  );



  const summaryColumns = useMemo(

    () => [

      { key: "itemCode", label: "Item Code", width: 120 },

      { key: "itemName", label: "Item Description", width: 260 },

      { key: "uomCode", label: "UOM", width: 80 },

      { key: "forecastCutoff", label: "Period", width: 100 },

      { key: "baselineForecast", label: "Baseline Forecast", width: 145, renderType: "number", roundingOff: 6 },

      { key: "customerForecast", label: "Customer Forecast", width: 145, renderType: "number", roundingOff: 6 },

      { key: "netForecast", label: "Net Forecast", width: 145, renderType: "number", roundingOff: 6 },

    ],

    [],

  );



  const {

    getColumnStyle: getDetailColumnStyle,

    getFrozenColumnStyle: getDetailFrozenStyle,

    getOrderedColumns: getOrderedDetailColumns,

    getSortedRows: getSortedDetailRows,

    renderHeaderContextMenu: renderDetailHeaderContextMenu,

    renderResizableHeader: renderDetailHeader,

  } = useResizableTableColumns(detailColumns);



  const {

    getColumnStyle: getSummaryColumnStyle,

    getFrozenColumnStyle: getSummaryFrozenStyle,

    getOrderedColumns: getOrderedSummaryColumns,

    getSortedRows: getSortedSummaryRows,

    renderHeaderContextMenu: renderSummaryHeaderContextMenu,

    renderResizableHeader: renderSummaryHeader,

  } = useResizableTableColumns(summaryColumns);



  const visibleDetailColumns = useMemo(

    () => getOrderedDetailColumns(detailColumns),

    [getOrderedDetailColumns, detailColumns],

  );



  const visibleSummaryColumns = useMemo(

    () => getOrderedSummaryColumns(summaryColumns),

    [getOrderedSummaryColumns, summaryColumns],

  );



  const sortedDetailRows = useMemo(

    () =>

      getSortedDetailRows(rows, (row, sortKey) => {

        if (

          ["quantity", "baselineForecast", "customerForecast"].includes(

            sortKey,

          )

        ) {

          return parseFormattedNumber(row?.[sortKey] || 0) || 0;

        }



        return row?.[sortKey] ?? "";

      }),

    [getSortedDetailRows, rows],

  );



  const sortedSummaryRows = useMemo(

    () =>

      getSortedSummaryRows(summaryRows, (row, sortKey) => {

        if (

          ["baselineForecast", "customerForecast", "netForecast"].includes(

            sortKey,

          )

        ) {

          return parseFormattedNumber(row?.[sortKey] || 0) || 0;

        }



        return row?.[sortKey] ?? "";

      }),

    [getSortedSummaryRows, summaryRows],

  );



  const getDetailCellStyle = (key, width) => ({

    ...getDetailColumnStyle(key, width),

    ...getDetailFrozenStyle(key, visibleDetailColumns, width, {

      isHeader: false,

    }),

  });



  const getSummaryCellStyle = (key, width) => ({

    ...getSummaryColumnStyle(key, width),

    ...getSummaryFrozenStyle(key, visibleSummaryColumns, width, {

      isHeader: false,

    }),

  });



  const detailTotals = useMemo(

    () =>

      rows.reduce(

        (acc, row) => ({

          quantity:

            acc.quantity +

            (parseFormattedNumber(row.quantity || 0) || 0),

          baseline:

            acc.baseline +

            (parseFormattedNumber(row.baselineForecast || 0) || 0),

          customer:

            acc.customer +

            (parseFormattedNumber(row.customerForecast || 0) || 0),

        }),

        { quantity: 0, baseline: 0, customer: 0 },

      ),

    [rows],

  );



  const summaryTotals = useMemo(

    () =>

      summaryRows.reduce(

        (acc, row) => ({

          baseline:

            acc.baseline +

            (parseFormattedNumber(row.baselineForecast || 0) || 0),

          customer:

            acc.customer +

            (parseFormattedNumber(row.customerForecast || 0) || 0),

          net:

            acc.net +

            (parseFormattedNumber(row.netForecast || 0) || 0),

        }),

        { baseline: 0, customer: 0, net: 0 },

      ),

    [summaryRows],

  );



  const runInquiry = async () => {

    try {

      setIsLoading(true);



      const response = await apiClient.post(

        "/sales-forecast/query/inquiry",

        {

          json_data: filters,

        },

      );



      setRows(

        Array.isArray(response?.data?.data)

          ? response.data.data

          : [],

      );

      setActiveView("inquiry");

    } catch (error) {

      useSwalErrorAlert(

        "Inquiry Error",

        error?.response?.data?.message ||

          error?.response?.data?.details ||

          error?.message ||

          "Unable to load Sales Forecast Query.",

      );

    } finally {

      setIsLoading(false);

    }

  };



  const runSummary = async () => {

    try {

      setIsLoading(true);



      const response = await apiClient.post(

        "/sales-forecast/query/summary",

        {

          json_data: filters,

        },

      );



      setSummaryRows(

        Array.isArray(response?.data?.data)

          ? response.data.data

          : [],

      );

      setActiveView("summary");

    } catch (error) {

      useSwalErrorAlert(

        "Summary Error",

        error?.response?.data?.message ||

          error?.response?.data?.details ||

          error?.message ||

          "Unable to load Sales Forecast Summary.",

      );

    } finally {

      setIsLoading(false);

    }

  };



  const resetQuery = () => {

    setFilters({

      branchCode: defaultBranchCode,

      itemCode: "",

      custCode: "",

      forecastFrom: "",

      forecastTo: "",

      forecastType: "All",

    });

    setRows([]);

    setSummaryRows([]);

    setActiveView("inquiry");

  };



  const openForecastItemLookup = async () => {

    try {

      setIsLoading(true);

      const response = await apiClient.post("/sales-forecast/query/inquiry", {

        json_data: {

          branchCode: filters.branchCode,

          itemCode: "",

          custCode: "",

          forecastFrom: "",

          forecastTo: "",

          forecastType: filters.forecastType,

        },

      });

      const data = response?.data?.data || response?.data || [];

      const itemMap = new Map();

      (Array.isArray(data) ? data : []).forEach((row) => {

        const itemCode = row.itemCode || row.ITEM_CODE || row.item_code || "";

        if (!itemCode) return;

        const forecastType = row.forecastType || row.FORECAST_TYPE || "";

        const existing = itemMap.get(itemCode);

        if (existing) {

          existing.forecastTypes = Array.from(

            new Set(`${existing.forecastTypes || ""},${forecastType}`.split(",").filter(Boolean)),

          ).join(", ");

          return;

        }

        itemMap.set(itemCode, {

          ...row,

          itemCode,

          itemName: row.itemName || row.itemDesc || row.ITEM_NAME || row.ITEM_DESC || "",

          uomCode: row.uomCode || row.uom || row.UOM_CODE || "",

          forecastTypes: forecastType || filters.forecastType,

        });

      });

      setForecastItems(Array.from(itemMap.values()));

      setItemLookupOpen(true);

    } catch (error) {

      useSwalErrorAlert(

        "Item Lookup Error",

        error?.response?.data?.message ||

          error?.message ||

          "Unable to load items existing in the selected forecast types.",

      );

    } finally {

      setIsLoading(false);

    }

  };



  const selectForecastItem = (row) => {

    updateFilters({

      itemCode: row.itemCode || row.ITEM_CODE || row.item_code || "",

    });

    setItemLookupOpen(false);

  };



  const openCutoffLookup = (mode) => {

    setCutoffLookupMode(mode);

    setCutoffLookupOpen(true);

  };



  const handleCloseCutoffLookup = (selected) => {

    if (selected) {

      const selectedCode =

        selected.cutoffCode ||

        selected.CUTOFF_CODE ||

        "";



      if (cutoffLookupMode === "FROM") {

        updateFilters({ forecastFrom: selectedCode });

      } else if (cutoffLookupMode === "TO") {

        updateFilters({ forecastTo: selectedCode });

      }

    }



    setCutoffLookupOpen(false);

    setCutoffLookupMode("");

  };



  const renderDetailValue = (row, column) => {

    if (

      ["quantity", "baselineForecast", "customerForecast"].includes(

        column.key,

      )

    ) {

      return (

        <div className="text-right">

          {formatNumber(row[column.key] || 0, 6)}

        </div>

      );

    }



    if (column.key === "docDate") {

      return String(row.docDate || "").substring(0, 10);

    }



    return String(row[column.key] ?? "");

  };



  const renderSummaryValue = (row, column) => {

    if (

      ["baselineForecast", "customerForecast", "netForecast"].includes(

        column.key,

      )

    ) {

      return (

        <div className="text-right">

          {formatNumber(row[column.key] || 0, 6)}

        </div>

      );

    }



    return String(row[column.key] ?? "");

  };



  return (

    <div className="global-ref-main-div-ui">

      {isLoading && <LoadingSpinner />}



      <div className="global-ref-header-ui">

        <div className="w-full flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          <h1 className="global-ref-headertext-ui w-full sm:w-auto truncate text-center sm:text-left">

            Sales Forecast - Query

          </h1>

        </div>

      </div>



      <div className="global-tran-header-div-ui overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 mt-24">
        <div className="global-tran-header-tab-div-ui border-b border-slate-200 dark:border-slate-700">
          <button
            className="global-tran-tab-padding-ui global-tran-tab-text_active-ui"
            type="button"
          >
            Query Filters
          </button>
        </div>

        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 lg:grid-cols-3">
            <div className="global-tran-textbox-group-div-ui flex flex-col gap-3">
              <FieldRenderer id="itemCode" label="Item Code" type="lookup" value={filters.itemCode} readOnly onLookup={openForecastItemLookup} onChange={(value) => updateFilters({ itemCode: value })} />
              <FieldRenderer id="custCode" label="Customer Code" type="lookup" value={filters.custCode} readOnly onLookup={() => setCustomerLookupOpen(true)} onChange={(value) => updateFilters({ custCode: value })} />
            </div>

            <div className="global-tran-textbox-group-div-ui flex flex-col gap-3">
              <FieldRenderer id="forecastFrom" label="Forecast Period From" type="lookup" value={filters.forecastFrom} readOnly onLookup={() => openCutoffLookup("FROM")} />
              <FieldRenderer id="forecastTo" label="Forecast Period To" type="lookup" value={filters.forecastTo} readOnly onLookup={() => openCutoffLookup("TO")} />
            </div>

            <div className="global-tran-textbox-group-div-ui flex flex-col gap-3">
              <FieldRenderer
                id="forecastType"
                label="Forecast Type"
                type="select"
                value={filters.forecastType}
                options={[
                  { value: "All", label: "All" },
                  { value: "Baseline", label: "Baseline" },
                  { value: "Customer", label: "Customer" },
                //   { value: "Adjustment", label: "Adjustment" },
                ]}
                onChange={(value) => updateFilters({ forecastType: value })}
              />

              <div className="mt-auto grid grid-cols-1 gap-2 pt-1 sm:grid-cols-3">
                <button type="button" className="global-tran-button-generateGL min-h-9 w-full" onClick={runInquiry} disabled={isLoading}>Inquiry</button>
                <button type="button" className="global-tran-button-generateGL min-h-9 w-full" onClick={runSummary} disabled={isLoading}>Summary</button>
                <button type="button" className="global-tran-button-generateGL min-h-9 w-full" onClick={resetQuery} disabled={isLoading}>Reset</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="global-tran-tab-div-ui mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">

        <div className="global-tran-tab-nav-ui border-b border-slate-200 dark:border-slate-700">

          <div className="flex flex-row">

            <button

              type="button"

              className={

                activeView === "inquiry"

                  ? "global-tran-tab-padding-ui global-tran-tab-text_active-ui"

                  : "global-tran-tab-padding-ui global-tran-tab-text_inactive-ui"

              }

              onClick={() => setActiveView("inquiry")}

            >

              Forecast Movement

            </button>



            <button

              type="button"

              className={

                activeView === "summary"

                  ? "global-tran-tab-padding-ui global-tran-tab-text_active-ui"

                  : "global-tran-tab-padding-ui global-tran-tab-text_inactive-ui"

              }

              onClick={() => setActiveView("summary")}

            >

              Forecast Summary

            </button>

          </div>

        </div>



        <div className={activeView === "inquiry" ? "" : "hidden"}>

          <div className="global-tran-table-main-div-ui overflow-x-auto">
            <SearchGlobalReportTable
              columns={detailColumns}
              data={rows}
              isLoading={isLoading}
              itemsPerPage={1000}
              docType="Sales Forecast Movement"
              totalExemptions={["docDate", "docType", "docNo", "forecastType", "custCode", "custName", "itemCode", "itemName", "uomCode", "forecastCutoff", "movement", "remarks"]}
            />
          </div>

          {false && (

          <div className="global-tran-table-main-div-ui">

            <div className="global-tran-table-main-sub-div-ui overflow-auto">

              <table className="min-w-full border-separate border-spacing-0 [&\_th]:border-b [&\_th]:border-slate-200 [&\_td]:border-t-0 [&\_td]:border-l-0 [&\_td]:border-r [&\_td]:border-b [&\_td]:border-slate-200 [&\_tr>td:first-child]:border-l">

                <thead className="global-tran-thead-div-ui">

                  <tr>

                    {visibleDetailColumns.map((column) =>

                      renderDetailHeader(

                        column.label,

                        column.key,

                        column.width,

                        { orderedColumns: visibleDetailColumns },

                      ),

                    )}

                  </tr>

                </thead>

                <tbody>

                  {sortedDetailRows.map((row, index) => (

                    <tr

                      key={`${row.docNo}-${row.groupId}-${index}`}

                      className="global-tran-tr-ui"

                    >

                      {visibleDetailColumns.map((column) => {

                        const width =

                          detailColumns.find(

                            (item) => item.key === column.key,

                          )?.width || 120;



                        return (

                          <td

                            key={column.key}

                            className="global-tran-td-ui"

                            style={getDetailCellStyle(

                              column.key,

                              width,

                            )}

                          >

                            {renderDetailValue(row, column)}

                          </td>

                        );

                      })}

                    </tr>

                  ))}

                </tbody>

                {rows.length > 0 && (

                  <tfoot>

                    <tr className="font-semibold">

                      {visibleDetailColumns.map((column) => {

                        const width =

                          detailColumns.find(

                            (item) => item.key === column.key,

                          )?.width || 120;



                        let value = "";



                        if (column.key === "docDate") value = "TOTAL";

                        if (column.key === "quantity") {

                          value = formatNumber(

                            detailTotals.quantity,

                            6,

                          );

                        }

                        if (column.key === "baselineForecast") {

                          value = formatNumber(

                            detailTotals.baseline,

                            6,

                          );

                        }

                        if (column.key === "customerForecast") {

                          value = formatNumber(

                            detailTotals.customer,

                            6,

                          );

                        }



                        return (

                          <td

                            key={column.key}

                            className="global-tran-td-ui text-right"

                            style={getDetailCellStyle(

                              column.key,

                              width,

                            )}

                          >

                            {value}

                          </td>

                        );

                      })}

                    </tr>

                  </tfoot>

                )}

              </table>



              {renderDetailHeaderContextMenu?.()}

            </div>

          </div>

          )}

        </div>



        <div className={activeView === "summary" ? "" : "hidden"}>

          <div className="global-tran-table-main-div-ui overflow-x-auto">
            <SearchGlobalReportTable
              columns={summaryColumns}
              data={summaryRows}
              isLoading={isLoading}
              itemsPerPage={1000}
              docType="Sales Forecast Summary"
              totalExemptions={["itemCode", "itemName", "uomCode", "forecastCutoff"]}
            />
          </div>

          {false && (

          <div className="global-tran-table-main-div-ui">

            <div className="global-tran-table-main-sub-div-ui overflow-auto">

              <table className="min-w-full border-separate border-spacing-0 [&\_th]:border-b [&\_th]:border-slate-200 [&\_td]:border-t-0 [&\_td]:border-l-0 [&\_td]:border-r [&\_td]:border-b [&\_td]:border-slate-200 [&\_tr>td:first-child]:border-l">

                <thead className="global-tran-thead-div-ui">

                  <tr>

                    {visibleSummaryColumns.map((column) =>

                      renderSummaryHeader(

                        column.label,

                        column.key,

                        column.width,

                        { orderedColumns: visibleSummaryColumns },

                      ),

                    )}

                  </tr>

                </thead>

                <tbody>

                  {sortedSummaryRows.map((row, index) => (

                    <tr

                      key={`${row.itemCode}-${row.forecastCutoff}-${index}`}

                      className="global-tran-tr-ui"

                    >

                      {visibleSummaryColumns.map((column) => {

                        const width =

                          summaryColumns.find(

                            (item) => item.key === column.key,

                          )?.width || 120;



                        return (

                          <td

                            key={column.key}

                            className="global-tran-td-ui"

                            style={getSummaryCellStyle(

                              column.key,

                              width,

                            )}

                          >

                            {renderSummaryValue(row, column)}

                          </td>

                        );

                      })}

                    </tr>

                  ))}

                </tbody>



                {summaryRows.length > 0 && (

                  <tfoot>

                    <tr className="font-semibold">

                      {visibleSummaryColumns.map((column) => {

                        const width =

                          summaryColumns.find(

                            (item) => item.key === column.key,

                          )?.width || 120;



                        let value = "";



                        if (column.key === "itemCode") value = "TOTAL";

                        if (column.key === "baselineForecast") {

                          value = formatNumber(

                            summaryTotals.baseline,

                            6,

                          );

                        }

                        if (column.key === "customerForecast") {

                          value = formatNumber(

                            summaryTotals.customer,

                            6,

                          );

                        }

                        if (column.key === "netForecast") {

                          value = formatNumber(

                            summaryTotals.net,

                            6,

                          );

                        }



                        return (

                          <td

                            key={column.key}

                            className="global-tran-td-ui text-right"

                            style={getSummaryCellStyle(

                              column.key,

                              width,

                            )}

                          >

                            {value}

                          </td>

                        );

                      })}

                    </tr>

                  </tfoot>

                )}

              </table>



              {renderSummaryHeaderContextMenu?.()}

            </div>

          </div>

          )}

        </div>

      </div>



      {cutoffLookupOpen && (

        <CutoffLookupModal

          isOpen={cutoffLookupOpen}

          onClose={handleCloseCutoffLookup}

        />

      )}



      {customerLookupOpen && (

        <CustomerMastLookupModal

          isOpen={customerLookupOpen}

          onClose={(selected) => {

            if (selected) {

              updateFilters({

                custCode: selected.custCode || selected.CUST_CODE || "",

              });

            }

            setCustomerLookupOpen(false);

          }}

        />

      )}



      {itemLookupOpen && (

        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">

          <div className="flex max-h-[82vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">

            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">

              <div>

                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Forecast Item Lookup</h2>

                <p className="text-xs text-slate-500 dark:text-slate-400">Items available in Baseline and Customer Forecast.</p>

              </div>

              <button type="button" className="global-button-ui" onClick={() => setItemLookupOpen(false)}>Close</button>

            </div>

            <div className="flex-1 overflow-auto p-3">

              <table className="min-w-full border-collapse text-xs">

                <thead className="global-tran-thead-div-ui sticky top-0 z-10">

                  <tr>

                    <th className="global-tran-th-ui">Item Code</th>

                    <th className="global-tran-th-ui">Item Description</th>

                    <th className="global-tran-th-ui">UOM</th>

                    <th className="global-tran-th-ui">Forecast Types</th>

                  </tr>

                </thead>

                <tbody>

                  {forecastItems.map((row, index) => (

                    <tr key={`${row.itemCode || row.ITEM_CODE}-${index}`} className="global-tran-tr-ui cursor-pointer" onClick={() => selectForecastItem(row)}>

                      <td className="global-tran-td-ui">{row.itemCode || row.ITEM_CODE}</td>

                      <td className="global-tran-td-ui">{row.itemName || row.itemDesc || row.ITEM_NAME || row.ITEM_DESC}</td>

                      <td className="global-tran-td-ui text-center">{row.uomCode || row.uom || row.UOM_CODE}</td>

                      <td className="global-tran-td-ui">{row.forecastTypes || row.forecastType || "Baseline, Customer"}</td>

                    </tr>

                  ))}

                  {!forecastItems.length && (

                    <tr><td colSpan={4} className="global-tran-td-ui py-8 text-center text-slate-500">No forecast items found.</td></tr>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



export default SalesForecastQuery;
