// src/NAYSA Cloud/Global/AttachFileModal.jsx  (or your preferred folder)
import React, { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDownload,
  faPlus,
  faTrash,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const safeText = (v) => (v === null || v === undefined ? "" : String(v));

const AttachFileModal = ({
  isOpen,
  onClose,
  transaction = "Payee Master Data",
  documentNo = "",
  rows = [],
  // ✅ Put naysalogo.png in /public so it works as /naysalogo.png
  // or pass logoSrc prop if you store it elsewhere
  logoSrc = "/public/naysa_logo.png",

  onDownload,
  onDownloadAll,
  onAdd,
  onDelete,
}) => {
  const [filterFile, setFilterFile] = useState("");
  const [filterModified, setFilterModified] = useState("");
  const [filterUploaded, setFilterUploaded] = useState("");

  const filteredRows = useMemo(() => {
    const f1 = filterFile.trim().toLowerCase();
    const f2 = filterModified.trim().toLowerCase();
    const f3 = filterUploaded.trim().toLowerCase();

    return (rows || []).filter((r) => {
      const fileName = safeText(r?.fileName ?? r?.filename ?? r?.name).toLowerCase();
      const modified = safeText(r?.modifiedDate ?? r?.modified_date ?? r?.mtime).toLowerCase();
      const uploaded = safeText(r?.uploadedDate ?? r?.uploaded_date ?? r?.uploaded).toLowerCase();

      if (f1 && !fileName.includes(f1)) return false;
      if (f2 && !modified.includes(f2)) return false;
      if (f3 && !uploaded.includes(f3)) return false;
      return true;
    });
  }, [rows, filterFile, filterModified, filterUploaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-[980px] max-w-[98vw] rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt="NAYSA"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                // prevent broken icon
                e.currentTarget.style.display = "none";
              }}
            />
            <div className="leading-tight">
              <div className="text-sm font-bold text-gray-800">
                NAYSA-Solutions, Inc. – Attach Document
              </div>
              <div className="text-xs text-gray-500">
                Manage file attachments for this transaction
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onClose?.()}
            className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-gray-200 text-gray-700"
            title="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* TOP INFO + DOWNLOAD BUTTONS */}
        <div className="px-4 py-3 border-b">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            {/* LEFT: Download buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDownload?.()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} />
                Download
              </button>

              <button
                type="button"
                onClick={() => onDownloadAll?.()}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} />
                Download All
              </button>
            </div>

            {/* RIGHT: Transaction/Branch/DocNo */}
            <div className="text-xs text-gray-700 md:text-right">
              <div className="flex md:justify-end gap-2">
                <span className="font-semibold">Master Data</span>
                <span className="text-blue-700 italic">{safeText(transaction)}</span>
              </div>

              <div className="flex md:justify-end gap-2">
                <span className="font-semibold">Payee Name</span>
                <span className="text-blue-700 italic">{safeText(documentNo)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* TABLE */}
        <div className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[360px] overflow-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr className="text-gray-700">
                    <th className="p-2 text-left font-semibold border-b border-gray-200">File Name</th>
                    <th className="p-2 text-left font-semibold border-b border-gray-200">Modified Date</th>
                    <th className="p-2 text-left font-semibold border-b border-gray-200">Uploaded Date</th>
                  </tr>
                  <tr className="bg-white">
                    <th className="p-1 border-b border-gray-200">
                      <input
                        className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                        placeholder="Contains:"
                        value={filterFile}
                        onChange={(e) => setFilterFile(e.target.value)}
                      />
                    </th>
                    <th className="p-1 border-b border-gray-200">
                      <input
                        className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                        placeholder="Equals:"
                        value={filterModified}
                        onChange={(e) => setFilterModified(e.target.value)}
                      />
                    </th>
                    <th className="p-1 border-b border-gray-200">
                      <input
                        className="w-full global-tran-textbox-ui global-tran-textbox-enabled"
                        placeholder="Equals:"
                        value={filterUploaded}
                        onChange={(e) => setFilterUploaded(e.target.value)}
                      />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((r, i) => (
                    <tr
                      key={i}
                      className={`cursor-pointer hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                    >
                      <td className="p-2 border-b border-gray-100">
                        {safeText(r?.fileName ?? r?.filename ?? r?.name)}
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        {safeText(r?.modifiedDate ?? r?.modified_date ?? r?.mtime)}
                      </td>
                      <td className="p-2 border-b border-gray-100">
                        {safeText(r?.uploadedDate ?? r?.uploaded_date ?? r?.uploaded)}
                      </td>
                    </tr>
                  ))}

                  {!filteredRows.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        No attachments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => onAdd?.()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-800 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Add
            </button>

            <button
              type="button"
              onClick={() => onDelete?.()}
              className="px-4 py-2 text-xs font-medium text-white bg-red-700 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTrash} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachFileModal;
