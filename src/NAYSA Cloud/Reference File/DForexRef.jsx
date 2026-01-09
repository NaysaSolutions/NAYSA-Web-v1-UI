import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faSearch,
  faVideo,
  faUndo,
  faFilter,
  faSave,
  faTrash,
  faPlus,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faFileExport,
  faPrint,
} from "@fortawesome/free-solid-svg-icons";
import Swal from "sweetalert2";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Global
import { reftables, reftablesPDFGuide, reftablesVideoGuide } from "@/NAYSA Cloud/Global/reftable";
// Import the currency lookup modal
import CurrLookupModal from "@/NAYSA Cloud/Lookup/SearchCurrRef.jsx";

// Helper to normalize ID key from API rows
const getId = (row) => {
  if (!row) return null;
  // Check all possible ID field names in order of likelihood
  return row.TRAN_ID ?? row.tranId ?? row.id ?? null;
};

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (!(d instanceof Date) || isNaN(d)) return "";
  
  // Force UTC to avoid timezone issues
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const DForexRef = ({ onSelect }) => {
  // Get user from auth context
  const { user } = useAuth();

  // Debug check to see if user is properly set
  console.log("Auth context user object:", user);

  // Document Global Setup
  const docType = "DForexRef";
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // Data
  const [forexData, setForexData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({ 
    fromDate: "", 
    toDate: "", 
    currCode: "", 
    currCode2: "" 
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [selectedForex, setSelectedForex] = useState(null);

  // Currency lookup modal states
  const [isCurrLookupOpen, setIsCurrLookupOpen] = useState(false);
  const [currLookupTarget, setCurrLookupTarget] = useState(""); // "primary" or "secondary"

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [currCode, setCurrCode] = useState("");
  const [currRate, setCurrRate] = useState("");
  const [currCode2, setCurrCode2] = useState("");
  const [currRate2, setCurrRate2] = useState("");
  const [registeredBy, setRegisteredBy] = useState("");
  const [registeredDate, setRegisteredDate] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [updatedDate, setUpdatedDate] = useState("");
  const [tranId, setTranId] = useState(null);

  // Refs
  const guideRef = useRef(null);

  // Table sorting state
  const [sortBy, setSortBy] = useState("fromDate"); // Default sort column
  const [sortDir, setSortDir] = useState("desc");    // Default sort direction

  // Date filters state
  const [dateFilterView, setDateFilterView] = useState(true); // to toggle the date filter view
  const [expandedYear, setExpandedYear] = useState(true); // to track if year is expanded
  const [expandedMonth, setExpandedMonth] = useState(true); // to track if month is expanded
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear()); // default to current year
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // default to current month (1-12)

  // New state variables for custom date filtering
  const [dateFilterFrom, setDateFilterFrom] = useState(null);
  const [dateFilterTo, setDateFilterTo] = useState(null);
  const [filterOperator, setFilterOperator] = useState("equals"); // could be "equals", "before", "after", "between"

  // Initial load
  useEffect(() => {
    fetchForexData();
  }, []);

  // Close Help menu on click-away
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideGuide = guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ctrl+S to save when editing
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveForex();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, isEditing, fromDate, toDate, currCode, currRate, currCode2, currRate2]);

  // Currency lookup handlers
  const handleOpenCurrLookup = (target) => {
    if (!isEditing) return; // Only allow lookup in edit mode
    setCurrLookupTarget(target);
    setIsCurrLookupOpen(true);
  };

  const handleCloseCurrLookup = (selectedCurrency) => {
    setIsCurrLookupOpen(false);
    
    if (selectedCurrency) {
      if (currLookupTarget === "primary") {
        setCurrCode(selectedCurrency.currCode || "");
      } else if (currLookupTarget === "secondary") {
        setCurrCode2(selectedCurrency.currCode || "");
      }
    }
  };

  // Fetch
  const fetchForexData = () => {
    setLoading(true);

    apiClient.get("/dForex")  // Updated to use GET /dForex
      .then(({ data }) => {
        if (data?.success) {
          if (Array.isArray(data.data) && data.data[0]?.result) {
            try {
              const parsed = JSON.parse(data.data[0].result || "[]");
              setForexData(parsed);
              setFiltered(parsed);
            } catch {
              setForexData([]);
              setFiltered([]);
              Swal.fire("Error", "Failed to parse forex data from the server", "error");
            }
            return;
          }
          if (Array.isArray(data.data)) {
            setForexData(data.data);
            setFiltered(data.data);
            return;
          }
        }
        setForexData([]);
        setFiltered([]);
      })
      .catch((err) => {
        console.error("Failed to fetch forex data:", err);
        Swal.fire("Error", "Failed to fetch forex data from the server", "error");
        setForexData([]);
        setFiltered([]);
      })
      .finally(() => setLoading(false));
  };

  // Get specific forex data
  const getForexById = async (id) => {
    try {
      const { data } = await apiClient.post("/getDForex", {
        tranID: id
      });
      
      if (data?.success && data?.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching specific forex data:", error);
      return null;
    }
  };

  // Filtering and Sorting
  useEffect(() => {
    let newFiltered = forexData.filter((item) => {
      const fromDateStr = String(item.FROM_DATE ?? item.fromDate ?? "").toLowerCase();
      const toDateStr = String(item.TO_DATE ?? item.toDate ?? "").toLowerCase();
      const code = String(item.CURR_CODE ?? item.currCode ?? "").toLowerCase();
      const code2 = String(item.CURR_CODE2 ?? item.currCode2 ?? "").toLowerCase();
      
      return fromDateStr.includes((filters.fromDate || "").toLowerCase()) &&
        toDateStr.includes((filters.toDate || "").toLowerCase()) &&
        code.includes((filters.currCode || "").toLowerCase()) &&
        code2.includes((filters.currCode2 || "").toLowerCase());
    });

    // Apply sorting
    if (sortBy) {
      newFiltered = [...newFiltered].sort((a, b) => {
        // Get the property value based on sortBy
        let aVal, bVal;

        if (sortBy === "fromDate") {
          aVal = new Date(a.FROM_DATE ?? a.fromDate ?? "").getTime();
          bVal = new Date(b.FROM_DATE ?? b.fromDate ?? "").getTime();
        } else if (sortBy === "toDate") {
          aVal = new Date(a.TO_DATE ?? a.toDate ?? "").getTime();
          bVal = new Date(b.TO_DATE ?? b.toDate ?? "").getTime();
        } else if (sortBy === "currCode") {
          aVal = (a.CURR_CODE ?? a.currCode ?? "").toLowerCase();
          bVal = (b.CURR_CODE ?? b.currCode ?? "").toLowerCase();
        } else if (sortBy === "currCode2") {
          aVal = (a.CURR_CODE2 ?? a.currCode2 ?? "").toLowerCase();
          bVal = (b.CURR_CODE2 ?? b.currCode2 ?? "").toLowerCase();
        }

        // Compare the values
        if (aVal < bVal) {
          return sortDir === "asc" ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortDir === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    setFiltered(newFiltered);
  }, [filters, forexData, sortBy, sortDir]);

  const handleSelect = (forex) => {
    if (isEditing) return; // Don't select when in edit mode
    setSelectedForex(forex);
    
    // Set form fields with the selected forex data
    setFromDate(forex.FROM_DATE ? new Date(forex.FROM_DATE) : (forex.fromDate ? new Date(forex.fromDate) : null));
    setToDate(forex.TO_DATE ? new Date(forex.TO_DATE) : (forex.toDate ? new Date(forex.toDate) : null));
    setCurrCode(forex.CURR_CODE ?? forex.currCode ?? "");
    setCurrRate(forex.CURR_RATE ?? forex.currRate ?? "");
    setCurrCode2(forex.CURR_CODE2 ?? forex.currCode2 ?? "");
    setCurrRate2(forex.CURR_RATE2 ?? forex.currRate2 ?? "");
    setRegisteredBy(forex.REGISTERED_BY ?? forex.registeredBy ?? "");
    setRegisteredDate(forex.REGISTERED_DATE ?? forex.registeredDate ?? "");
    setUpdatedBy(forex.UPDATED_BY ?? forex.updatedBy ?? "");
    setUpdatedDate(forex.UPDATED_DATE ?? forex.updatedDate ?? "");
    setTranId(getId(forex));

    // Call the onSelect callback if provided
    onSelect && typeof onSelect === "function" && onSelect(forex);
  };

  const handleFilterChange = (e, key) => {
    setFilters({ ...filters, [key]: e.target.value });
  };

  const resetFilters = () => setFilters({ 
    fromDate: "", 
    toDate: "", 
    currCode: "", 
    currCode2: "" 
  });

  // Form helpers
  const startNew = () => {
    resetForm();
    setIsAdding(true);
    setIsEditing(true);
    // Set default values for new entry
    setFromDate(new Date());
    setToDate(new Date());
  };

  const resetForm = () => {
    // Clear form fields completely
    setFromDate(null);
    setToDate(null);
    setCurrCode("");
    setCurrRate("");
    setCurrCode2("");
    setCurrRate2("");
    setRegisteredBy("");
    setRegisteredDate("");
    setUpdatedBy("");
    setUpdatedDate("");
    setTranId(null);
    setIsEditing(false);
    setIsAdding(false);
    
    // Reset selected forex
    setSelectedForex(null);
    
    // Reset filters too when not in editing mode
    if (!isEditing) {
      resetFilters();
    }
  };

  const handleEditRow = (forex) => {
    if (!forex) return;
    setFromDate(forex.FROM_DATE ? new Date(forex.FROM_DATE) : (forex.fromDate ? new Date(forex.fromDate) : null));
    setToDate(forex.TO_DATE ? new Date(forex.TO_DATE) : (forex.toDate ? new Date(forex.toDate) : null));
    setCurrCode(forex.CURR_CODE ?? forex.currCode ?? "");
    setCurrRate(forex.CURR_RATE ?? forex.currRate ?? "");
    setCurrCode2(forex.CURR_CODE2 ?? forex.currCode2 ?? "");
    setCurrRate2(forex.CURR_RATE2 ?? forex.currRate2 ?? "");
    setRegisteredBy(forex.REGISTERED_BY ?? forex.registeredBy ?? "");
    setRegisteredDate(forex.REGISTERED_DATE ?? forex.registeredDate ?? "");
    setUpdatedBy(forex.UPDATED_BY ?? forex.updatedBy ?? "");
    setUpdatedDate(forex.UPDATED_DATE ?? forex.updatedDate ?? "");
    setTranId(getId(forex)); // normalized ID
    setIsEditing(true);
    setIsAdding(false); // Important: we're editing, not adding
    setSelectedForex(forex);
  };

  // Save (ADD/UPDATE)
  const handleSaveForex = async () => {
    if (!fromDate || !toDate || !currCode || !currRate || !currCode2 || !currRate2) {
      Swal.fire({
        title: "Error!",
        text: "Please fill out all required fields: Start Date, End Date, Currency, Currency Rate, Currency 2, and Currency Rate 2.",
        icon: "error",
        confirmButtonText: "Okay",
      });
      return;
    }

    // Extract the userCode from the authentication context
    const userCode = user?.USER_CODE || user?.username || "SYSTEM";
    console.log("Using userCode for save:", userCode);

    setSaving(true);
    try {
      // Structure data according to API requirements
      const requestData = {
        tranID: tranId || "",
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
        currCode: String(currCode).trim(),
        currRate: String(currRate).trim(),
        currCode2: String(currCode2).trim(),
        currRate2: String(currRate2).trim(),
        userCode: userCode
      };

      console.log("Sending save request with data:", requestData);

      const { data } = await apiClient.post("/upsertDForex", requestData);

      if (data?.status === "success" || data?.success) {
        await Swal.fire({
          title: "Success!",
          text: isAdding ? "Forex data added successfully" : "Forex data updated successfully",
          icon: "success",
          confirmButtonText: "Okay",
        });
        fetchForexData();
        resetForm();
      } else {
        Swal.fire("Error", data?.message || "Failed to save forex data", "error");
      }
    } catch (error) {
      console.error("Error saving forex data:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to save forex data";
      Swal.fire("Error", `${errorMessage}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete forex data
  const handleDeleteForex = async () => {
    if (!selectedForex) {
      Swal.fire("Error", "Please select a forex record to delete", "error");
      return;
    }

    // Extract the userCode from the authentication context
    const userCode = user?.USER_CODE || user?.username || "SYSTEM";
    console.log("Using userCode for delete:", userCode);

    const confirm = await Swal.fire({
      title: "Delete this forex record?",
      text: `From: ${formatDate(selectedForex.FROM_DATE ?? selectedForex.fromDate)} To: ${formatDate(selectedForex.TO_DATE ?? selectedForex.toDate)}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete it",
      customClass: { popup: "rounded-xl shadow-2xl" },
    });

    if (!confirm.isConfirmed) return;

    try {
      // For delete, we can use the upsert endpoint with a different action parameter
      const requestData = {
        tranID: getId(selectedForex),
        action: "delete",  // Indicate this is a delete operation
        userCode: userCode
      };

      console.log("Sending delete request with data:", requestData);

      const { data } = await apiClient.post("/upsertDForex", requestData);

      if (data?.success || data?.status === "success") {
        await Swal.fire({
          title: "Deleted",
          text: "The forex record has been deleted.",
          icon: "success",
          customClass: { popup: "rounded-xl shadow-2xl" },
        });
        fetchForexData();
        resetForm();
        setSelectedForex(null); // Clear selection after deletion
      } else {
        Swal.fire("Error", data?.message || "Failed to delete forex record.", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to delete forex record";
      Swal.fire("Error", errorMessage, "error");
    }
  };

  // Print functionality
  const handlePrint = () => {
    window.print();
  };

  // Guides
  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };
  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // Add a helper function to generate the start and end date of a month
  const getMonthDateRange = (year, month) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return {
      start: startDate,
      end: endDate,
      startFormatted: formatDate(startDate),
      endFormatted: formatDate(endDate)
    };
  };

  // Add these functions to allow changing the year and month
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(parseInt(e.target.value));
  };

  return (
    <div className="global-ref-main-div-ui mt-24">
      {/* Currency lookup modal */}
      <CurrLookupModal 
        isOpen={isCurrLookupOpen} 
        onClose={handleCloseCurrLookup} 
      />

      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-end text-xs">
          <button
            onClick={startNew}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            disabled={isEditing}
          >
            <FontAwesomeIcon icon={faPlus} /> Add
          </button>

          <button
            onClick={() => handleEditRow(selectedForex)}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!selectedForex || isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!selectedForex || isEditing}
          >
            <FontAwesomeIcon icon={faEdit} /> Edit
          </button>

          <button
            onClick={handleDeleteForex}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!selectedForex || isEditing ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!selectedForex || isEditing}
          >
            <FontAwesomeIcon icon={faTrashAlt} /> Delete
          </button>

          <button
            onClick={handleSaveForex}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 ${!isEditing || saving ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={!isEditing || saving}
            title="Ctrl+S to Save"
          >
            <FontAwesomeIcon icon={faSave} /> {saving ? "Saving..." : "Save"}
          </button>

          <button
            onClick={resetForm}
            className={`bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700`}
          >
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>

          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>

          {/* Help menu */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide(!isOpenGuide)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Info <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => { handlePDFGuide(); setOpenGuide(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-600" /> User Guide
                </button>
                <button
                  onClick={() => { handleVideoGuide(); setOpenGuide(false); }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-600" /> Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 mb-4 bg-white rounded-lg shadow-md overflow-x-auto">
        <div className="w-full bg-white p-4 sm:p-6 shadow-md rounded-lg">

          {/* Stacked layout with Form Column above Forex Table */}
          <div className="flex flex-col gap-4">
            {/* Form Column */}
            <div className="w-full">
              <div className="border rounded-lg overflow-hidden p-4 bg-gray-50">
                {saving && <div className="text-xs text-blue-600 mb-2">Processing...</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="relative">
                    <div className={`relative ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} border-none`}>
                      <DatePicker
                        selected={fromDate}
                        onChange={(date) => setFromDate(date)}
                        className={`w-full peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                        style={{ borderWidth: '1px' }} /* Ensure only one border */
                        dateFormat="yyyy-MM-dd"
                        disabled={!isEditing}
                        placeholderText=" "
                      />
                    </div>
                    <label
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      Start Date <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>

                  {/* End Date */}
                  <div className="relative">
                    <div className={`relative ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} border-none`}>
                      <DatePicker
                        selected={toDate}
                        onChange={(date) => setToDate(date)}
                        className={`w-full peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}`}
                        style={{ borderWidth: '1px' }} /* Ensure only one border */
                        dateFormat="yyyy-MM-dd"
                        disabled={!isEditing}
                        placeholderText=" "
                      />
                    </div>
                    <label
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      End Date <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>

                  {/* Currency with search button */}
                  <div className="relative">
                    <div className={`relative flex items-center`}>
                      <input
                        type="text"
                        id="CURR_CODE"
                        placeholder=" "
                        className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} pr-9 w-full`}
                        style={{ borderWidth: '1px' }}
                        value={currCode}
                        onChange={(e) => setCurrCode(e.target.value.toUpperCase())}
                        disabled={!isEditing}
                        maxLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenCurrLookup("primary")}
                        disabled={!isEditing}
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Search Currency"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                    </div>
                    <label
                      htmlFor="CURR_CODE"
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      Currency <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>

                  {/* Currency Rate */}
                  <div className="relative">
                    <input
                      type="text"
                      id="CURR_RATE"
                      placeholder=" "
                      className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} w-full`}
                      style={{ borderWidth: '1px' }} /* Ensure only one border */
                      value={currRate}
                      onChange={(e) => setCurrRate(e.target.value)}
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="CURR_RATE"
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      Currency Rate <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>

                  {/* Currency 2 with search button */}
                  <div className="relative">
                    <div className={`relative flex items-center`}>
                      <input
                        type="text"
                        id="CURR_CODE2"
                        placeholder=" "
                        className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} pr-9 w-full`}
                        style={{ borderWidth: '1px' }}
                        value={currCode2}
                        onChange={(e) => setCurrCode2(e.target.value.toUpperCase())}
                        disabled={!isEditing}
                        maxLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => handleOpenCurrLookup("secondary")}
                        disabled={!isEditing}
                        className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 hover:text-blue-800 ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Search Currency"
                      >
                        <FontAwesomeIcon icon={faSearch} />
                      </button>
                    </div>
                    <label
                      htmlFor="CURR_CODE2"
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      Currency 2 <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>

                  {/* Currency Rate 2 */}
                  <div className="relative">
                    <input
                      type="text"
                      id="CURR_RATE2"
                      placeholder=" "
                      className={`peer global-ref-textbox-ui ${isEditing ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"} w-full`}
                      style={{ borderWidth: '1px' }} /* Ensure only one border */
                      value={currRate2}
                      onChange={(e) => setCurrRate2(e.target.value)}
                      disabled={!isEditing}
                    />
                    <label
                      htmlFor="CURR_RATE2"
                      className={`global-ref-floating-label ${!isEditing ? "global-ref-label-disabled" : "global-ref-label-enabled"}`}
                    >
                      Currency Rate 2 <span className="global-ref-asterisk-ui">*</span>
                    </label>
                  </div>
                </div>

                {/* Audit information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-gray-500">
                  <div>
                    <div className="flex">
                      <span className="font-semibold w-32">Registered By:</span>
                      <span>{registeredBy || "-"}</span>
                    </div>
                    <div className="flex mt-1">
                      <span className="font-semibold w-32">Registered Date:</span>
                      <span>{registeredDate ? new Date(registeredDate).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex">
                      <span className="font-semibold w-32">Last Updated By:</span>
                      <span>{updatedBy || "-"}</span>
                    </div>
                    <div className="flex mt-1">
                      <span className="font-semibold w-32">Last Updated Date:</span>
                      <span>{updatedDate ? new Date(updatedDate).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-Column Layout for Date Filter and Forex Table */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Date Filter Panel */}
              <div className="w-full md:w-1/4 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="border-b p-3 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-medium text-gray-700">Date Filters</h3>
                  <button 
                    onClick={() => setDateFilterView(!dateFilterView)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {dateFilterView ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {dateFilterView && (
                  <div className="p-2">
                    <table className="w-full border-collapse global-ref-table-div-ui">
                      <thead className="global-ref-thead-div-ui">
                        <tr>
                          <th className="global-ref-th-ui">Date From</th>
                          <th className="global-ref-th-ui">Date To</th>
                        </tr>
                        <tr>
                          <th className="global-ref-th-ui">
                            <div className="flex items-center">
                              <span className="text-sm">Equals:</span>
                              <button className="ml-auto text-xs text-gray-500">▼</button>
                            </div>
                          </th>
                          <th className="global-ref-th-ui">
                            <div className="flex items-center">
                              <span className="text-sm">Equals:</span>
                              <button className="ml-auto text-xs text-gray-500">▼</button>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="global-ref-td-ui p-1">
                            <DatePicker
                              selected={dateFilterFrom}
                              onChange={(date) => {
                                setDateFilterFrom(date);
                                // Apply filter immediately
                                if (date) {
                                  setFilters({
                                    ...filters,
                                    fromDate: formatDate(date)
                                  });
                                }
                              }}
                              className="w-full border rounded p-1 text-sm"
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select date"
                            />
                          </td>
                          <td className="global-ref-td-ui p-1">
                            <DatePicker
                              selected={dateFilterTo}
                              onChange={(date) => {
                                setDateFilterTo(date);
                                // Apply filter immediately
                                if (date) {
                                  setFilters({
                                    ...filters,
                                    toDate: formatDate(date)
                                  });
                                }
                              }}
                              className="w-full border rounded p-1 text-sm"
                              dateFormat="yyyy-MM-dd"
                              placeholderText="Select date"
                            />
                          </td>
                        </tr>

                        {/* Date Hierarchy Navigation */}
                        <tr>
                          <td colSpan="2" className="p-0">
                            <div className="pl-2 py-1 flex items-center cursor-pointer border-b border-gray-200" 
                                 onClick={() => setExpandedYear(!expandedYear)}>
                              <span className="mr-2 text-xs text-blue-600">{expandedYear ? '▾' : '▸'}</span>
                              <span className="font-medium text-sm">Year: {selectedYear}</span>
                              <select 
                                value={selectedYear} 
                                onChange={handleYearChange}
                                className="ml-auto border rounded px-2 py-1 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[2023, 2024, 2025, 2026].map(year => (
                                  <option key={year} value={year}>{year}</option>
                                ))}
                              </select>
                            </div>
                            
                            {expandedYear && (
                              <div className="ml-4">
                                <div className="pl-2 py-1 flex items-center cursor-pointer border-b border-gray-200" 
                                     onClick={() => setExpandedMonth(!expandedMonth)}>
                                  <span className="mr-2 text-xs text-blue-600">{expandedMonth ? '▾' : '▸'}</span>
                                  <span className="font-medium text-sm">Month: {String(selectedMonth).padStart(2, '0')}</span>
                                  <select 
                                    value={selectedMonth} 
                                    onChange={handleMonthChange}
                                    className="ml-auto border rounded px-2 py-1 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                                      <option key={month} value={month}>
                                        {String(month).padStart(2, '0')}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                {expandedMonth && (
                                  <table className="w-full text-sm border-collapse">
                                    <tbody>
                                      {/* Month date range selection */}
                                      <tr 
                                        className="hover:bg-blue-50 cursor-pointer global-tran-tr-ui" 
                                        onClick={() => {
                                          const range = getMonthDateRange(selectedYear, selectedMonth);
                                          
                                          // Update filter date pickers
                                          setDateFilterFrom(range.start);
                                          setDateFilterTo(range.end);
                                          
                                          // Apply as filter
                                          setFilters({
                                            ...filters,
                                            fromDate: range.startFormatted,
                                            toDate: range.endFormatted
                                          });
                                          
                                          // If editing, also update the form
                                          if (isEditing) {
                                            setFromDate(range.start);
                                            setToDate(range.end);
                                          }
                                        }}
                                      >
                                        <td className="global-ref-td-ui">{getMonthDateRange(selectedYear, selectedMonth).startFormatted}</td>
                                        <td className="global-ref-td-ui">{getMonthDateRange(selectedYear, selectedMonth).endFormatted}</td>
                                      </tr>
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    
                    {/* Apply and Clear Filters button row */}
                    <div className="flex justify-between mt-2 px-2">
                      <button 
                        onClick={() => {
                          // Apply date filters with both dates
                          if (dateFilterFrom && dateFilterTo) {
                            setFilters({
                              ...filters,
                              fromDate: formatDate(dateFilterFrom),
                              toDate: formatDate(dateFilterTo)
                            });
                          }
                        }}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Apply
                      </button>
                      <button 
                        onClick={() => {
                          // Clear date filters
                          setDateFilterFrom(null);
                          setDateFilterTo(null);
                          setFilters({
                            ...filters,
                            fromDate: "",
                            toDate: ""
                          });
                        }}
                        className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Main Forex Table */}
              <div className="w-full md:flex-1">
                <div className="global-ref-table-main-div-ui">
                  <div className="global-ref-table-main-sub-div-ui">
                    <div className="global-ref-table-div-ui">
                      <table className="global-ref-table-div-ui">
                        <thead className="global-ref-thead-div-ui">
                          <tr>
                            <th className="global-ref-th-ui cursor-pointer select-none"
                              onClick={() => {
                                setSortBy("fromDate");
                                setSortDir(prev => prev === "asc" ? "desc" : "asc");
                              }}>
                              Start Date {sortBy === "fromDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="global-ref-th-ui cursor-pointer select-none"
                              onClick={() => {
                                setSortBy("toDate");
                                setSortDir(prev => prev === "asc" ? "desc" : "asc");
                              }}>
                              End Date {sortBy === "toDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="global-ref-th-ui cursor-pointer select-none"
                              onClick={() => {
                                setSortBy("currCode");
                                setSortDir(prev => prev === "asc" ? "desc" : "asc");
                              }}>
                              Cur. Code {sortBy === "currCode" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="global-ref-th-ui">From Currency</th>
                            <th className="global-ref-th-ui cursor-pointer select-none"
                              onClick={() => {
                                setSortBy("currCode2");
                                setSortDir(prev => prev === "asc" ? "desc" : "asc");
                              }}>
                              Cur. Code2 {sortBy === "currCode2" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                            </th>
                            <th className="global-ref-th-ui">To Currency</th>
                            <th className="global-ref-th-ui">Cur. Rate2</th>
                          </tr>

                          {/* Filter row - also remove the Cur. Rate column */}
                          <tr>
                            <th className="global-ref-th-ui">
                              <input
                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                placeholder="Filter…"
                                value={filters.fromDate}
                                onChange={(e) => handleFilterChange(e, "fromDate")}
                              />
                            </th>
                            <th className="global-ref-th-ui">
                              <input
                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                placeholder="Filter…"
                                value={filters.toDate}
                                onChange={(e) => handleFilterChange(e, "toDate")}
                              />
                            </th>
                            <th className="global-ref-th-ui">
                              <input
                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                placeholder="Filter…"
                                value={filters.currCode}
                                onChange={(e) => handleFilterChange(e, "currCode")}
                              />
                            </th>
                            <th className="global-ref-th-ui"></th>
                            <th className="global-ref-th-ui">
                              <input
                                className="w-full global-ref-filterbox-ui global-ref-filterbox-enabled"
                                placeholder="Filter…"
                                value={filters.currCode2}
                                onChange={(e) => handleFilterChange(e, "currCode2")}
                              />
                            </th>
                            <th className="global-ref-th-ui"></th>
                            <th className="global-ref-th-ui"></th>
                          </tr>
                        </thead>

                        <tbody>
                          {filtered.length > 0 ? (
                            filtered.map((forex, index) => (
                              <tr
                                key={getId(forex) ?? index}
                                className={`global-tran-tr-ui ${getId(selectedForex) === getId(forex) ? 'bg-blue-50' : ''}`}
                                onClick={() => handleSelect(forex)}
                                onDoubleClick={() => {
                                  if (!isEditing) handleEditRow(forex);
                                }}
                              >
                                <td className="global-ref-td-ui">{formatDate(forex.FROM_DATE ?? forex.fromDate)}</td>
                                <td className="global-ref-td-ui">{formatDate(forex.TO_DATE ?? forex.toDate)}</td>
                                <td className="global-ref-td-ui">{forex.CURR_CODE ?? forex.currCode ?? ""}</td>
                                <td className="global-ref-td-ui">From Currency</td>
                                <td className="global-ref-td-ui">{forex.CURR_CODE2 ?? forex.currCode2 ?? ""}</td>
                                <td className="global-ref-td-ui">To Currency</td>
                                <td className="global-ref-td-ui">{forex.CURR_RATE2 ?? forex.currRate2 ?? "-"}</td>
                              </tr>
                            ))
                           ) : (
                            <tr>
                              <td colSpan="7" className="global-ref-norecords-ui">
                                {loading ? (
                                  <span className="inline-flex items-center gap-2">
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    Loading…
                                  </span>
                                ) : (
                                  "No forex data found"
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Pagination */}
                      <div className="flex items-center justify-between p-3">
                        <div className="text-xs opacity-80 font-semibold">
                          Total Records: {filtered.length}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            className="px-7 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                            value={10}
                            onChange={(e) => {
                              // Add pagination logic here if needed
                            }}
                          >
                            {[10, 20, 50, 100].map((n) => (
                              <option key={n} value={n}>
                                {n}/page
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center mt-4 rounded-b-lg">
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{filtered.length}</span> of <span className="font-medium">{forexData.length}</span> forex records
          </div>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Fix for input borders */
        .global-ref-textbox-ui:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
          border-color: #3b82f6;
        }
        
        /* Remove duplicate borders */
        .border-none {
          border: none !important;
          box-shadow: none !important;
        }
        
        /* Ensure DatePicker has consistent styling */
        .react-datepicker-wrapper {
          width: 100%;
        }
        
        .react-datepicker__input-container {
          width: 100%;
        }
      `}</style>
    </div>
  );
};

export default DForexRef;