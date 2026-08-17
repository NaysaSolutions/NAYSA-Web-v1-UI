import React, { useEffect, useState } from "react";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";

const CloseRRModal = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) setPassword("");
  }, [isOpen]);

  const handleClose = () => {
    setPassword("");
    onClose(false);
  };

  const handleSubmit = () => {
    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      useSwalErrorAlert("Password required", "Please enter your password.");
      return;
    }

    onClose({ password: trimmedPassword });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 pt-5 pb-2 flex justify-between items-center bg-white">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Close RR
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border-l-4 border-red-500 rounded-r-md">
            <svg
              className="w-5 h-5 text-red-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-red-800 font-medium leading-snug">
              This will close the receiving report and prevent further editing.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onPaste={(event) => event.preventDefault()}
              onCopy={(event) => event.preventDefault()}
              onCut={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
              autoComplete="one-time-code"
              spellCheck={false}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-black-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black-500/20 focus:border-black-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            Keep Document
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg shadow-sm hover:bg-red-700"
          >
            Close RR
          </button>
        </div>
      </div>
    </div>
  );
};

export default CloseRRModal;
