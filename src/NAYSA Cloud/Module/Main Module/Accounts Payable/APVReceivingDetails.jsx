import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faCalculator, faRotateLeft, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useResizableTableColumns, transactionActionsCellStyle, transactionActionsHeaderStyle } from "@/NAYSA Cloud/Global/datatable.jsx";
import { formatNumber } from "@/NAYSA Cloud/Global/behavior.jsx";

// Display preview uses scaled integers to match SQL decimal rounding.
// Save/Apply Adjustment still use the server's validated results.
const scale = (digits) => 10n ** BigInt(digits);
const decimal = (value, digits) => {
  if (value === null || value === undefined || value === "") return null;
  const text = (typeof value === "number" ? value.toFixed(digits) : String(value).replace(/,/g, "").trim()).replace(/^(-?)\./, "$10.");
  if (!/^-?\d+(\.\d*)?$/.test(text)) return null;
  const negative = text.startsWith("-");
  const [whole, fraction = ""] = text.replace(/^-/, "").split(".");
  const result = BigInt(whole) * scale(digits) + BigInt(fraction.padEnd(digits, "0").slice(0, digits) || "0");
  return negative ? -result : result;
};
const roundDivide = (value, divisor) => {
  const sign = value < 0n ? -1n : 1n;
  return sign * ((sign * value + divisor / 2n) / divisor);
};
const amountText = (cents) => {
  const magnitude = cents < 0n ? -cents : cents;
  return `${cents < 0n ? "-" : ""}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, "0")}`;
};

const previewReceivingPrice = (row, exchangeRate) => {
  const price = decimal(row.adjPrice, 8);
  const quantity = decimal(row.quantity, 6);
  const originalPrice = decimal(row.origPrice, 8);
  const originalAmount = decimal(row.origAmount, 2);
  const vatRate = decimal(row.vatRate ?? 0, 6);
  const rate = decimal(exchangeRate ?? row.currRate ?? 1, 6);
  if (price === null || quantity === null || originalPrice === null || originalAmount === null ||
      vatRate === null || rate === null || price < 0n || quantity <= 0n || vatRate < 0n || rate <= 0n) {
    return { ...row, grossAmount: null, vatAmount: null, netAmount: null, varAmount: null, varAmountPhp: null };
  }
  const gross = price === originalPrice ? originalAmount : roundDivide(quantity * price, scale(12));
  const divisor = 100n * scale(6) + vatRate;
  const vat = roundDivide(gross * vatRate, divisor);
  const net = gross - vat;
  const variance = net - (originalAmount - roundDivide(originalAmount * vatRate, divisor));
  return { ...row, grossAmount: amountText(gross), vatAmount: amountText(vat), netAmount: amountText(net),
    varAmount: amountText(variance), varAmountPhp: amountText(roundDivide(variance * rate, scale(6))) };
};


// Shares FGRR's grid, column controls, input styles and footer button classes.
export default function APVReceivingDetails({ rows, currency, exchangeRate, disabled, busy, dirty, onLoad, onPriceChange, onApplyAdjustment, onResetPrices, onDelete }) {
  const [editingPriceKey, setEditingPriceKey] = useState(null);
  const priceDecimals = 8;
  const actionButtonStyle = { width: 141, minWidth: 141, flexShrink: 0 };
  const columns = useMemo(() => [
    { key: "ln", label: "LN", width: 56 },
    { key: "invType", label: "Type", width: 70 },
    { key: "rrNo", label: "RR No.", width: 140 },
    { key: "rrLineno", label: "RR Line", width: 80, decimals: 0 },
    { key: "poNo", label: "PO No.", width: 140 },
    { key: "poLineno", label: "PO Line", width: 80, decimals: 0 },
    { key: "itemCode", label: "Item Code", width: 120 },
    { key: "itemName", label: "Item Description", width: 300 },
    { key: "uomCode", label: "UOM", width: 80 },
    { key: "quantity", label: "RR Quantity (incl. Free)", width: 165, decimals: 6 },
    { key: "stockQuantity", label: "Stock Quantity", width: 140, decimals: 6 },
    { key: "origPrice", label: `Original Price (${currency || "PHP"})`, width: 170, decimals: priceDecimals },
    { key: "adjPrice", label: `Adjusted Price (${currency || "PHP"})`, width: 170, decimals: priceDecimals },
    { key: "origAmount", label: "Original Amount", width: 140, decimals: 2 },
    { key: "grossAmount", label: "Adjusted Amount", width: 140, decimals: 2, calculated: true },
    { key: "vatCode", label: "VAT", width: 110 },
    { key: "vatRate", label: "VAT Rate", width: 120, decimals: 6 },
    { key: "vatAmount", label: "VAT Amount", width: 120, decimals: 2, calculated: true },
    { key: "netAmount", label: "Net Amount", width: 120, decimals: 2, calculated: true },
    { key: "varAmount", label: "Price Variance", width: 140, decimals: 2, calculated: true },
    { key: "varAmountPhp", label: "Variance (PHP)", width: 140, decimals: 2, calculated: true },
    { key: "costMethod", label: "Costing Method", width: 130 },
    { key: "adjNo", label: "Cost Adjustment No.", width: 170 },
    { key: "dt1Lineno", label: "Invoice Line", width: 100 },
  ], [currency]);
  const {
    getColumnStyle, getFrozenColumnStyle, getOrderedColumns, getSortedRows,
    renderResizableHeader, renderHeaderContextMenu,
  } = useResizableTableColumns(columns);
  const visibleColumns = getOrderedColumns(columns);
  const displayRows = useMemo(() => dirty ? rows.map(row => previewReceivingPrice(row, exchangeRate)) : rows, [rows, dirty, exchangeRate]);
  const sortedRows = getSortedRows(displayRows.map((row, originalIndex) => ({ row, originalIndex })),
    (entry, key) => key === "ln" ? entry.originalIndex + 1 : entry.row[key] ?? "");
  const amount = (key) => displayRows.some(row => row[key] === null) ? "—" : formatNumber(displayRows.reduce((sum, row) => sum + Number(row[key] || 0), 0));
  return <>
    <div className="global-tran-table-main-div-ui">
      <div className="global-tran-table-main-sub-div-ui">
        <table aria-label="APV Receiving Details" className="min-w-full border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-t-0 [&_td]:border-l-0 [&_td]:border-r [&_td]:border-b [&_td]:border-slate-200 [&_tr>td:first-child]:border-l">
          <thead className="global-tran-thead-div-ui"><tr>
            {visibleColumns.map(column => renderResizableHeader(column.label, column.key, column.width, { orderedColumns: visibleColumns }))}
            {!disabled && <th className="global-tran-th-ui sticky top-0 right-0 bg-blue-100 dark:bg-blue-900" style={transactionActionsHeaderStyle}>Actions</th>}
          </tr></thead>
          <tbody className="relative">
            {sortedRows.map(({ row, originalIndex }, visibleIndex) => <tr key={`${row.invType}:${row.rrId}:${row.rrLineno}`} className="global-tran-tr-ui">
              {visibleColumns.map(column => <td key={column.key} className={`global-tran-td-ui ${column.key === "ln" ? "text-center" : ""}`} style={{
                ...getColumnStyle(column.key, column.width),
                ...getFrozenColumnStyle(column.key, visibleColumns, column.width, { isHeader: false }),
              }}>
                {column.key === "ln" ? originalIndex + 1 : column.key === "adjPrice" ? <input
                  id={`apv-rr-price-${originalIndex}`} type="text" inputMode="decimal"
                  aria-label={`Adjusted price for ${row.rrNo} line ${row.rrLineno}`}
                  className="w-full global-tran-td-inputclass-ui text-right"
                  value={editingPriceKey === `${row.invType}:${row.rrId}:${row.rrLineno}` || row.adjPrice === "" ? row.adjPrice ?? "" : formatNumber(row.adjPrice, priceDecimals)}
                  disabled={disabled || busy || Boolean(row.postedDate)}
                  onFocus={event => { setEditingPriceKey(`${row.invType}:${row.rrId}:${row.rrLineno}`); event.target.select(); }}
                  onBlur={() => setEditingPriceKey(null)}
                  onChange={event => {
                    const value = event.target.value.replace(/,/g, "");
                    if (new RegExp(`^\\d*(\\.\\d{0,${priceDecimals}})?$`).test(value)) onPriceChange(originalIndex, value);
                  }}
                  onKeyDown={event => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    const next = sortedRows[visibleIndex + 1];
                    if (next) document.getElementById(`apv-rr-price-${next.originalIndex}`)?.focus();
                  }}
                /> : <input type="text" readOnly tabIndex={-1}
                  className={column.decimals !== undefined ? "w-full h-7 text-xs bg-transparent text-right focus:outline-none focus:ring-0" : "w-full global-tran-td-inputclass-ui"}
                  title={String(row[column.key] ?? "")}
                  value={column.calculated && row[column.key] === null ? "—" : column.decimals !== undefined ? formatNumber(row[column.key] || 0, column.decimals) : row[column.key] ?? ""}
                />}
              </td>)}
              {!disabled && <td className="global-tran-td-ui text-center sticky right-0 bg-white dark:bg-black" style={transactionActionsCellStyle}>
                <div className="flex items-center justify-center gap-1">
                  <button type="button" className="global-tran-td-button-delete-ui disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Record" aria-label={`Delete receiving detail ${row.rrNo} line ${row.rrLineno}`}
                    disabled={busy || Boolean(row.postedDate)} onClick={() => onDelete(originalIndex)}>
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              </td>}
            </tr>)}
          </tbody>
        </table>
        {renderHeaderContextMenu?.()}
      </div>
    </div>
    <div className="global-tran-tab-footer-main-div-ui">
      <div className="global-tran-tab-footer-button-div-ui flex-wrap gap-2">
        <button type="button" style={actionButtonStyle} className="global-tran-tab-footer-button-add-ui disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled || busy} onClick={onLoad}>
          <FontAwesomeIcon icon={faPlus} className="mr-2" />Load Details
        </button>
        <button type="button" style={{ ...actionButtonStyle, width: 170, minWidth: 170 }} className="global-tran-tab-footer-button-add-ui disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled || busy || !rows.length} onClick={onApplyAdjustment}><FontAwesomeIcon icon={faCalculator} className="mr-2" />Apply Adjustment</button>
        <button type="button" style={actionButtonStyle} className="global-tran-tab-footer-button-add-ui disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled || busy || !rows.length} onClick={onResetPrices}><FontAwesomeIcon icon={faRotateLeft} className="mr-2" />Reset Price</button>
      </div>
      <div className="global-tran-tab-footer-total-main-div-ui">
        {[['Original Amount', 'origAmount'], ['Adjusted Amount', 'grossAmount'], ['Variance (PHP)', 'varAmountPhp']].map(([label, key]) =>
          <div key={key} className="global-tran-tab-footer-total-div-ui">
            <label className="global-tran-tab-footer-total-label-ui">{label}:</label>
            <label className="global-tran-tab-footer-total-value-ui">{key === 'origAmount' ? formatNumber(rows.reduce((sum, row) => sum + Number(row.origAmount || 0), 0)) : amount(key)}</label>
          </div>)}
      </div>
    </div>
  </>;
}
