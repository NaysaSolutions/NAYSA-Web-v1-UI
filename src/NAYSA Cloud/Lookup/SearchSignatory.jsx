import { useState, useEffect, useMemo, useRef} from "react";
import { postRequest } from "@/NAYSA Cloud/Configuration/BaseURL";
import { useTopDocSign } from "@/NAYSA Cloud/Global/top1RefTable";

const DocumentSignatories = ({ isOpen, onClose, onCancel, params }) => {
  const { documentID, noReprints, docType } = params;

  const [form, setForm] = useState({
    preparedBy: "NSI",
    checkedBy: "",
    notedBy: "",
    approvedBy: "",
    documentID,
  });

  const canPickMode = useMemo(() => Number(noReprints) === 0, [noReprints]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const cancelRef = useRef(null);


  useEffect(() => {
    if (isOpen) {
      setDropdownOpen(false);
      cancelRef.current?.focus();
    }
  }, [isOpen]);


  useEffect(() => {
    const fetchSignatories = async () => {
      try {
        const response = await useTopDocSign(documentID);
        if (response) {
          setForm((prev) => ({
            ...prev,
            checkedBy: response.checkedBy || "",
            notedBy: response.notedBy || "",
            approvedBy: response.approvedBy || "",
            documentID,
          }));
        }
      } catch (error) {
        console.error("❌ Error fetching signatories:", error);
      }
    };
    fetchSignatories();
  }, [documentID]); // avoid depending on the whole params object

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = async (mode = "Final") => {
    try {
      const payload = { ...form, printMode: mode, docType };
      const response = await postRequest("upsertDocSign", JSON.stringify(payload));
      if (!response.success) {
        console.error("⚠️ Failed to save signatories:", response);
      }
    } catch (error) {
      console.error("❌ Error saving signatories:", error);
    }
  };

  const handlePreviewAndClose = async (mode = "Final") => {
    await handlePreview(mode);
    onClose(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white dark:bg-gray-900 w-[500px] rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Document Signatories</h2>

        <div className="space-y-3">
          {["preparedBy", "checkedBy", "notedBy", "approvedBy"].map((field) => (
            <div className="flex items-center" key={field}>
              <label className="w-28 text-sm font-medium capitalize">
                {field.replace(/By$/, " By")}
              </label>
              <input
                type="text"
                name={field}
                value={form[field]}
                onChange={handleChange}
                disabled={field === "preparedBy"}
                className={`flex-1 border rounded px-2 py-1 ${
                  field === "preparedBy" ? "bg-gray-100" : ""
                }`}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-6 space-x-3 relative">
          {canPickMode ? (
            <div className="relative inline-block text-left">
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center justify-center w-40 h-10 bg-blue-600 text-white rounded hover:bg-blue-700"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
              >
                Print Preview
                <svg className="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 min-w-[10rem] rounded-lg overflow-hidden shadow-lg z-50" role="menu">
                  <button
                    onClick={() => { setDropdownOpen(false); handlePreviewAndClose("Draft"); }}
                    className="block w-40 h-10 bg-blue-400 text-white hover:bg-blue-500"
                    role="menuitem"
                  >
                    Draft
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); handlePreviewAndClose("Final"); }}
                    className="block w-40 h-10 bg-blue-300 text-white hover:bg-blue-400"
                    role="menuitem"
                  >
                    Final
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => handlePreviewAndClose()}
              className="w-40 h-10 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print Preview
            </button>
          )}


          <button
            ref={cancelRef}
            onClick={onCancel}
            className="w-40 h-10 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentSignatories;
