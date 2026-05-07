// src/NAYSA Cloud/Lookup/SearchAttachment.jsx
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faPaperclip,
  faPlus,
  faDownload,
  faTrash,
  faFile,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

import {
  useSwalErrorAlert,
  useSwalValidationAlert,
  useSwalDeleteConfirm,
  useSwalDeleteRecord
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  usehandleFileUpload,
  useHandleFileDelete,
  useHandleFileDownload,
  useHandleFileDownloadAll,
  useFetchTranAtt,
} from '@/NAYSA Cloud/Global/fileManagement';

const SearchAttachment = ({ isOpen, onClose, params }) => {
  // Destructure dynamic labels and values from params (Title removed from UI)
  const { DocumentID, CodeLabel, Code, NameLabel, Name } = params || {};
  
  const [files, setFiles] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!DocumentID) return;
      try {
        setIsFetching(true);
        const result = await useFetchTranAtt(DocumentID);
        if (!isMounted) return;

        const normalized = Array.isArray(result)
          ? result.map((item) => ({
              id: item.id || item.fileID,
              fileName: item.file_name || item.fileName,
              modifiedDate: item.dateModified ? new Date(item.dateModified) : null,
              uploadedDate: item.dateUploaded ? new Date(item.dateUploaded) : null,
            }))
          : [];
        setFiles(normalized);
      } catch (error) {
        if (isMounted) {
          console.error("❌ Failed to fetch attachments:", error);
          await useSwalErrorAlert("Error", "Failed to load attachments.");
        }
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    if (isOpen) {
      fetchData();
    } else {
      setFiles([]);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, DocumentID]);

  const handleFileChange = async (e) => {
    setIsUploading(true);
    const selectedFiles = Array.from(e.target.files).map((file) => ({
      file,
      modifiedDate: new Date(file.lastModified),
      uploadedDate: new Date(),
    }));

    if (selectedFiles.length > 0 && DocumentID) {
      try {
        const existingNames = files.map(f => f.fileName.toLowerCase());
        const filesToUpload = selectedFiles.filter(
          f => !existingNames.includes(f.file.name.toLowerCase())
        );

        if (filesToUpload.length < selectedFiles.length) {
          await useSwalValidationAlert({
            icon: "info",
            title: "Duplicate File",
            message: "Some files were skipped because they already exist.",
          });
        }

        if (filesToUpload.length > 0) {
          const result = await usehandleFileUpload(filesToUpload, DocumentID);
          const normalized = result.data.map((item) => ({
            id: item.id,
            fileName: item.file_name,
            modifiedDate: new Date(item.date_modified),
            uploadedDate: new Date(item.date_uploaded),
          }));
          setFiles((prev) => [...prev, ...normalized]);
        }
      } catch (error) {
        console.error("❌ Upload failed:", error);
        await useSwalErrorAlert("Error", "Failed to upload files.");
      }
    }

    e.target.value = "";
    setIsUploading(false);
  };

  const handleDelete = async (id, fileName) => {
    if (!id) return;

    const confirm = await useSwalDeleteConfirm(
      "Delete File?",
      `Are you sure you want to delete ${fileName}? This action cannot be undone.`
    );
    if (!confirm?.isConfirmed) return;

    setDeletingId(id);
    try {
      await useHandleFileDelete(id);
      setFiles((prev) => prev.filter((file) => file.id !== id));
      await useSwalDeleteRecord("Deleted", "File has been successfully removed.");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      await useSwalErrorAlert("Error", "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id, fileName) => {
    if (!id) return;
    setDownloadingId(id);
    try {
      await useHandleFileDownload(id, fileName);
    } catch (err) {
      console.error("❌ Download failed:", err);
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!DocumentID || files.length === 0) return;
    try {
      await useHandleFileDownloadAll(DocumentID);
    } catch (err) {
      console.error("❌ Download all failed:", err);
      await useSwalErrorAlert("Download Failed", err.message || "Failed to download all files.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 sm:p-0">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl mx-auto rounded-lg shadow-2xl overflow-hidden transform transition-all sm:my-8 sm:align-middle">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-100">
            <FontAwesomeIcon icon={faPaperclip} className="text-blue-600 text-lg" />
            <p className="font-bold text-lg">Attach Documents</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faXmark} size="xl" />
          </button>
        </div>

        {/* Transaction Info (Payee Code & Payee Name ONLY) */}
        <div className="p-4 m-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-sm rounded-lg grid sm:grid-cols-2 gap-4 shadow-sm">
          <p className="flex flex-col">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{CodeLabel || "Document No"}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{Code || "N/A"}</span>
          </p>
          <p className="flex flex-col">
            <span className="font-bold text-[10px] text-gray-500 uppercase tracking-widest">{NameLabel || "Name"}</span>
            <span className="text-blue-700 dark:text-blue-400 font-semibold">{Name || "N/A"}</span>
          </p>
        </div>

        {/* Attachment Details */}
        <div className="flex-grow px-4 pb-4 min-h-[250px] overflow-hidden">
          {isFetching ? (
            <div className="flex items-center justify-center h-full text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span className="text-gray-600 dark:text-gray-300 font-medium">Loading attachments...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center py-10 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <FontAwesomeIcon icon={faFile} size="3x" className="mb-3 text-gray-300" />
              <p className="font-medium text-gray-500">No attachments found.</p>
              <p className="text-xs mt-1">Click "Add File" below to upload documents.</p>
            </div>
          ) : (
            <div className="max-h-[300px] mt-0 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300">File Name</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Modified Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">Uploaded Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                  {files.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2.5 flex items-center space-x-2 text-gray-800 dark:text-gray-100 font-medium">
                        <FontAwesomeIcon icon={faFile} className="text-gray-400" />
                        <span>{item.fileName}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell text-xs">
                        {item.modifiedDate ? item.modifiedDate.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 hidden sm:table-cell text-xs">
                        {item.uploadedDate ? item.uploadedDate.toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-center space-x-4">
                        <button
                          onClick={() => handleDownload(item.id, item.fileName)}
                          title="Download"
                          disabled={downloadingId === item.id}
                          className="text-blue-500 hover:text-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FontAwesomeIcon icon={downloadingId === item.id ? faSpinner : faDownload} spin={downloadingId === item.id} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.fileName)}
                          title="Delete"
                          disabled={deletingId === item.id}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FontAwesomeIcon icon={deletingId === item.id ? faSpinner : faTrash} spin={deletingId === item.id} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex space-x-2">
            <label
              htmlFor="fileInput"
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg cursor-pointer transition-colors duration-200 font-bold text-xs uppercase tracking-wider
                ${isUploading ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
            >
              <FontAwesomeIcon icon={isUploading ? faSpinner : faPlus} spin={isUploading} />
              <span>{isUploading ? 'Uploading...' : 'Add File'}</span>
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              id="fileInput"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <button
              onClick={handleDownloadAll}
              disabled={files.length === 0}
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-blue-800 text-white transition-colors duration-200 font-bold text-xs uppercase tracking-wider disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:bg-blue-900"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchAttachment;