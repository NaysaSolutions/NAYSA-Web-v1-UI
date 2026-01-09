import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { reftables } from "@/NAYSA Cloud/Global/reftable.js";
import { fetchData } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

import {
  faMagnifyingGlass,
  faXmark,
  faAnglesLeft,
  faArrowLeft,
  faArrowRight,
  faAnglesRight,
} from "@fortawesome/free-solid-svg-icons";
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import apiClient from "../Configuration/BaseURL";

// export default function AllTranDocNo({
//   isOpen,
//   branchCode,
//   docNo,
//   docType,
//   onClose,
//   onChangeBranch,
//   onFindRetrieve,
//   onApplyDocNo,
//   onNavigate,
// }) {

const AllTranDocNo = ({ isOpen, onClose, source, params,docNo, onRetrieve,onResponse }) => {

  const { user } = useAuth();
  const documentTitle = reftables[params.docType];
  const [mode, setMode] = useState("retrieve");
  const [branchModal, setBranchModal] = useState(false);
  const [localBranch, setLocalBranch] = useState(params.branchCode);
  const docRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docNoValue, setDocNoValue] = useState(docNo ?? "");
  const [direction, setDirection] = useState("");
  // 🔹 Drag
  const modalRef = useRef(null);
  const [position, setPosition] = useState({
    x: window.innerWidth / 2 - 260,
    y: window.innerHeight / 2 - 220,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = (e) => {
    e.preventDefault();
    const r = modalRef.current.getBoundingClientRect();
    setIsDragging(true);
    setOffset({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const stopDrag = () => setIsDragging(false);
  const handleDrag = (e) => {
    if (!isDragging) return;
    const newX = e.clientX - offset.x;
    const newY = e.clientY - offset.y;
    setPosition({
      x: Math.max(10, Math.min(newX, window.innerWidth - 540)),
      y: Math.max(10, Math.min(newY, window.innerHeight - 300)),
    });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleDrag);
    window.addEventListener("mouseup", stopDrag);
    return () => {
      window.removeEventListener("mousemove", handleDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  });


  useEffect(() => {
      setDocNoValue(docNo ?? "");
  }, [isOpen]);

   useEffect(() => {
      setDocNoValue(onResponse.documentNo ?? "");
  }, [onResponse]);






  const RetrieveDocument = (modalClose,key) => {
    const data = { docNo: (docNoValue ?? "").trim(),key,modalClose };
    onRetrieve?.(data);
  };






  // // 🔹 Default branch
  // useEffect(() => {
  //   if (!localBranch || !localBranch.branchCode) {
  //     const def = {
  //       branchCode: user?.BRANCH_CODE || "HO",
  //       branchName: user?.BRANCH_NAME || "Head Office",
  //     };
  //     setLocalBranch(def);
  //     onChangeBranch?.(def);
  //   }
  // }, [open]);

  // Always mirror SVI's chosen branch

  // const fetchDocNavigation = async (branchCode, currentDocNo) => {
  //   const { data: result } = await fetchData('find' + docType, { json_data: { branchCode, currentDocNo } });
  //   // return result?.nextDocNo ?? null;
  //   console.log(result);
  // };

  // const fetchRecordNavigation = async (branchCode) => {
  //   const { data: result } = await apiClient('find' + pdocType, { json_data: { branchCode } });
  // console.log(result);
  // };



  // useEffect(() => {
  //   if (branch?.branchCode && branch?.branchName) {
  //     setLocalBranch(branch);
  //     fetchRecordNavigation(branch.branchCode);
  //   }
  // }, [branch, open]);



  useEffect(() => {
    if (!open) return;
    const onKey = async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "F6") {
        e.preventDefault();
        setMode("retrieve");
      }
      if (e.key === "F7") {
        e.preventDefault();
        setMode("use");
      }
      if (
        e.key === "F5" ||
        (e.key === "Enter" && document.activeElement === docRef.current)
      ) {
        e.preventDefault();
        const val = docRef.current?.value || "";
        if (mode === "retrieve")
          await RetrieveDocument?.(false, "");
        else
          await onApplyDocNo?.(localBranch, val);
      }
    };
    window.addEventListener("keydown", onKey);
    setTimeout(() => docRef.current?.focus(), 50);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen,RetrieveDocument]);


  

  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal (fixed width/height look; white body; blue header/footer) */}
      <div
        ref={modalRef}
        className="absolute w-[520px] max-w-[92vw] rounded-xl shadow-2xl bg-white text-slate-800 border border-[#1f4b68]/30 cursor-default select-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transition: isDragging ? "none" : "transform 0.1s ease-out",
        }}
      >
        {/* Header (drag handle) */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-[#2c6c95] text-white rounded-t-xl cursor-move"
          onMouseDown={startDrag}
        >
          <div className="text-sm font-semibold tracking-wide uppercase">
            {documentTitle}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition"
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* 🔹 Nav row with fixed height to prevent reflow */}
        <div className="px-6 pt-3">
          <div className="h-9 flex items-center justify-center">
            {/* Render buttons in retrieve; keep invisible spacer in use mode to keep size */}
            {mode === "retrieve" ? (
              <div className="flex justify-center gap-2">
                {[
                  { icon: faAnglesLeft, label: "First", key: "F" },
                  { icon: faArrowLeft, label: "Previous", key: "P" },
                  { icon: faArrowRight, label: "Next", key: "N" },
                  { icon:  faAnglesRight, label: "Last", key: "L" },
                ].map((btn) => (
                  <button
                    key={btn.key}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#eaf2f7] text-[#1f4b68] hover:bg-white transition flex items-center shadow-sm"
                    onClick={async () => {
                      const n = await RetrieveDocument?.(true,btn.key);
                      if (n != null) docRef.current.value = n;
                    }}
                  >
                    <FontAwesomeIcon icon={btn.icon} className="mr-1" />
                    {btn.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="h-6" /> // spacer, keeps height stable
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 pt-2">
          {/* Branch (white body, blue accents) */}
          <div className="mb-4">
            <label className="text-xs text-slate-600 mb-1 block tracking-wide">
              Branch
            </label>
            <div
              className={`flex items-center rounded-md h-12 px-3 transition-all shadow-sm border 
                  ${true /* lockBranch */
                  ? "bg-slate-100 border-slate-200 cursor-not-allowed"
                  : "bg-white hover:bg-slate-50 border-slate-200 cursor-pointer"
                }`}
              // disabled: do not open the lookup
              onClick={() => { }}
            >
              <span className="flex-1 text-2xl font-bold tracking-wider text-[#1f4b68]">
                {params.branchName}
              </span>
              {/* magnifier hidden when locked */}
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className={`ml-3 ${true ? "opacity-0 pointer-events-none" : "text-[#2c6c95]"}`}
              />
            </div>
          </div>

          {/* Document No */}
          <div className="mb-6">
            <label className="text-xs text-slate-600 mb-1 block tracking-wide">
              Document No.
            </label>
            <input
              ref={docRef}
              value={docNoValue}
              onChange={(e) => setDocNoValue(e.target.value)}
              className="peer global-tran-textbox-ui !h-16 !py-4 text-3xl font-bold tracking-[0.25em] text-center text-[#1f4b68] bg-white border border-slate-200 shadow-inner focus:ring-2 focus:ring-[#2c6c95]/60"
              placeholder="00000000"
            />
          </div>

          {/* Primary Button */}
          <div className="flex justify-center">
            <button
              onClick={async () => {
                const val = docRef.current?.value || "";
                if (mode === "retrieve")
                  RetrieveDocument(false,"");
                else
                  await onApplyDocNo?.(localBranch, val);
              }}
              className={`px-6 py-2.5 rounded-md font-semibold text-sm shadow-md transition ${mode === "retrieve"
                ? "bg-[#eaf2f7] text-[#1f4b68] hover:bg-white"
                : "bg-[#d1e4f2] text-[#1f4b68] hover:bg-white"
                }`}
            >
              {mode === "retrieve"
                ? "Find and Retrieve (F5)"
                : "Apply Document No (F5)"}
            </button>
          </div>
        </div>

        {/* Footer Tabs */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#eaf2f7] rounded-b-xl text-[#1f4b68] font-semibold text-xs border-t border-slate-200">
          <button
            onClick={() => setMode("retrieve")}
            className={`px-3 py-1 rounded-md transition ${mode === "retrieve"
              ? "bg-[#2c6c95] text-white shadow-sm"
              : "hover:bg-[#d6e5ef]"
              }`}
          >
            Retrieve Selected Document (F6)
          </button>
          <button
            onClick={() => setMode("use")}
            className={`px-3 py-1 rounded-md transition ${mode === "use"
              ? "bg-[#2c6c95] text-white shadow-sm"
              : "hover:bg-[#d6e5ef]"
              }`}
          >
            Use Selected Document (F7)
          </button>
        </div>
      </div>

      {/* Branch Modal */}
      {branchModal && (
        <BranchLookupModal
          isOpen={branchModal}
          onClose={(picked) => {
            setBranchModal(false);
            if (picked) {
              const b = {
                branchCode: picked.branchCode || picked.code,
                branchName: picked.branchName || picked.name,
              };
              setLocalBranch(b);
              onChangeBranch?.(b);
            }
            setTimeout(() => docRef.current?.focus(), 50);
          }}
        />
      )}
    </div>
    );
};

export default AllTranDocNo;