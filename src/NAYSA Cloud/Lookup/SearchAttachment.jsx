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
import Swal from 'sweetalert2';
import {
  usehandleFileUpload,
  useHandleFileDelete,
  useHandleFileDownload,
  useHandleFileDownloadAll,
  useFetchTranAtt,
} from '@/NAYSA Cloud/Global/fileManagement';

const AttachDocumentModal = ({ isOpen, onClose, params }) => {
  const { DocumentID, DocumentName, BranchName, DocumentNo } = params;
  const [files, setFiles] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
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
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to load attachments.",
          });
        }
      } finally {
        if (isMounted) {
          setIsFetching(false);
        }
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
  }, [isOpen, params]);

  const handleFileChange = async (e) => {
    setIsUploading(true);
    const selectedFiles = Array.from(e.target.files).map((file) => ({
      file,
      modifiedDate: new Date(file.lastModified),
      uploadedDate: new Date(),
    }));

    if (selectedFiles.length > 0) {
      try {
        const existingNames = files.map(f => f.fileName.toLowerCase());
        const filesToUpload = selectedFiles.filter(
          f => !existingNames.includes(f.file.name.toLowerCase())
        );

        if (filesToUpload.length < selectedFiles.length) {
          Swal.fire({
            icon: "info",
            title: "Duplicate File",
            text: "Some files were skipped because they already exist.",
            confirmButtonColor: "#3085d6",
            timer: 5000,
            timerProgressBar: true,
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
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to upload files.",
        });
      }
    }

    e.target.value = "";
    setIsUploading(false);
  };

  const handleDelete = async (id) => {
    if (!id) return;

    setDeletingId(id);
    try {
      await useHandleFileDelete(id);
      setFiles((prev) => prev.filter((file) => file.id !== id));
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "File has been deleted.",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      console.error("❌ Delete failed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to delete file.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id) => {
    if (!id) return;
    setDownloadingId(id);
    try {
      await useHandleFileDownload(id);
    } catch (err) {
      console.error("❌ Download failed:", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to download file.",
      });
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
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to download all files.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4 sm:p-0">
      <div className="bg-white dark:bg-gray-800 w-full max-w-4xl mx-auto rounded-lg shadow-2xl overflow-hidden transform transition-all sm:my-8 sm:align-middle">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 text-gray-800 dark:text-gray-100">
            <FontAwesomeIcon icon={faPaperclip} className="text-blue-500 text-lg" />
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

        {/* Transaction Info */}
        <div className="p-2 m-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm grid sm:grid-cols-3">
          <p className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Transaction:</span>
            <span className="text-blue-600 dark:text-blue-400">{DocumentName}</span>
          </p>
          <p className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Branch:</span>
            <span className="italic text-blue-600 dark:text-blue-400">{BranchName}</span>
          </p>
          <p className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Document No:</span>
            <span className="text-blue-600 dark:text-blue-400">{DocumentNo}</span>
          </p>
        </div>

        {/* Attachment Details */}
        <div className="flex-grow p-4 min-h-[250px] overflow-hidden">
          {isFetching ? (
            <div className="flex items-center justify-center h-full text-blue-500">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" className="mr-3" />
              <span className="text-gray-600 dark:text-gray-300">Loading attachments...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-center py-10">
              <p>
                No attachments found. <br />
                Click "Add" to upload documents.
              </p>
            </div>
          ) : (
            <div className="max-h-[300px] mt-0 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full text-sm divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr className="">
                    <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300">File Name</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 hidden sm:table-cell">Modified Date</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 hidden sm:table-cell">Uploaded Date</th>
                    <th className="px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-300 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {files.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-2 flex items-center space-x-2 text-gray-900 dark:text-gray-100 font-medium">
                        <FontAwesomeIcon icon={faFile} className="text-gray-400" />
                        <span>{item.fileName}</span>
                      </td>
                      <td className="px-2 py-2 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {item.modifiedDate ? item.modifiedDate.toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-2 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                        {item.uploadedDate ? item.uploadedDate.toLocaleString() : "-"}
                      </td>
                      <td className="px-2 py-2 space-x-4 flex">
                        <button
                          onClick={() => handleDownload(item.id)}
                          aria-label={`Download ${item.fileName}`}
                          disabled={downloadingId === item.id}
                          className="text-blue-500 hover:text-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          aria-label={`Delete ${item.fileName}`}
                          disabled={deletingId === item.id}
                          className="text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
                        >
                          {deletingId === item.id ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
                          ) : (
                            <FontAwesomeIcon icon={faTrash} />
                          )}
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
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex space-x-2">
            <label
              htmlFor="fileInput"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200 font-medium
                ${isUploading ? 'bg-gray-400 text-gray-800 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <FontAwesomeIcon icon={isUploading ? faSpinner : faPlus} spin={isUploading} />
              <span>{isUploading ? 'Uploading...' : 'Add'}</span>
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              id="fileInput"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <button
              onClick={handleDownloadAll}
              disabled={files.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white transition-colors duration-200 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download All</span>
            </button>
          </div>
          {/* <button
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-300 text-gray-800 font-medium hover:bg-gray-400 transition-colors duration-200"
          >
            <span>Close</span>
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default AttachDocumentModal;