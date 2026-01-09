import React, { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faList, faPen, faSave, faUndo, faPrint, faTimesCircle, faCopy,
  faInfoCircle, faVideo, faFilePdf, faPaperclip, faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate, useLocation } from "react-router-dom";
// import { useReset } from "./ResetContext"; // if you need it, keep; otherwise remove

const Header = ({
  // navigation / tabs
  activeTopTab,              // 'details' | 'history' (optional; overrides auto-detection)
  detailsRoute = "/page/SVI",
  historyRoute = "/page/AllTranHistory",
  onDetails,                 // optional override (don’t navigate)
  onHistory,                 // optional override (don’t navigate)

  // actions
  showActions = true,
  showBIRForm=true,

  // action callbacks
  pdfLink, videoLink, onPrint, printData, onReset, onSave, onPost, onCancel, onCopy, onAttach,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { triggerReset } = useReset();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const guideDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guideDropdownRef.current && !guideDropdownRef.current.contains(e.target)) {
        setIsGuideOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---- compute which tab is active ----
  const computedActive =
    activeTopTab ??
    (location.pathname === historyRoute
      ? "history"
      : location.pathname === detailsRoute
      ? "details"
      : undefined);

  // ---- navigation guards: only navigate if path actually changes ----
  const goDetails = () => {
    if (onDetails) return onDetails();
    if (location.pathname !== detailsRoute) navigate(detailsRoute);
  };

  const goHistory = () => {
    if (onHistory) return onHistory();
    if (location.pathname !== historyRoute) navigate(historyRoute);
  };

  // ---- actions ----
  const handleSave = () => onSave?.();
  const handlePost = () => onPost?.();
  const handleAttach = () => onAttach?.();
  const handleReset = () => onReset?.();
  const handleCancel = () => onCancel?.();
  const handleCopy = () => onCopy?.();
  const handlePDFGuide = () => { if (pdfLink) window.open(pdfLink, "_blank"); setIsGuideOpen(false); };
  const handleVideoGuide = () => { if (videoLink) window.open(videoLink, "_blank"); setIsGuideOpen(false); };
  const handlePrint = () => onPrint?.(printData);

  return (
    <div className="fixed top-[50px] left-0 w-full z-30 bg-white shadow-md dark:bg-gray-800">
      <div className="flex flex-col md:flex-row items-center justify-between px-4 py-1 gap-2 border-b border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center md:justify-start gap-1 lg:gap-2 w-full md:w-auto">
          <button
            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
              ${computedActive === "details"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"}`}
            onClick={goDetails}
          >
            <FontAwesomeIcon icon={faPen} className="w-4 h-3 mr-2" />
            Transaction Details
          </button>

          <button
            className={`flex items-center px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
              ${computedActive === "history"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300"}`}
            onClick={goHistory}
          >
            <FontAwesomeIcon icon={faList} className="w-4 h-4 mr-2" />
            Transaction History
          </button>
        </div>

        {/* Actions (hidden when showActions=false) */}
        {showActions && (
          <div className="flex flex-wrap justify-center md:justify-end gap-1 lg:gap-2 w-full md:w-auto">
            <button onClick={handleSave}  className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faSave} /> <span className="hidden lg:inline ml-2">Save</span>
            </button>
            <button onClick={handleReset} className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faUndo} /> <span className="hidden lg:inline ml-2">Reset</span>
            </button>
            <button onClick={handleCopy}  className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faCopy} /> <span className="hidden lg:inline ml-2">Copy</span>
            </button>
            <button onClick={handlePrint} className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faPrint} /> <span className="hidden lg:inline ml-2">Print</span>
            </button>
             {showBIRForm && (
            <button onClick={handlePrint} className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faPrint} /> <span className="hidden lg:inline ml-2">BIR Form</span>
            </button>
             )}
            <button onClick={handleAttach} className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700">
              <FontAwesomeIcon icon={faPaperclip} /> <span className="hidden lg:inline ml-2">Attach</span>
            </button>

            <div className="relative" ref={guideDropdownRef}>
              <button
                onClick={() => setIsGuideOpen(!isGuideOpen)}
                className="px-3 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-800 dark:hover:bg-blue-700"
              >
                <FontAwesomeIcon icon={faInfoCircle} /> <span className="hidden lg:inline ml-2">Guide</span>
              </button>
              {isGuideOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-700 dark:ring-gray-600">
                  <div className="py-1">
                    <button onClick={handlePDFGuide} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600">
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> PDF Guide
                    </button>
                    <button onClick={handleVideoGuide} className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600">
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" /> Video Guide
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handlePost} className="px-3 py-2 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600">
              <FontAwesomeIcon icon={faExclamationTriangle} /> <span className="hidden lg:inline ml-2">Post</span>
            </button>
            <button onClick={handleCancel} className="px-3 py-2 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600">
              <FontAwesomeIcon icon={faTimesCircle} /> <span className="hidden lg:inline ml-2">Cancel</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// push content below fixed header
export const HeaderSpacer = ({ height = "96px" }) => <div style={{ height }} aria-hidden="true" />;

export default Header;
