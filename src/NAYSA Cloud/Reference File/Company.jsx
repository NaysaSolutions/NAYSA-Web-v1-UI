import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

// Import Lookup Modals
import BranchLookupModal from "@/NAYSA Cloud/Lookup/SearchBranchRef";
import SearchCutoffRef from "@/NAYSA Cloud/Lookup/SearchCutoffRef";
import SearchCurrRef from "@/NAYSA Cloud/Lookup/SearchCurrRef";
import SearchBankMast from "@/NAYSA Cloud/Lookup/SearchBankMast";
import SearchRCMast from "@/NAYSA Cloud/Lookup/SearchRCMast";
import SearchEmailNotification from "@/NAYSA Cloud/Lookup/SearchEmailNotification";

// FontAwesome Icons
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faPrint,
  faChevronDown,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faSave,
  faUndo,
  faMagnifyingGlass,
  faInfoCircle,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";

// Global components and utilities
import {
  reftables,
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

// Alert utilities
import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalshowSaveSuccessDialog,
} from "@/NAYSA Cloud/Global/behavior";

// ⬇️ New global UI helpers
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";

const Company = () => {
  const docType = "Company";
  const { user } = useAuth();
  const documentTitle = reftables[docType];
  const pdfLink = reftablesPDFGuide[docType];
  const videoLink = reftablesVideoGuide[docType];

  // ── Form state ───────────────────────────────────────────────────────────────
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compNameTax, setCompNameTax] = useState("");
  const [compEmail, setCompEmail] = useState("");

  const [cutoffCode, setCutoffCode] = useState("");
  const [cutoffName, setCutoffName] = useState("");

  const [branchCode, setBranchCode] = useState("");
  const [branchName, setBranchName] = useState("");

  const [classification, setClassification] = useState("");

  // Currency: keep code for saving, name for display
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");

  // Banks: code for saving, name for display
  const [disbursementBankCode, setDisbursementBankCode] = useState("");
  const [disbursementBankName, setDisbursementBankName] = useState("");

  const [depositBankCode, setDepositBankCode] = useState("");
  const [depositBankName, setDepositBankName] = useState("");

  const [staleCheckDueDays, setStaleCheckDueDays] = useState("");

  // RC: code for saving, name for display
  const [globalRespCenter, setGlobalRespCenter] = useState("");
  const [globalRespCenterName, setGlobalRespCenterName] = useState("");

  const [salesRespCenter, setSalesRespCenter] = useState("");
  const [salesRespCenterName, setSalesRespCenterName] = useState("");

  const [birAcNo, setBirAcNo] = useState("");
  const [birAcDateIssued, setBirAcDateIssued] = useState(""); // yyyy-mm-dd

  const [rdoCode, setRdoCode] = useState("");

  // Email Notification Modal fields (retained but NOT saved)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailNotifier, setEmailNotifier] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSSL, setSmtpSSL] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [notificationReceiver, setNotificationReceiver] = useState("");
  const [hostAddress, setHostAddress] = useState("");
  const [hostShared, setHostShared] = useState("");
  const [localDestination, setLocalDestination] = useState("");

  // ── Modal States ─────────────────────────────────────────────────────────────
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [cutoffModalOpen, setCutoffModalOpen] = useState(false);
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [disbursementBankModalOpen, setDisbursementBankModalOpen] =
    useState(false);
  const [depositBankModalOpen, setDepositBankModalOpen] = useState(false);
  const [rcModalOpen, setRCModalOpen] = useState(false);
  const [rcTypeToSet, setRcTypeToSet] = useState(null); // "global" | "sales"

  // UX state
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [isOpenExport, setOpenExport] = useState(false);
  const [isOpenGuide, setOpenGuide] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [companyData, setCompanyData] = useState(null);

  // Refs for click-away
  const exportRef = useRef(null);
  const guideRef = useRef(null);

  // ── Lookup Handlers ──────────────────────────────────────────────────────────
  const handleCloseBranchModal = (selectedBranch = null) => {
    setBranchModalOpen(false);
    if (selectedBranch) {
      setBranchCode(selectedBranch.branchCode || "");
      setBranchName(selectedBranch.branchName || "");
    }
  };

  const handleCloseCutoffModal = (selectedCutoff = null) => {
    setCutoffModalOpen(false);
    if (selectedCutoff) {
      setCutoffCode(selectedCutoff.cutoffCode || "");
      setCutoffName(
        selectedCutoff.cutoffName || selectedCutoff.cutoffDesc || ""
      );
    }
  };

  const handleCloseCurrencyModal = (selectedCurrency = null) => {
    setCurrencyModalOpen(false);
    if (selectedCurrency) {
      setCurrencyCode(
        selectedCurrency.currencyCode || selectedCurrency.currCode || ""
      );
      setCurrencyName(
        selectedCurrency.currencyName || selectedCurrency.currName || ""
      );
    }
  };

  const handleCloseDisbursementBankModal = (selectedBank = null) => {
    setDisbursementBankModalOpen(false);
    if (selectedBank) {
      const code =
        selectedBank.bankCode ||
        selectedBank.bank_code ||
        selectedBank.code ||
        "";
      const name =
        selectedBank.bankName ||
        selectedBank.bank_name ||
        selectedBank.name ||
        "";
      setDisbursementBankCode(code);
      setDisbursementBankName(name);
    }
  };

  const handleCloseDepositBankModal = (selectedBank = null) => {
    setDepositBankModalOpen(false);
    if (selectedBank) {
      const code =
        selectedBank.bankCode ||
        selectedBank.bank_code ||
        selectedBank.code ||
        "";
      const name =
        selectedBank.bankName ||
        selectedBank.bank_name ||
        selectedBank.name ||
        "";
      setDepositBankCode(code);
      setDepositBankName(name);
    }
  };

  const handleCloseRCModal = (selectedRC = null) => {
    setRCModalOpen(false);
    if (selectedRC && rcTypeToSet) {
      const rcCode = selectedRC.rcCode || selectedRC.rc_code || "";
      const rcName = selectedRC.rcName || selectedRC.rc_name || "";
      if (rcTypeToSet === "global") {
        setGlobalRespCenter(rcCode);
        setGlobalRespCenterName(rcName);
      } else if (rcTypeToSet === "sales") {
        setSalesRespCenter(rcCode);
        setSalesRespCenterName(rcName);
      }
    }
    setRcTypeToSet(null);
  };

  const handleCloseEmailModal = (config = null) => {
    setEmailModalOpen(false);
    if (config) {
      setEmailNotifier(config.emailNotifier || "");
      setSmtpHost(config.smtpHost || "");
      setSmtpPort(config.smtpPort || "");
      setSmtpPassword(config.smtpPassword || "");
      setSmtpSSL(!!config.smtpSSL);
      setProfileName(config.profileName || "");
      setNotificationReceiver(config.notificationReceiver || "");
      setHostAddress(config.hostAddress || "");
      setHostShared(config.hostShared || "");
      setLocalDestination(config.localDestination || "");
    }
  };

  // ── Loading overlay ──────────────────────────────────────────────────────────
  const LoadingSpinner = () =>
    showSpinner ? (
      <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl px-6 py-4 shadow-xl">
          {saving ? "Saving…" : "Loading…"}
        </div>
      </div>
    ) : null;

  // ── API: fetch company ───────────────────────────────────────────────────────
  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/getCompany", {
        params: { mode: "get" },
      });
      let companyInfo = null;

      if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
        if (data.data[0]?.result) {
          try {
            const parsed = JSON.parse(data.data[0].result);
            if (Array.isArray(parsed) && parsed.length > 0)
              companyInfo = parsed[0];
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      } else if (data?.result) {
        try {
          const parsed = JSON.parse(data.result);
          if (Array.isArray(parsed) && parsed.length > 0)
            companyInfo = parsed[0];
        } catch (e) {
          console.error("Parse error:", e);
        }
      }

      if (companyInfo) {
        setCompanyData(companyInfo);
        populateForm(companyInfo);
      } else {
        setCompanyData(null);
        setIsEditing(true);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      await useSwalErrorAlert(
        "Error",
        `Failed to load company data: ${error?.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data) => {
    // basic
    setCompCode(data.compCode || "");
    setCompName(data.compName || "");
    setCompNameTax(data.compNameTax || ""); // not returned yet, stays blank
    setCompEmail(data.compEmail || "");

    // cutoff
    setCutoffCode(data.cutoffCode || "");
    setCutoffName(data.cutoffName || data.cutoffDesc || "");

    // RDO Code (from TCON_RDOCODE)
    setRdoCode(data.rdoCode || "");

    // branch – sproc doesn't currently return branchCode / branchName,
    // so these will stay blank unless you extend the sproc.
    setBranchCode(data.branchCode || "");
    setBranchName(data.branchName || "");

    // setClassification(data.classification || "");

    // // 🔹 CURRENCY: use currCode / currName from sproc
    setCurrencyCode(data.currCode || "");
    setCurrencyName(data.currName || "");

    // // 🔹 BANKS: use disbBankcode / depBankcode from sproc
    setDisbursementBankCode(data.disbBankcode || "");
    setDisbursementBankName(
      data.disbursementBankName || data.disbursementBankDesc || ""
    ); // this will be empty until you join bank master in the sproc
    setDepositBankCode(data.depBankcode || "");
    setDepositBankName(
      data.depositBankName || data.depositBankDesc || ""
    ); // same note as above

    // // stale check / RC / BIR – not returned by current sproc, so they stay blank
    // setStaleCheckDueDays(data.staleCheckDueDays || "");

    // setGlobalRespCenter(data.globalRespCenter || "");
    // setGlobalRespCenterName(
    //   data.globalRespCenterName || data.globalRespCenterDesc || ""
    // );

    // setSalesRespCenter(data.salesRespCenter || "");
    // setSalesRespCenterName(
    //   data.salesRespCenterName || data.salesRespCenterDesc || ""
    // );

    setBirAcNo(data.birAcNo || "");
    setBirAcDateIssued(data.birAcDateIssued || "");

    // Email notifier block – still just UI for now
    // setEmailNotifier(data.emailNotifier || "");
    // setSmtpHost(data.smtpHost || "");
    // setSmtpPort(data.smtpPort || "");
    // setSmtpPassword(data.smtpPassword || "");
    // setSmtpSSL(Boolean(data.smtpSSL));
    // setProfileName(data.profileName || "");
    // setNotificationReceiver(data.notificationReceiver || "");
    // setHostAddress(data.hostAddress || "");
    // setHostShared(data.hostShared || "");
    // setLocalDestination(data.localDestination || "");
  };


  // ── close menus on outside click ─────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideExport =
        exportRef.current && !exportRef.current.contains(event.target);
      const clickedOutsideGuide =
        guideRef.current && !guideRef.current.contains(event.target);
      if (clickedOutsideExport) setOpenExport(false);
      if (clickedOutsideGuide) setOpenGuide(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Global Ctrl+S ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && isEditing) handleSaveCompany();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── spinner timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (loading || saving) timer = setTimeout(() => setShowSpinner(true), 200);
    else setShowSpinner(false);
    return () => clearTimeout(timer);
  }, [loading, saving]);

  // ── initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCompanyData();
  }, []);

  // ── reset form ───────────────────────────────────────────────────────────────
  const resetForm = () => {
    setCompCode("");
    setCompName("");
    setCompNameTax("");
    setCompEmail("");

    setCutoffCode("");
    setCutoffName("");

    setBranchCode("");
    setBranchName("");

    setClassification("");
    setRdoCode("");

    setCurrencyCode("");
    setCurrencyName("");

    setDisbursementBankCode("");
    setDisbursementBankName("");

    setDepositBankCode("");
    setDepositBankName("");

    setStaleCheckDueDays("");

    setGlobalRespCenter("");
    setGlobalRespCenterName("");

    setSalesRespCenter("");
    setSalesRespCenterName("");

    setBirAcNo("");
    setBirAcDateIssued("");

    setEmailNotifier("");
    setSmtpHost("");
    setSmtpPort("");
    setSmtpPassword("");
    setSmtpSSL(false);
    setProfileName("");
    setNotificationReceiver("");
    setHostAddress("");
    setHostShared("");
    setLocalDestination("");
    setIsEditing(false);

    if (companyData) populateForm(companyData);
  };

  // ── save company ─────────────────────────────────────────────────────────────
  const handleSaveCompany = async () => {
    setSaving(true);

    if (!compCode || !compName) {
      await useSwalErrorAlert(
        "Error!",
        "Please fill out Company Code and Company Name."
      );
      setSaving(false);
      return;
    }

    try {
      // 👇 This must match your successful Postman body
      const payload = {
        json_data: JSON.stringify({
          json_data: {
            compCode: compCode.trim(),
            compName: compName.trim(),
            compAddr1: "",
            compAddr2: "",
            compAddr3: "",
            compTin: "",
            telNo: "",
            faxNo: "",
            cutoffCode: cutoffCode.trim(),
            compEmail: compEmail.trim(),
            branchCode: branchCode.trim(),
            depBankcode: depositBankCode.trim(),
            disbBankcode: disbursementBankCode.trim(),

            compNameTax: compNameTax.trim(), // 🔹 TCON_COMPNAME
            rdoCode: rdoCode.trim(),         // 🔹 TCON_RDOCODE
          },
        }),
      };


      // Same route that worked in Postman
      const response = await apiClient.post("/upsertCompany", payload);
      const res = response.data;

      if (res?.success === true || res?.status === "success") {
        await fetchCompanyData();
        await useSwalSuccessAlert(
          "Success!",
          "Company information saved successfully."
        );
        setIsEditing(false);
      } else {
        const errorMsg =
          res?.message || res?.details || "Failed to save company information.";
        await useSwalErrorAlert("Error!", errorMsg);
      }
    } catch (e) {
      console.error("Save error:", e);
      await useSwalErrorAlert(
        "Error!",
        e?.response?.data?.message ||
        e.message ||
        "Error saving company information."
      );
    } finally {
      setSaving(false);
    }
  };



  const startEdit = () => setIsEditing(true);

  const handleExport = (format) => {
    setOpenExport(false);
    console.log(`Exporting to ${format}`);
  };

  const handlePDFGuide = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
    setOpenGuide(false);
  };

  const handleVideoGuide = () => {
    if (videoLink) window.open(videoLink, "_blank");
    setOpenGuide(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="global-ref-main-div-ui mt-24">
      {(loading || saving) && <LoadingSpinner />}

      {/* Lookup Modals */}
      {branchModalOpen && (
        <BranchLookupModal
          isOpen={branchModalOpen}
          onClose={handleCloseBranchModal}
        />
      )}
      {cutoffModalOpen && (
        <SearchCutoffRef
          isOpen={cutoffModalOpen}
          onClose={handleCloseCutoffModal}
        />
      )}
      {currencyModalOpen && (
        <SearchCurrRef
          isOpen={currencyModalOpen}
          onClose={handleCloseCurrencyModal}
        />
      )}
      {disbursementBankModalOpen && (
        <SearchBankMast
          isOpen={disbursementBankModalOpen}
          onClose={handleCloseDisbursementBankModal}
        />
      )}
      {depositBankModalOpen && (
        <SearchBankMast
          isOpen={depositBankModalOpen}
          onClose={handleCloseDepositBankModal}
        />
      )}

      {rcModalOpen && (
        <SearchRCMast isOpen={rcModalOpen} onClose={handleCloseRCModal} />
      )}

      {/* Email Notification Modal (UI only, not saved yet) */}
      {emailModalOpen && (
        <SearchEmailNotification
          isOpen={emailModalOpen}
          onClose={handleCloseEmailModal}
          initialValues={{
            emailNotifier,
            smtpHost,
            smtpPort,
            smtpPassword,
            smtpSSL,
            profileName,
            notificationReceiver,
            hostAddress,
            hostShared,
            localDestination,
          }}
        />
      )}

      {/* Header */}
      <div className="fixed mt-4 top-14 left-6 right-6 z-30 global-ref-header-ui flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <h1 className="global-ref-headertext-ui">{documentTitle}</h1>
        </div>

        <div className="flex gap-2 justify-center text-xs">
          {/* Main buttons via global ButtonBar */}
          <ButtonBar
            buttons={[
              {
                key: "edit",
                label: "Edit",
                icon: faEdit,
                onClick: startEdit,
                disabled: isEditing,
              },
              {
                key: "save",
                label: "Save",
                icon: faSave,
                onClick: handleSaveCompany,
                disabled: !isEditing || saving,
                className:
                  "bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 " +
                  (!isEditing || saving
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"),
              },
              {
                key: "reset",
                label: "Reset",
                icon: faUndo,
                onClick: resetForm,
                disabled: saving,
              },
            ]}
          />

          {/* Export dropdown (unchanged behavior) */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setOpenExport((v) => !v)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
            >
              <FontAwesomeIcon icon={faPrint} /> Export{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenExport && (
              <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => {
                    handleExport("csv");
                    setOpenExport(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faFileCsv}
                    className="mr-2 text-green-600"
                  />{" "}
                  CSV
                </button>
                <button
                  onClick={() => {
                    handleExport("excel");
                    setOpenExport(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faFileExcel}
                    className="mr-2 text-green-600"
                  />{" "}
                  Excel
                </button>
                <button
                  onClick={() => {
                    handleExport("pdf");
                    setOpenExport(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="mr-2 text-red-600"
                  />{" "}
                  PDF
                </button>
              </div>
            )}
          </div>

          {/* Info dropdown (unchanged behavior) */}
          <div ref={guideRef} className="relative">
            <button
              onClick={() => setOpenGuide((v) => !v)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faInfoCircle} /> Info{" "}
              <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
            </button>
            {isOpenGuide && (
              <div className="absolute right-0 mt-1 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800">
                <button
                  onClick={() => {
                    handlePDFGuide();
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faFilePdf}
                    className="mr-2 text-red-600"
                  />{" "}
                  User Guide
                </button>
                <button
                  onClick={() => {
                    handleVideoGuide();
                    setOpenGuide(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-900"
                >
                  <FontAwesomeIcon
                    icon={faVideo}
                    className="mr-2 text-blue-600"
                  />{" "}
                  Video Guide
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Layout */}
<div className="global-tran-tab-div-ui">
  {/* Section header */}
  <div className="text-[13px] font-semibold text-gray-700 bg-[#eaf2ff] border border-blue-200 rounded-md px-3 py-2 mb-3">
    Basic Information
  </div>

  {/* Two columns */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* LEFT COLUMN */}
    <div className="space-y-2">
      {/* Company Code */}
      <FieldRenderer
        label="Company Code"
        required={true}
        type="text"
        value={compCode}
        disabled={!isEditing || (companyData && companyData.compCode)}
        onChange={(val) => setCompCode(val)}
      />

      {/* Company Name */}
      <FieldRenderer
        label="Company Name"
        required={true}
        type="text"
        value={compName}
        disabled={!isEditing || (companyData && companyData.compCode)}
        onChange={(val) => setCompName(val)}
      />

      {/* Company Name (Tax Connect) */}
      <FieldRenderer
        label="Company Name (Tax Connect)"
        type="text"
        value={compNameTax}
        disabled={!isEditing}
        onChange={(val) => setCompNameTax(val)}
      />

      {/* Classification + RDO Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FieldRenderer
          label="Classification"
          labelWidth="w-40"
          type="select"
          value={classification}
          disabled={!isEditing}
          onChange={(val) => setClassification(val)}
          options={[
            { value: "VAT REG", label: "VAT REG" },
            { value: "NON-VAT", label: "NON-VAT" },
          ]}
        />

        <FieldRenderer
          label="RDO Code"
          labelWidth="w-40"
          type="text"
          value={rdoCode}
          disabled={!isEditing}
          onChange={(val) => setRdoCode(val)}
        />
      </div>
{/* Company Email */}
      <FieldRenderer
        label="Company Email"
        type="text"
        value={compEmail}
        disabled={!isEditing}
        onChange={(val) => setCompEmail(val)}
      />
      {/* Branch */}
      <FieldRenderer
        label="Branch"
        type="lookup"
        value={branchName || branchCode || ""}
        disabled={!isEditing}
        onLookup={() => setBranchModalOpen(true)}
      />

      {/* Cut-Off */}
      <FieldRenderer
        label="Cut-Off"
        type="lookup"
        value={cutoffCode ? `(${cutoffCode}) - ${cutoffName || ""}` : ""}
        disabled={!isEditing}
        onLookup={() => setCutoffModalOpen(true)}
      />
    </div>

    {/* RIGHT COLUMN */}
    <div className="space-y-2">
      {/* Currency */}
      <FieldRenderer
        label="Currency"
        labelWidth="w-56"
        type="lookup"
        value={
          currencyCode ? `(${currencyCode}) - ${currencyName || ""}` : ""
        }
        disabled={!isEditing}
        onLookup={() => setCurrencyModalOpen(true)}
      />

      {/* Disbursement Bank */}
      <FieldRenderer
        label="Disbursement Bank"
        labelWidth="w-56"
        type="lookup"
        value={
          disbursementBankCode
            ? `(${disbursementBankCode}) - ${disbursementBankName || ""}`
            : ""
        }
        disabled={!isEditing}
        onLookup={() => setDisbursementBankModalOpen(true)}
      />

      {/* Deposit Bank */}
      <FieldRenderer
        label="Deposit Bank"
        labelWidth="w-56"
        type="lookup"
        value={
          depositBankCode
            ? `(${depositBankCode}) - ${depositBankName || ""}`
            : ""
        }
        disabled={!isEditing}
        onLookup={() => setDepositBankModalOpen(true)}
      />

      {/* Stale Check Due Days */}
      <FieldRenderer
        label="Stale Check Due Days"
        labelWidth="w-56"
        type="number"
        value={staleCheckDueDays}
        disabled={!isEditing}
        onChange={(val) => setStaleCheckDueDays(val)}
      />

      {/* Global Responsibility Center */}
      <FieldRenderer
        label="Global Responsibility Center"
        labelWidth="w-56"
        type="lookup"
        value={
          globalRespCenter
            ? `(${globalRespCenter}) - ${globalRespCenterName || ""}`
            : ""
        }
        disabled={!isEditing}
        onLookup={() => {
          setRcTypeToSet("global");
          setRCModalOpen(true);
        }}
      />

      {/* Sales Responsibility Center */}
      <FieldRenderer
        label="Sales Responsibility Center"
        labelWidth="w-56"
        type="lookup"
        value={
          salesRespCenter
            ? `(${salesRespCenter}) - ${salesRespCenterName || ""}`
            : ""
        }
        disabled={!isEditing}
        onLookup={() => {
          setRcTypeToSet("sales");
          setRCModalOpen(true);
        }}
      />

      {/* BIR AC No. */}
      <FieldRenderer
        label="BIR AC No."
        labelWidth="w-56"
        type="text"
        value={birAcNo}
        disabled={!isEditing}
        onChange={(val) => setBirAcNo(val)}
      />

      {/* BIR AC Date Issued */}
      <FieldRenderer
        label="BIR AC Date Issued"
        labelWidth="w-56"
        type="date"
        value={birAcDateIssued}
        disabled={!isEditing}
        onChange={(val) => setBirAcDateIssued(val)}
      />

      {/* Email Notification (Host) – UI only for now */}
      <div className="flex items-center gap-3">
        <label className="w-56 text-xs text-gray-600">
          Email Notification (Host)
        </label>
        <div className="flex-1 relative">
          <input
            type="text"
            value={emailNotifier}
            readOnly
            onClick={() => isEditing && setEmailModalOpen(true)}
            className={`w-full global-ref-textbox-ui ${
              isEditing
                ? "global-ref-textbox-enabled cursor-pointer"
                : "global-ref-textbox-disabled"
            }`}
          />
          <FontAwesomeIcon
            icon={faInfoCircle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 cursor-pointer"
            onClick={() => isEditing && setEmailModalOpen(true)}
          />
        </div>
      </div>
    </div>
  </div>

       
      </div>
    </div>
  );
};

export default Company;
