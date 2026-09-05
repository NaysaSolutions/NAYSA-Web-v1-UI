import { useCallback, useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCarSide,
  faMagnifyingGlass,
  faPalette,
  faUndo,
  faWarehouse,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { formatNumber, useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import ItemMastLookupModal from "@/NAYSA Cloud/Lookup/SearchItemMast.jsx";
import genericVehicleImage from "@/NAYSA Cloud/Master Data/VEMasterData/naysa-generic-vehicle.png";

const vehicleImage = (row) => row?.vehicleImageBase64
  ? `data:image/jpeg;base64,${row.vehicleImageBase64}`
  : genericVehicleImage;

const VEAvailabilityInquiry = ({ isOpen, onClose }) => {
  const standalone = typeof isOpen === "undefined";
  const visible = standalone || isOpen;
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [model, setModel] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [showItemLookup, setShowItemLookup] = useState(false);

  const loadAvailability = useCallback(async () => {
    if (!itemCode) {
      setRows([]);
      setHasSearched(false);
      setShowItemLookup(true);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await apiClient.get("/ve/inventory/stock-card/availability", {
        params: { itemCode, model: model.trim() },
      });
      const result = response?.data?.data || {};
      setRows(Array.isArray(result?.rows) ? result.rows : []);
      setSelectedIndex(0);
    } catch (error) {
      useSwalErrorAlert(
        "Vehicle Availability Inquiry",
        error?.response?.data?.message || "Unable to load available vehicle inventory.",
      );
    } finally {
      setLoading(false);
    }
  }, [itemCode, model]);

  useEffect(() => {
    if (!visible) return;
    setItemCode("");
    setItemName("");
    setModel("");
    setRows([]);
    setSelectedIndex(0);
    setHasSearched(false);
  }, [visible]);

  useEffect(() => {
    if (!visible || standalone) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose?.();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, standalone, visible]);

  const selected = rows[selectedIndex] || rows[0];
  const counts = useMemo(() => ({
    units: rows.length,
    available: rows.filter((row) => String(row.availabilityStatus || "").toUpperCase() === "AVAILABLE").length,
    reserved: rows.filter((row) => String(row.availabilityStatus || "").toUpperCase() !== "AVAILABLE").length,
    variants: new Set(rows.map((row) => row.itemCode).filter(Boolean)).size,
  }), [rows]);

  if (!visible) return null;

  const content = (
    <div className={`relative flex min-h-0 flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 ${standalone ? "global-ref-main-div-ui min-h-screen" : "h-[92vh] w-[96vw] max-w-[1500px] rounded-2xl shadow-2xl"}`}>
      {loading && <LoadingSpinner />}

      <div className={standalone ? "global-ref-header-ui" : "flex items-center justify-between gap-3 rounded-t-2xl bg-blue-100 p-2 text-blue-900 shadow-lg dark:bg-blue-900 dark:text-white"}>
        <div className="min-w-0">
          <h1 className="global-ref-headertext-ui truncate">Vehicle Availability Inquiry</h1>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button type="button" onClick={loadAvailability} className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90">
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span className="ml-2">Find</span>
          </button>
          <button type="button" onClick={() => { setItemCode(""); setItemName(""); setModel(""); setRows([]); setSelectedIndex(0); setHasSearched(false); }} className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:opacity-90">
            <FontAwesomeIcon icon={faUndo} />
            <span className="ml-2">Reset</span>
          </button>
          {!standalone && (
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-xs text-white hover:opacity-90" aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-3 dark:border-slate-700 dark:bg-slate-800 ${standalone ? "mt-24 rounded-xl shadow-sm" : "border-x-0"}`}>
        <FieldRenderer
          type="lookup"
          label="Item Code"
          name="itemCode"
          value={itemCode}
          onLookup={() => setShowItemLookup(true)}
          editableLookup
          onClear={() => { setItemCode(""); setItemName(""); setRows([]); setHasSearched(false); }}
        />
        <FieldRenderer type="text" label="Vehicle Name" name="itemName" value={itemName} disabled />
        <FieldRenderer
          type="text"
          label="Model / Model Year (Optional)"
          name="model"
          value={model}
          onChange={setModel}
          onKeyDown={(event) => event.key === "Enter" && loadAvailability()}
        />
      </div>

      <div className={`grid min-h-0 flex-1 gap-4 overflow-hidden ${standalone ? "py-4" : "p-4"} ${rows.length ? "lg:grid-cols-[330px_1fr]" : "grid-cols-1"}`}>
        <aside className={`${rows.length ? "block" : "hidden"} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800`}>
          <div className="aspect-[16/10] overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 p-3 dark:from-slate-700 dark:to-slate-800">
            <img src={vehicleImage(selected)} onError={(event) => { event.currentTarget.src = genericVehicleImage; }} alt={selected?.itemName || "Vehicle"} className="h-full w-full object-contain" />
          </div>
          <div className="border-t border-slate-100 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Selected Vehicle</p>
            <h2 className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{selected?.itemName || "No available vehicle selected"}</h2>
            <p className="text-sm text-slate-500">{selected ? `${selected.itemCode || ""} · ${selected.make || ""} ${selected.model || ""}` : "Adjust the filters, then click Find."}</p>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-700">
            {[["Inventory Units", counts.units], ["Available", counts.available], ["Reserved", counts.reserved], ["Variants", counts.variants]].map(([label, value]) => (
              <div key={label} className="bg-white p-3 text-center dark:bg-slate-800">
                <div className="text-xl font-bold text-blue-600">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </aside>

        <section className="min-h-0 overflow-y-auto pr-1">
          {rows.length === 0 && !loading ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              <FontAwesomeIcon icon={faCarSide} className="mb-3 text-5xl text-slate-300" />
              <p className="font-semibold">{hasSearched ? "No available vehicles found" : "Search for a vehicle"}</p>
              <p className="text-sm">{hasSearched ? "Try another vehicle item or leave Model blank." : "Select a vehicle item, then click Find."}</p>
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {rows.map((row, index) => (
                <button key={`${row.veId}-${index}`} type="button" onClick={() => setSelectedIndex(index)} className={`rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800 ${index === selectedIndex ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900" : "border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-slate-800 dark:text-white">{row.itemName}</p>
                      <p className="text-xs font-semibold text-blue-600">{row.itemCode}</p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      <span className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${String(row.availabilityStatus || "").toUpperCase() === "AVAILABLE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {row.availabilityStatus || "Available"}
                      </span>
                      <p className="text-xs text-slate-400">Selling Price</p>
                      <p className="font-bold text-emerald-600">{formatNumber(row.sellingPrice || 0)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <p><FontAwesomeIcon icon={faCarSide} className="mr-2 w-4 text-blue-500" /><span className="text-slate-500">{row.make || "—"} · {row.model || "—"} {row.modelYear || ""}</span></p>
                    <p><FontAwesomeIcon icon={faPalette} className="mr-2 w-4 text-blue-500" /><span className="text-slate-500">{row.color || "No color"}</span></p>
                    <p><FontAwesomeIcon icon={faBuilding} className="mr-2 w-4 text-blue-500" /><span className="text-slate-500">{row.branchName || row.branchCode || "—"}</span></p>
                    <p><FontAwesomeIcon icon={faWarehouse} className="mr-2 w-4 text-blue-500" /><span className="text-slate-500">{row.whouseName || row.whouseCode || "—"}</span></p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
                    <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-700">CS: {row.csNo || "—"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-700">Engine: {row.engineNo || "—"}</span>
                    <span className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-700">Serial: {row.serialNo || "—"}</span>
                    {row.reservedVsoNo && <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">VSO: {row.reservedVsoNo}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {showItemLookup && (
        <ItemMastLookupModal
          isOpen
          endpoint="getInvLookupVE"
          docType="PRVE"
          enableMultiSelect={false}
          onClose={(payload) => {
            const item = Array.isArray(payload?.records) ? payload.records[0] : payload?.records || payload;
            if (item) {
              setItemCode(item.itemCode || "");
              setItemName(item.itemName || item.itemDesc || "");
              setRows([]);
              setHasSearched(false);
            }
            setShowItemLookup(false);
          }}
          onCancel={() => setShowItemLookup(false)}
        />
      )}
    </div>
  );

  return standalone ? content : (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      {content}
    </div>
  );
};

export default VEAvailabilityInquiry;
