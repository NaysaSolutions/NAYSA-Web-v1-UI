import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const ARDSCashReversalModal = ({ isOpen, defaults, onClose, onConfirm }) => {
  const [jvNo, setJvNo] = useState("");
  const [jvDate, setJvDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isManual = String(defaults?.docSeries || "").toUpperCase() === "MANUAL";

  useEffect(() => {
    if (!isOpen) return;

    setJvNo(isManual ? String(defaults?.jvNo || "") : "");
    setJvDate(String(defaults?.jvDate || ""));
    setRemarks(String(defaults?.remarks || ""));
    setPassword("");
    setShowPassword(false);
  }, [isOpen, defaults, isManual]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const values = {
      jvNo: jvNo.trim(),
      jvDate: jvDate.trim(),
      remarks: remarks.trim(),
      password,
    };

    const missing = [];
    if (isManual && !values.jvNo) missing.push("JV No.");
    if (!values.jvDate) missing.push("JV Date");
    if (!values.remarks) missing.push("Remarks");
    if (!values.password) missing.push("Password");

    if (missing.length > 0) {
      useSwalErrorAlert(
        "Generate Cash Reversal",
        `The following fields are required: ${missing.join(", ")}.`
      );
      return;
    }

    onConfirm(values);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/60 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-gray-900">
              Generate Cash Reversal
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Create and post the linked Journal Voucher.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Close"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-2">
          <div className="rounded-r-md border-l-4 border-blue-500 bg-blue-50 p-3 text-sm font-medium text-blue-900">
            After confirmation, the JV will be posted and this ARDS will become non-editable.
          </div>

          <div className="space-y-3">
            {isManual && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">JV No.</label>
                <input
                  value={jvNo}
                  onChange={(event) => setJvNo(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">JV Date</label>
              <input
                type="date"
                value={jvDate}
                onChange={(event) => setJvDate(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Remarks</label>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onPaste={(event) => event.preventDefault()}
                  onCopy={(event) => event.preventDefault()}
                  onCut={(event) => event.preventDefault()}
                  onContextMenu={(event) => event.preventDefault()}
                  autoComplete="one-time-code"
                  spellCheck={false}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  onMouseDown={(event) => event.preventDefault()}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-800"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Generate JV
          </button>
        </div>
      </div>
    </div>
  );
};

export default ARDSCashReversalModal;
