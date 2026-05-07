
import React, { useState, useEffect } from "react";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalInfoAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const GlobalCombinedLookup = ({
  isOpen,
  onCancel,
  onClose,
  summaryColumns,
  detailColumns,
  summaryData: initialSummaryData,
  fetchDetailApi,
  summarySelectionMode = "multiple",
  tabTitles = ["Summary", "Details"]
}) => {
  const [activeTab, setActiveTab] = useState("Summary");
  const [summaryData, setSummaryData] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDetailCount, setSelectedDetailCount] = useState(0);
  const [detailKey, setDetailKey] = useState(0);
  const [loadedFingerprint, setLoadedFingerprint] = useState("");
  const [selectedSummaryIds, setSelectedSummaryIds] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setSummaryData(initialSummaryData || []);
      setDetailData([]);
      setLoadedFingerprint("");
      setSelectedSummaryIds([]);
      setActiveTab("Summary");
    }
  }, [isOpen, initialSummaryData]);

  const handleTabDetailClick = async () => {
    if (detailData.length === 0) return;

    await useSwalInfoAlert(
      "Viewing Loaded Details",
      `You're seeing the details from your last "Load." If you've changed your selection in the ${tabTitles[0]} tab, remember to click the Update button to refresh this list!`
    );

    setActiveTab("Detail");
  };

  const handleSummaryAction = async (payload) => {
    const selectedIds = payload.data || [];
    if (selectedIds.length === 0) return;

    setSelectedSummaryIds(selectedIds);
    const currentFingerprint = selectedIds.sort().join(",");

    if (currentFingerprint === loadedFingerprint && detailData.length > 0) {
      setActiveTab("Detail");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDetailApi(selectedIds);
      const rawData = res?.data?.[0]?.result ? JSON.parse(res.data[0].result) : (res.data || res);
      const dataArray = Array.isArray(rawData) ? rawData : [];

      setDetailData(dataArray);
      setLoadedFingerprint(currentFingerprint);

      setSelectedDetailCount(0);
      setDetailKey(prev => prev + 1);
      setActiveTab("Detail");
    } catch (err) {
      console.error("Error updating detail data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isDetailEnabled = detailData.length > 0;

  const TabHeader = (
    <div className="flex items-center -ml-4 -my-2">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setActiveTab("Summary"); }}
        className={`px-6 py-2 text-[11px] font-bold transition-all border-b-2 ${
          activeTab === "Summary" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"
        }`}
      >
        1. {tabTitles[0]}
      </button>

      <button
        type="button"
        disabled={!isDetailEnabled}
        onClick={(e) => {
          e.stopPropagation();
          if (activeTab === "Detail") return;
          handleTabDetailClick();
        }}
        className={`px-6 py-2 text-[11px] font-bold transition-all border-b-2 ${
          activeTab === "Detail" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 disabled:opacity-20"
        }`}
      >
        2. {tabTitles[1]} {isDetailEnabled && `(${activeTab === "Detail" ? selectedDetailCount : detailData.length})`}
      </button>
    </div>
  );

  return (
    <>
      <div style={{ display: activeTab === "Summary" ? "block" : "none" }}>
        <GlobalLookupModalv1
          isOpen={isOpen}
          title={TabHeader}
          endpoint={summaryColumns}
          data={summaryData}
          btnCaption={detailData.length > 0 ? `Update/View ${tabTitles[1]} →` : `Load ${tabTitles[1]} →`}
          singleSelect={summarySelectionMode === "single"}
          onClose={handleSummaryAction}
          onCancel={onCancel}
        />
      </div>

      <div style={{ display: activeTab === "Detail" ? "block" : "none" }}>
        <GlobalLookupModalv1
          key={detailKey}
          isOpen={isOpen}
          title={TabHeader}
          endpoint={detailColumns}
          data={detailData}
          btnCaption="Confirm Final Selection"
          singleSelect={false}
          onSelectionChange={(rows) => setSelectedDetailCount(rows.length)}
          onClose={(finalPayload) => {
          const selectedIds = finalPayload.data || [];

          // 1. Map IDs back to full Detail objects
          // Note: Replace 'prId' or 'PRNo' with the actual primary key field name of your detail rows
          const selectedDetailRows = detailData.filter((row) =>
            selectedIds.includes(row.groupId) 
          );

          // 2. Map loaded Summary IDs back to full Summary objects
          // Using the state 'selectedSummaryIds' we captured during handleSummaryAction
          const selectedSummaries = summaryData.filter((item) =>
            selectedSummaryIds.includes(item.groupId)
          );

          onClose({
            details: selectedDetailRows, // Now passes Array of Objects, not IDs
            summary: selectedSummaries   // Now passes the Header data
          });
        }}
          onCancel={onCancel}
        />
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-[999999] bg-white/40">
          <LoadingSpinner size="large" />
        </div>
      )}
    </>
  );
};

export default GlobalCombinedLookup;