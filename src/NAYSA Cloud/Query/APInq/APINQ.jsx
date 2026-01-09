import { useMemo, useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import APINQActionBar from "./APINQActionBar";
import APInquiryTab from "./APInquiryTab";
import APAdvancesTab from "./APAdvancesTab";
import APAgingSummaryTab from "./APAgingSummaryTab";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faFileLines,faDatabase} from "@fortawesome/free-solid-svg-icons";


const TABS = [
  { key: "inquiry",  label: "AP Query",       component: APInquiryTab },
  { key: "advances", label: "AP Advances",      component: APAdvancesTab },
  { key: "aging",    label: "AP Aging Summary", component: APAgingSummaryTab },
];

export default function APINQ() {
  const documentTitle = "AP Query";

  const [activeTab, setActiveTab] = useState("inquiry");
  const ActiveComp = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.component ?? null,
    [activeTab]
  );

  // Actions registered by the active tab
  const [actions, setActions] = useState({});

  // === Fixed bar measurements ===
  const barRef = useRef(null);
  const [headerH, setHeaderH] = useState(48); // default guess of your top header height
  const [barH, setBarH] = useState(48);       // default guess of this bar's height

  // ✅ Clear caches BEFORE children mount effects run
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    delete window.__NAYSA_APADV_CACHE__;
    delete window.__NAYSA_APAGE_CACHE__;
    if (window.__NAYSA_APINQ_CACHE__) {
      delete window.__NAYSA_APINQ_CACHE__.AP_INQUIRY;
    }
    window.__NAYSA_APINQ_CACHE__ = {};
  }, []);

  // Measure top header and our bar (works even if layout changes)
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const header =
      document.querySelector("#appHeader") ||                 // prefer an explicit id if you have it
      document.querySelector(".global-app-topbar") ||         // common NAYSA topbar class
      document.querySelector("header[role='banner']") ||      // generic header
      document.querySelector("header");                       // fallback

    const remeasure = () => {
      if (header) {
        const rect = header.getBoundingClientRect();
        setHeaderH(Math.max(0, Math.round(rect.height)));
      }
      if (barRef.current) {
        const rect = barRef.current.getBoundingClientRect();
        setBarH(Math.max(0, Math.round(rect.height)));
      }
    };

    // Initial measure + on resize
    remeasure();
    window.addEventListener("resize", remeasure);

    // If fonts/icons load later and change heights slightly
    const raf = requestAnimationFrame(remeasure);
    const raf2 = requestAnimationFrame(remeasure);

    return () => {
      window.removeEventListener("resize", remeasure);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // ✅ Memoize so the child doesn't see a new function each render
  const registerActions = useCallback((tabActions) => {
    setActions(tabActions || {});
  }, []);

  // Ensure safe defaults whenever the active tab changes
  useEffect(() => {
    setActions((prev) => ({
      onFind:           prev.onFind           ?? (() => {}),
      onReset:          prev.onReset          ?? (() => {}),
      onPrint:          prev.onPrint          ?? (() => window.print()),
      onViewDoc:        prev.onViewDoc        ?? (() => window.open("/public/NAYSA AP Inquiry.pdf", "_blank")),
      onOpenBal:        prev.onOpenBal        ?? (() => {}),
      onExport:         prev.onExport         ?? (() => {}),
      onExportSummary:  prev.onExportSummary  ?? (() => {}),
      onExportDetailed: prev.onExportDetailed ?? (() => {}),
    }));
  }, [activeTab]);

  // Route ActionBar button IDs → registered handlers
  const handleAction = (id) => {
    switch (id) {
      case "find":
      case "reprocess":
        return actions.onFind?.();
      case "reset":
        return actions.onReset?.();
      case "print":
        return actions.onPrint?.();
      case "viewDoc":
        return actions.onViewDoc?.();
      case "export":
        return actions.onExport?.();
      case "exportSummary":
        return actions.onExportSummary?.();
      default:
        return;
    }
  };

  return (
    <div className="global-tran-main-div-ui">
      {/* Spacer so content sits below the fixed bar */}
      <div style={{ height: barH }} />

      {/* Fixed Tabs + Action Bar (always visible) */}
      <div
        ref={barRef}
        className="
          fixed left-0 right-0 z-40
          bg-white/95 backdrop-blur supports-backdrop-blur:bg-white/80
          border-b shadow-sm
        "
        style={{ top: headerH }}  // pins this bar directly under your main header
      >
        <div className="flex justify-between items-center px-6 py-2">
          {/* Tabs Group: left */}
          <div className="flex flex-row gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
                  ${activeTab === tab.key
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"}`}
                  >
                <FontAwesomeIcon icon={faDatabase} className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Action Bar: right, inline with the tabs */}
          <APINQActionBar
            activeTab={activeTab}
            onAction={handleAction}
            help={{ pdfLink: "/public/NAYSA AP Inquiry.pdf" }}
          />
        </div>
      </div>

      {/* Tab content */}
      <div>
        {ActiveComp && <ActiveComp registerActions={registerActions} />}
      </div>
    </div>
  );
}
