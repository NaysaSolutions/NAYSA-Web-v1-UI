import { useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBarcode, faMagnifyingGlass, faQrcode, faSearch } from "@fortawesome/free-solid-svg-icons";
import Header from "@/NAYSA Cloud/Components/Header";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { formatNumber, useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import { useformatToDatev2 } from "@/NAYSA Cloud/Global/dates";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import SearchFAAsset from "@/NAYSA Cloud/Lookup/SearchFAAsset.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const FAAssetInquiry = () => {
  const { currentUserRow } = useAuth();
  const scanRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");
  const [asset, setAsset] = useState(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAssetInquiry = async (value, sourceField = "search") => {
    const cleaned = String(value || "").trim();
    if (!cleaned) {
      useSwalErrorAlert("Asset Required", "Please input or scan an asset tag, barcode, or asset number.");
      return;
    }

    setLoading(true);
    try {
      const params = {
        PARAMS: JSON.stringify({
          json_data: {
            [sourceField]: cleaned,
            search: sourceField === "search" ? cleaned : "",
          },
        }),
      };

      const { data } = await apiClient.get("/getFAAssetInquiry", { params });
      const rawData = data?.data?.[0]?.result ?? data?.result ?? "{}";
      const parsed = rawData ? JSON.parse(rawData) : null;

      if (!parsed?.faCode) {
        setAsset(null);
        setLedgerRows([]);
        useSwalErrorAlert("No Asset Found", "No fixed asset matched the entered/scanned value.");
        return;
      }

      setAsset(parsed);
      setLedgerRows(Array.isArray(parsed.ledger) ? parsed.ledger : []);
      setSearchValue(parsed.tagNo || parsed.barCode || parsed.faCode || cleaned);
    } catch (error) {
      console.error("FA asset inquiry error:", error);
      useSwalErrorAlert("Inquiry Error", error.message || "Unable to load asset inquiry.");
    } finally {
      setLoading(false);
    }
  };

  const currentStatusClass = useMemo(() => {
    const status = String(asset?.status || "").toUpperCase();
    if (["DISPOSED", "CANCELLED", "INACTIVE"].includes(status)) return "text-red-600 bg-red-50 border-red-200";
    if (["SPLIT", "MERGED"].includes(status)) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-blue-700 bg-blue-50 border-blue-200";
  }, [asset?.status]);

  return (
    <div className="min-h-screen bg-[#f7fbff] text-slate-800">
      <Header
        activeTopTab="details"
        detailsRoute="/page/FAINQ"
        showActions={false}
        showBIRForm={false}
        showCopyForm={false}
        isViewDocument={false}
      />

      <div className="pt-[112px] px-3 pb-8">
        <div className="bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-blue-100 bg-white">
            <h1 className="text-base font-bold text-blue-900">Fixed Asset Inquiry / Asset Ledger</h1>
            <p className="text-xs text-slate-500">
              Input manually, scan QR/barcode, or search from the fixed asset list to view current status and full historical ledger.
            </p>
          </div>

          <div className="p-4 border-b bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-7 relative">
                <input
                  ref={scanRef}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      loadAssetInquiry(searchValue);
                    }
                  }}
                  placeholder="Input / scan Asset Tag, QR code, Barcode, or Asset No."
                  className="w-full h-10 rounded-lg border border-slate-300 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                />
                <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-3.5 text-slate-400" />
                <div className="absolute right-3 top-3 text-slate-400 flex gap-2">
                  <FontAwesomeIcon icon={faQrcode} />
                  <FontAwesomeIcon icon={faBarcode} />
                </div>
              </div>
              <button
                onClick={() => loadAssetInquiry(searchValue)}
                className="md:col-span-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} className="mr-2" />
                Retrieve
              </button>
              <button
                onClick={() => setShowAssetModal(true)}
                className="md:col-span-3 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-800"
              >
                Search Asset List
              </button>
            </div>
          </div>

          {asset ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase font-bold text-slate-400">Asset No.</div>
                      <div className="text-lg font-bold text-blue-800">{asset.faCode}</div>
                      <div className="text-sm font-semibold text-slate-700 mt-1">{asset.faName}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${currentStatusClass}`}>{asset.status}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                    <Info label="Tag No." value={asset.tagNo} />
                    <Info label="Barcode" value={asset.barCode} />
                    <Info label="Serial No." value={asset.serialNo} />
                    <Info label="Brand / Model" value={asset.brandModel} />
                    <Info label="Category" value={asset.categName || asset.categCode} />
                    <Info label="Class" value={asset.className || asset.classCode} />
                    <Info label="Branch" value={`${asset.branchCode || ""} ${asset.branchName ? `- ${asset.branchName}` : ""}`} />
                    <Info label="Location" value={asset.flocName || asset.flocCode} />
                    <Info label="RC" value={asset.rcCode} />
                    <Info label="Custodian" value={asset.empName || asset.empNo} />
                    <Info label="EUL / RUL" value={`${asset.eul || 0} / ${asset.rul || 0}`} />
                    <Info label="Acq. Date" value={useformatToDatev2(asset.acqDate)} />
                  </div>
                </div>
                <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Amount label="Acquisition Cost" value={asset.acqCost} />
                  <Amount label="Accumulated Depreciation" value={asset.accumDepr} />
                  <Amount label="Net Book Value" value={asset.nbValue} highlight />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-blue-50 border-b text-xs font-bold text-blue-800">Asset Ledger / Movement History</div>
                <div className="overflow-auto max-h-[46vh] custom-scrollbar">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-200 z-10">
                      <tr>
                        {["Date", "Doc", "Doc No.", "Action", "From Loc", "To Loc", "From RC", "To RC", "Cost", "Accum Dep", "Book Value", "Remarks"].map((h) => (
                          <th key={h} className="global-lookup-th-ui whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerRows.length === 0 ? (
                        <tr><td colSpan={12} className="text-center py-10 text-slate-400">No ledger movement found.</td></tr>
                      ) : ledgerRows.map((row) => (
                        <tr key={row.ledgerId} className="border-b hover:bg-blue-50">
                          <td className="global-lookup-td-ui text-center">{useformatToDatev2(row.docDate)}</td>
                          <td className="global-lookup-td-ui text-center">{row.docCode}</td>
                          <td className="global-lookup-td-ui">{row.docNo}</td>
                          <td className="global-lookup-td-ui">{row.actionType}</td>
                          <td className="global-lookup-td-ui">{row.fromFlocCode}</td>
                          <td className="global-lookup-td-ui">{row.toFlocCode}</td>
                          <td className="global-lookup-td-ui text-center">{row.fromRcCode}</td>
                          <td className="global-lookup-td-ui text-center">{row.toRcCode}</td>
                          <td className="global-lookup-td-ui text-right">{formatNumber(row.assetCost || 0)}</td>
                          <td className="global-lookup-td-ui text-right">{formatNumber(row.accumDepr || 0)}</td>
                          <td className="global-lookup-td-ui text-right">{formatNumber(row.nbValue || 0)}</td>
                          <td className="global-lookup-td-ui min-w-[220px]">{row.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Input or scan an asset tag / QR / barcode to display current status and historical ledger.
            </div>
          )}
        </div>
      </div>

      {showAssetModal && (
        <SearchFAAsset
          isOpen={showAssetModal}
          branchCode={currentUserRow?.branchCode || ""}
          activeOnly={false}
          onClose={(row) => {
            setShowAssetModal(false);
            if (row?.faCode) loadAssetInquiry(row.faCode, "faCode");
          }}
        />
      )}

      {loading && <LoadingSpinner />}
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <div className="text-[10px] uppercase font-bold text-slate-400">{label}</div>
    <div className="font-semibold text-slate-700 break-words">{value || "-"}</div>
  </div>
);

const Amount = ({ label, value, highlight = false }) => (
  <div className={`flex items-center justify-between border-b border-slate-200 py-3 ${highlight ? "text-blue-800" : "text-slate-700"}`}>
    <span className="text-xs font-bold">{label}</span>
    <span className="text-sm font-bold">{formatNumber(value || 0)}</span>
  </div>
);

export default FAAssetInquiry;
