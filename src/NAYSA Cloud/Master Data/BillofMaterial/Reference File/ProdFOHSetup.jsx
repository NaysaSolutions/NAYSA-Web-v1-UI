import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBuilding,
  faCalculator,
  faChevronLeft,
  faChevronRight,
  faFlask,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faSave,
  faSliders,
  faTrashAlt,
  faUserTie,
} from "@fortawesome/free-solid-svg-icons";

import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import {
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import RCLookupModal from "@/NAYSA Cloud/Lookup/SearchRCMast.jsx";
import SearchProdLaborClassRef from "@/NAYSA Cloud/Lookup/SearchProdLaborClassRef.jsx";
import BOMReferenceLookupModal from "@/NAYSA Cloud/Lookup/SearchBOMRef.jsx";
import Position from "./ProdFOHSetup/Position.jsx";
import RentArea from "./ProdFOHSetup/RentArea.jsx";
import LaboratoryCodes from "./ProdFOHSetup/LaboratoryCodes.jsx";
import FOHStandard from "./ProdFOHSetup/FOHStandard.jsx";
import FOHStandardSummary from "./ProdFOHSetup/FOHStandardSummary.jsx";
import RentSetup from "./ProdFOHSetup/RentSetup.jsx";
import LaboratorySetup from "./ProdFOHSetup/LaboratorySetup.jsx";

const initialForm = {
  positionCode: "",
  positionName: "",
  active: "Y",
};

const initialRentAreaForm = {
  areaCode: "",
  areaName: "",
  areaSqm: "0.000000",
  active: "Y",
};

const initialRegistration = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const initialStandardForm = {
  fohStandardId: "",
  bomId: "",
  bomCode: "",
  bomEffectivityDate: "",
  fohEffectivityDate: "",
  itemType: "",
  itemCode: "",
  itemDescription: "",
  uom: "",
  quantity: "0.000000",
  remarks: "",
};

const emptyStandardLine = (lineNo = 1) => ({
  lineNo,
  processCode: "",
  processName: "",
  cycleTime: "0.00",
  standardHourlyRate: "0.00",
  rateDetails: [],
});

const emptyLaborRateLine = (lineNo = 1, cycleTime = "0.00") => ({
  lineNo,
  rcCode: "",
  department: "",
  designationCode: "",
  designation: "",
  headCount: "1",
  cycleTime,
  manHourRate: "0.00",
});

const tabs = [
  { key: "standard", label: "FOH Labor Std Setup" },
  { key: "other", label: "FOH Cost Setup" },
  { key: "reference", label: "Reference Code" },
];

const referenceTabs = [
  { key: "position", label: "Position Codes", icon: faUserTie },
  { key: "rentArea", label: "Rent Area Codes", icon: faBuilding },
  { key: "laboratoryCode", label: "Laboratory Codes", icon: faFlask },
];

const standardSetupTabs = [
  { key: "setup", label: "FOH Labor Standard", icon: faSliders },
  { key: "summary", label: "FOH Labor Standard Summary", icon: faCalculator },
];

const otherSetupTabs = [
  { key: "rent", label: "Rent Allocation", icon: faBuilding },
  { key: "laboratory", label: "Laboratory Setup", icon: faFlask },
];

const parseResult = (response) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const ProdFOHSetup = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const formTopRef = useRef(null);
  const manHourRateRefs = useRef([]);
  const rentAllocationRef = useRef(null);
  const laboratoryCodeRef = useRef(null);
  const laboratorySetupRef = useRef(null);

  const [activeTab, setActiveTab] = useState("reference");
  const [activeReferenceTab, setActiveReferenceTab] = useState("position");
  const [activeOtherTab, setActiveOtherTab] = useState("rent");
  const [activeStandardTab, setActiveStandardTab] = useState("setup");
  const [rentAllocationState, setRentAllocationState] = useState({ activeView: "allocation", isEditing: false, isBusy: false });
  const [laboratoryCodeState, setLaboratoryCodeState] = useState({ isEditing: false, selectedCode: "", isBusy: false });
  const [laboratorySetupState, setLaboratorySetupState] = useState({ activeView: "priceMatrix", isEditing: false, isBusy: false });
  const [collapseReferenceNav, setCollapseReferenceNav] = useState(false);
  const [collapseOtherNav, setCollapseOtherNav] = useState(false);
  const [collapseStandardNav, setCollapseStandardNav] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [registrationInfo, setRegistrationInfo] = useState(initialRegistration);
  const [selectedPositionCode, setSelectedPositionCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [tableFields, setTableFields] = useState([]);
  const [rentAreaTableFields, setRentAreaTableFields] = useState([]);
  const [rentAreaForm, setRentAreaForm] = useState(initialRentAreaForm);
  const [rentAreaRegistration, setRentAreaRegistration] = useState(initialRegistration);
  const [selectedAreaCode, setSelectedAreaCode] = useState("");
  const [isRentAreaEditing, setIsRentAreaEditing] = useState(false);
  const [isRentAreaChecking, setIsRentAreaChecking] = useState(false);
  const [standardForm, setStandardForm] = useState(initialStandardForm);
  const [standardRegistration, setStandardRegistration] = useState(initialRegistration);
  const [standardRows, setStandardRows] = useState(() => [
    emptyStandardLine(1),
    emptyStandardLine(2),
    emptyStandardLine(3),
  ]);
  const [isStandardEditing, setIsStandardEditing] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateTargetRowIndex, setRateTargetRowIndex] = useState(null);
  const [laborRateRows, setLaborRateRows] = useState([]);
  const [laborLookupRowIndex, setLaborLookupRowIndex] = useState(null);
  const [showRCLookup, setShowRCLookup] = useState(false);
  const [showPositionLookup, setShowPositionLookup] = useState(false);
  const [showStandardBOMLookup, setShowStandardBOMLookup] = useState(false);

  const userCode = user?.USER_CODE || user?.userCode || "ADMIN";

  const { data: positionList = [], isLoading: isListLoading } = useQuery({
    queryKey: ["prodFOHPositionList"],
    queryFn: async () => parseResult(await apiClient.get("/prodFOHSetup/load")),
  });

  const { data: rentAreaList = [], isLoading: isRentAreaListLoading } = useQuery({
    queryKey: ["prodFOHRentAreaList"],
    queryFn: async () =>
      parseResult(await apiClient.get("/prodFOHSetup/loadRentArea")),
  });

  const {
    data: standardSummary = [],
    isFetching: isStandardSummaryLoading,
    refetch: findStandardSummary,
  } = useQuery({
    queryKey: ["prodFOHStandardSummary"],
    queryFn: async () =>
      parseResult(await apiClient.get("/prodFOHSetup/loadStandard")),
    enabled: false,
  });

  const resetStandardSummary = () => {
    queryClient.setQueryData(["prodFOHStandardSummary"], []);
  };

  const resetForm = () => {
    setFormData(initialForm);
    setRegistrationInfo(initialRegistration);
    setSelectedPositionCode("");
    setIsEditing(false);
  };

  const resetRentAreaForm = () => {
    setRentAreaForm(initialRentAreaForm);
    setRentAreaRegistration(initialRegistration);
    setSelectedAreaCode("");
    setIsRentAreaEditing(false);
  };

  const resetStandardSetup = () => {
    setStandardForm(initialStandardForm);
    setStandardRegistration(initialRegistration);
    setStandardRows([
      emptyStandardLine(1),
      emptyStandardLine(2),
      emptyStandardLine(3),
    ]);
    setIsStandardEditing(false);
  };

  const updateStandardForm = (updates) => {
    setStandardForm((previous) => ({ ...previous, ...updates }));
  };

  const handleStandardBOMSelect = async (bom) => {
    setShowStandardBOMLookup(false);
    if (!bom) return;

    const bomId = bom.bomId || bom.BOM_ID || "";
    if (!bomId) {
      useSwalErrorAlert(
        "Unable to Select BOM",
        "The selected BOM does not have a valid BOM ID.",
      );
      return;
    }

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/getStandardSource", {
        json_data: {
          bomId,
          fohEffectivityDate: standardForm.fohEffectivityDate || "",
        },
      });
      const resultRow = response?.data?.data?.[0];
      if (Number(resultRow?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Unable to Load BOM Process",
          resultRow?.errormsg || "No BOM Process was found for the selected BOM.",
        );
        return;
      }

      const records = parseResult(response);
      const source = records?.[0];
      if (!source) {
        useSwalErrorAlert(
          "Unable to Load BOM Process",
          "No BOM Process Details were found for the selected BOM.",
        );
        return;
      }

      const details = Array.isArray(source.dt1)
        ? source.dt1
        : source.dt1
          ? JSON.parse(source.dt1)
          : [];

      setStandardForm((previous) => ({
        ...previous,
        bomId: source.bomId || bomId,
        bomCode: source.bomCode || bom.bomCode || "",
        bomEffectivityDate:
          source.bomEffectivityDate || bom.bomEffectivityDate || bom.bomDate || "",
        itemType: source.itemType || bom.itemType || bom.invType || "",
        itemCode: source.itemCode || bom.itemCode || "",
        itemDescription:
          source.itemDescription || bom.itemDescription || bom.itemName || "",
        uom: source.uom || bom.uom || bom.uomCode || "",
        quantity: Number(source.quantity ?? bom.quantity ?? bom.bomQty ?? 0).toFixed(6),
      }));
      setStandardRows(
        details.length
          ? renumberStandardLines(
              details.map((detail) => ({
                lineNo: detail.lineNo,
                processCode: detail.processCode || "",
                processName: detail.processName || "",
                cycleTime: Number(detail.cycleTime || 0).toFixed(2),
                standardHourlyRate: Number(
                  detail.standardHourlyRate || 0,
                ).toFixed(2),
                rateDetails: Array.isArray(detail.rateDetails)
                  ? detail.rateDetails
                  : [],
              })),
            )
          : [emptyStandardLine(1)],
      );
    } catch (error) {
      useSwalErrorAlertAPI("Unable to Load BOM Process", error);
    } finally {
      setIsChecking(false);
    }
  };

  const updateStandardLine = (rowIndex, field, value) => {
    setStandardRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const renumberStandardLines = (rows) =>
    rows.map((row, index) => ({ ...row, lineNo: index + 1 }));

  const addStandardLine = (rowIndex = standardRows.length - 1) => {
    setStandardRows((previous) => {
      const next = [...previous];
      next.splice(rowIndex + 1, 0, emptyStandardLine(rowIndex + 2));
      return renumberStandardLines(next);
    });
  };

  const removeStandardLine = (rowIndex) => {
    setStandardRows((previous) => {
      const next = previous.filter((_, index) => index !== rowIndex);
      return next.length
        ? renumberStandardLines(next)
        : [emptyStandardLine(1)];
    });
  };

  const openRateModal = (row) => {
    const cycleTime = Number(row?.cycleTime || 0).toFixed(2);
    const existingRows = Array.isArray(row?.rateDetails) ? row.rateDetails : [];

    setRateTargetRowIndex(row.rowIndex);
    setLaborRateRows(
      existingRows.length
        ? existingRows
        : [
            emptyLaborRateLine(1, cycleTime),
            emptyLaborRateLine(2, cycleTime),
            emptyLaborRateLine(3, cycleTime),
          ],
    );
    setIsRateModalOpen(true);
  };

  const closeRateModal = () => {
    setIsRateModalOpen(false);
    setRateTargetRowIndex(null);
    setLaborRateRows([]);
  };

  const updateLaborRateLine = (rowIndex, field, value) => {
    setLaborRateRows((previous) =>
      previous.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row,
      ),
    );
  };

  const removeLaborRateLine = (rowIndex) => {
    setLaborRateRows((previous) =>
      previous
        .filter((_, index) => index !== rowIndex)
        .map((row, index) => ({ ...row, lineNo: index + 1 })),
    );
  };

  const laborRateTotals = useMemo(() => {
    const totalHeadCount = laborRateRows.reduce(
      (total, row) => total + Number(row.headCount || 0),
      0,
    );
    const totalLaborCost = laborRateRows.reduce(
      (total, row) =>
        total +
        Number(row.headCount || 0) *
          Number(row.cycleTime || 0) *
          Number(row.manHourRate || 0),
      0,
    );

    return {
      totalHeadCount,
      totalLaborCost,
      averagePerHourRate:
        totalHeadCount > 0 ? totalLaborCost / totalHeadCount : 0,
    };
  }, [laborRateRows]);

  const applyLaborRate = () => {
    if (rateTargetRowIndex === null) return;

    setStandardRows((previous) =>
      previous.map((row, index) =>
        index === rateTargetRowIndex
          ? {
              ...row,
              standardHourlyRate: laborRateTotals.averagePerHourRate.toFixed(2),
              rateDetails: laborRateRows,
            }
          : row,
      ),
    );
    closeRateModal();
  };

  const handleCloseRCLookup = (selectedRC) => {
    if (selectedRC && laborLookupRowIndex !== null) {
      setLaborRateRows((previous) =>
        previous.map((row, index) =>
          index === laborLookupRowIndex
            ? {
                ...row,
                rcCode: selectedRC.rcCode || "",
                department: selectedRC.rcName || "",
              }
            : row,
        ),
      );
    }
    setShowRCLookup(false);
  };

  const selectPosition = (position) => {
    if (position && laborLookupRowIndex !== null) {
      setLaborRateRows((previous) =>
        previous.map((row, index) =>
          index === laborLookupRowIndex
            ? {
                ...row,
                designationCode: position.positionCode || "",
                designation: position.positionName || "",
              }
            : row,
        ),
      );
    }
    setShowPositionLookup(false);
  };

  const handleEdit = (row) => {
    setFormData({
      positionCode: row?.positionCode || "",
      positionName: row?.positionName || "",
      active: row?.active || "Y",
    });
    setRegistrationInfo({
      registeredBy: row?.registeredBy || "",
      registeredDate: row?.registeredDate || "",
      lastUpdatedBy: row?.lastUpdatedBy || "",
      lastUpdatedDate: row?.lastUpdatedDate || "",
    });
    setSelectedPositionCode(row?.positionCode || "");
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsert", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Save Failed", result?.errormsg || "Unable to save the Position.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] });
      useSwalSuccessAlert("Saved", "Position saved successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/delete", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert("Delete Failed", result?.errormsg || "Unable to delete the Position.");
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] });
      useSwalDeleteRecord("Deleted", "Position deleted successfully.");
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const getMax = (columnName) =>
    useGetFieldLength(tableFields, columnName) ||
    (columnName === "LABORCLASS_CODE" ? 20 : 100);

  const checkDuplicate = async (positionCode) => {
    const cleanCode = String(positionCode || "").trim().toUpperCase();
    if (!cleanCode || selectedPositionCode) return false;

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/checkDuplicate", {
        json_data: { positionCode: cleanCode },
      });
      const raw = response?.data?.data?.[0]?.result;
      const result = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(result?.result) === "1") {
        setFormData((previous) => ({ ...previous, positionCode: "" }));
        useSwalErrorAlert("Duplicate Position Code", `${cleanCode} is already registered.`);
        return true;
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return true;
    } finally {
      setIsChecking(false);
    }

    return false;
  };

  const handleSave = async () => {
    const positionCode = formData.positionCode.trim().toUpperCase();
    const positionName = formData.positionName.trim();

    if (!positionCode || !positionName) {
      useSwalErrorAlert("Required Fields", "Position Code and Position Name are required.");
      return;
    }

    if (positionCode.length > getMax("LABORCLASS_CODE")) {
      useSwalErrorAlert("Invalid Position Code", `Position Code cannot exceed ${getMax("LABORCLASS_CODE")} characters.`);
      return;
    }

    if (positionName.length > getMax("LABORCLASS_NAME")) {
      useSwalErrorAlert("Invalid Position Name", `Position Name cannot exceed ${getMax("LABORCLASS_NAME")} characters.`);
      return;
    }

    if (!selectedPositionCode && (await checkDuplicate(positionCode))) return;

    saveMutation.mutate({
      json_data: {
        positionCode,
        positionName,
        active: formData.active || "Y",
        userCode,
      },
    });
  };

  const handleDelete = async (row = null) => {
    const positionCode = row?.positionCode || selectedPositionCode;
    const positionName = row?.positionName || formData.positionName;
    if (!positionCode) return;

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/checkInUsed", {
        json_data: { positionCode },
      });
      const raw = response?.data?.data?.[0]?.result;
      const usage = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(usage?.result) === "1") {
        useSwalErrorAlert("Cannot Delete", "This Position is already in use.");
        return;
      }

      const confirmation = await useSwalDeleteConfirm(
        "Delete Position?",
        `Delete ${positionCode} - ${positionName}?`,
      );
      if (!confirmation?.isConfirmed) return;

      deleteMutation.mutate({ json_data: { positionCode, userCode } });
    } catch (error) {
      useSwalErrorAlertAPI("Delete Validation Failed", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleEditRentArea = (row) => {
    setRentAreaForm({
      areaCode: row?.areaCode || "",
      areaName: row?.areaName || "",
      areaSqm: Number(row?.areaSqm || 0).toFixed(6),
      active: row?.active || "Y",
    });
    setRentAreaRegistration({
      registeredBy: row?.registeredBy || "",
      registeredDate: row?.registeredDate || "",
      lastUpdatedBy: row?.lastUpdatedBy || "",
      lastUpdatedDate: row?.lastUpdatedDate || "",
    });
    setSelectedAreaCode(row?.areaCode || "");
    setIsRentAreaEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveRentAreaMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/upsertRentArea", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Save Failed",
          result?.errormsg || "Unable to save the Rent Area.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHRentAreaList"] });
      useSwalSuccessAlert("Saved", "Rent Area saved successfully.");
      resetRentAreaForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const deleteRentAreaMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/prodFOHSetup/deleteRentArea", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Delete Failed",
          result?.errormsg || "Unable to delete the Rent Area.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["prodFOHRentAreaList"] });
      useSwalDeleteRecord("Deleted", "Rent Area deleted successfully.");
      resetRentAreaForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Failed", error),
  });

  const saveStandardMutation = useMutation({
    mutationFn: (payload) =>
      apiClient.post("/prodFOHSetup/upsertStandard", payload),
    onSuccess: (response) => {
      const result = response?.data?.data?.[0];
      if (Number(result?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Save Failed",
          result?.errormsg || "Unable to save the FOH Standard Setup.",
        );
        return;
      }

      if (result?.fohStandardId) {
        setStandardForm((previous) => ({
          ...previous,
          fohStandardId: result.fohStandardId,
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["prodFOHStandardSummary"] });
      useSwalSuccessAlert("Saved", "FOH Standard Setup saved successfully.");
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const handleSaveStandard = () => {
    if (!standardForm.bomId) {
      useSwalErrorAlert("Required Field", "BOM Code is required.");
      return;
    }
    if (!standardForm.fohEffectivityDate) {
      useSwalErrorAlert(
        "Required Field",
        "FOH Effectivity Date is required.",
      );
      return;
    }

    const detailRows = standardRows.filter(
      (row) => String(row.processCode || "").trim() !== "",
    );
    if (!detailRows.length) {
      useSwalErrorAlert(
        "Required Details",
        "At least one FOH Standard Detail is required.",
      );
      return;
    }

    saveStandardMutation.mutate({
      json_data: {
        fohStandardId: standardForm.fohStandardId || "",
        bomId: standardForm.bomId,
        fohEffectivityDate: standardForm.fohEffectivityDate,
        remarks: standardForm.remarks || "",
        userCode,
        dt1: detailRows.map((row, index) => ({
          lineNo: index + 1,
          processCode: String(row.processCode || "").trim().toUpperCase(),
          cycleTime: Number(row.cycleTime || 0),
          standardHourlyRate: Number(row.standardHourlyRate || 0),
          rateDetails: (Array.isArray(row.rateDetails) ? row.rateDetails : [])
            .filter(
              (detail) =>
                String(detail.rcCode || "").trim() !== "" &&
                String(detail.designationCode || "").trim() !== "",
            )
            .map((detail, detailIndex) => ({
              lineNo: detailIndex + 1,
              rcCode: String(detail.rcCode || "").trim().toUpperCase(),
              designationCode: String(
                detail.designationCode || "",
              ).trim().toUpperCase(),
              headCount: Number(detail.headCount || 0),
              cycleTime: Number(detail.cycleTime || row.cycleTime || 0),
              manHourRate: Number(detail.manHourRate || 0),
            })),
        })),
      },
    });
  };

  const handleEditStandard = async (row) => {
    const fohStandardId = row?.fohStandardId || "";
    const bomId = row?.bomId || "";
    if (!fohStandardId && !bomId) {
      useSwalErrorAlert(
        "Unable to Edit",
        "The selected FOH Standard does not have a valid reference.",
      );
      return;
    }

    try {
      setIsChecking(true);
      const response = await apiClient.post("/prodFOHSetup/getStandard", {
        json_data: { fohStandardId, bomId },
      });
      const records = parseResult(response);
      const record = records?.[0];
      if (!record) {
        useSwalErrorAlert(
          "Record Not Found",
          "The selected FOH Standard could not be retrieved.",
        );
        return;
      }

      const details = Array.isArray(record.dt1)
        ? record.dt1
        : record.dt1
          ? JSON.parse(record.dt1)
          : [];

      setStandardForm({
        fohStandardId: record.fohStandardId || "",
        bomId: record.bomId || "",
        bomCode: record.bomCode || "",
        bomEffectivityDate: record.bomEffectivityDate || "",
        fohEffectivityDate: record.fohEffectivityDate || "",
        itemType: record.itemType || "",
        itemCode: record.itemCode || "",
        itemDescription: record.itemDescription || "",
        uom: record.uom || "",
        quantity: Number(record.quantity || 0).toFixed(6),
        remarks: record.remarks || "",
      });
      setStandardRegistration({
        registeredBy: record.registeredBy || "",
        registeredDate: record.registeredDate || "",
        lastUpdatedBy: record.lastUpdatedBy || "",
        lastUpdatedDate: record.lastUpdatedDate || "",
      });
      setStandardRows(
        details.length
          ? renumberStandardLines(
              details.map((detail) => {
                const rateDetails = Array.isArray(detail.rateDetails)
                  ? detail.rateDetails
                  : detail.rateDetails
                    ? JSON.parse(detail.rateDetails)
                    : [];
                return {
                  lineNo: detail.lineNo,
                  processCode: detail.processCode || "",
                  processName: detail.processName || "",
                  cycleTime: Number(detail.cycleTime || 0).toFixed(2),
                  standardHourlyRate: Number(
                    detail.standardHourlyRate || 0,
                  ).toFixed(2),
                  rateDetails: rateDetails.map((rate, rateIndex) => ({
                    lineNo: rateIndex + 1,
                    rcCode: rate.rcCode || "",
                    department: rate.department || "",
                    designationCode: rate.designationCode || "",
                    designation: rate.designation || "",
                    headCount: Number(rate.headCount || 0).toFixed(0),
                    cycleTime: Number(rate.cycleTime || 0).toFixed(2),
                    manHourRate: Number(rate.manHourRate || 0).toFixed(2),
                  })),
                };
              }),
            )
          : [emptyStandardLine(1)],
      );
      setIsStandardEditing(true);
      setActiveTab("standard");
      setActiveStandardTab("setup");
      requestAnimationFrame(() =>
        formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch (error) {
      useSwalErrorAlertAPI("Unable to Edit FOH Standard", error);
    } finally {
      setIsChecking(false);
    }
  };

  const getRentAreaMax = (columnName) =>
    useGetFieldLength(rentAreaTableFields, columnName) ||
    (columnName === "AREA_CODE" ? 20 : 100);

  const checkDuplicateRentArea = async (areaCode) => {
    const cleanCode = String(areaCode || "").trim().toUpperCase();
    if (!cleanCode || selectedAreaCode) return false;

    try {
      setIsRentAreaChecking(true);
      const response = await apiClient.post(
        "/prodFOHSetup/checkDuplicateRentArea",
        { json_data: { areaCode: cleanCode } },
      );
      const raw = response?.data?.data?.[0]?.result;
      const result = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(result?.result) === "1") {
        setRentAreaForm((previous) => ({ ...previous, areaCode: "" }));
        useSwalErrorAlert(
          "Duplicate Area Code",
          `${cleanCode} is already registered.`,
        );
        return true;
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
      return true;
    } finally {
      setIsRentAreaChecking(false);
    }

    return false;
  };

  const handleSaveRentArea = async () => {
    const areaCode = rentAreaForm.areaCode.trim().toUpperCase();
    const areaName = rentAreaForm.areaName.trim();
    const areaSqm = Number(rentAreaForm.areaSqm || 0);

    if (!areaCode || !areaName) {
      useSwalErrorAlert("Required Fields", "Area Code and Area Name are required.");
      return;
    }
    if (!Number.isFinite(areaSqm) || areaSqm < 0) {
      useSwalErrorAlert("Invalid Area", "Area (SQM) cannot be negative.");
      return;
    }
    if (areaCode.length > getRentAreaMax("AREA_CODE")) {
      useSwalErrorAlert(
        "Invalid Area Code",
        `Area Code cannot exceed ${getRentAreaMax("AREA_CODE")} characters.`,
      );
      return;
    }
    if (areaName.length > getRentAreaMax("AREA_NAME")) {
      useSwalErrorAlert(
        "Invalid Area Name",
        `Area Name cannot exceed ${getRentAreaMax("AREA_NAME")} characters.`,
      );
      return;
    }
    if (!selectedAreaCode && (await checkDuplicateRentArea(areaCode))) return;

    saveRentAreaMutation.mutate({
      json_data: {
        areaCode,
        areaName,
        areaSqm,
        active: rentAreaForm.active || "Y",
        userCode,
      },
    });
  };

  const handleDeleteRentArea = async (row = null) => {
    const areaCode = row?.areaCode || selectedAreaCode;
    const areaName = row?.areaName || rentAreaForm.areaName;
    if (!areaCode) return;

    try {
      setIsRentAreaChecking(true);
      const response = await apiClient.post(
        "/prodFOHSetup/checkRentAreaInUsed",
        { json_data: { areaCode } },
      );
      const raw = response?.data?.data?.[0]?.result;
      const usage = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (String(usage?.result) === "1") {
        useSwalErrorAlert("Cannot Delete", "This Rent Area is already in use.");
        return;
      }

      const confirmation = await useSwalDeleteConfirm(
        "Delete Rent Area?",
        `Delete ${areaCode} - ${areaName}?`,
      );
      if (!confirmation?.isConfirmed) return;

      deleteRentAreaMutation.mutate({ json_data: { areaCode, userCode } });
    } catch (error) {
      useSwalErrorAlertAPI("Delete Validation Failed", error);
    } finally {
      setIsRentAreaChecking(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEdit(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Edit Position"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDelete(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-xs text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete Position"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "positionCode",
        label: "Position Code",
        sortable: true,
        width: 180,
        requiredVisible: true,
      },
      {
        key: "positionName",
        label: "Position Name",
        sortable: true,
        minWidth: 260,
        requiredVisible: true,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 130,
        requiredVisible: true,
        render: (row) => (row?.active === "Y" ? "Yes" : "No"),
      },
    ],
    [],
  );

  const rentAreaColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        minWidth: 90,
        maxWidth: 90,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEditRentArea(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Edit Rent Area"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDeleteRentArea(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-xs text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete Rent Area"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "areaCode",
        label: "Area Code",
        sortable: true,
        width: 180,
        requiredVisible: true,
      },
      {
        key: "areaName",
        label: "Area Name",
        sortable: true,
        minWidth: 300,
        requiredVisible: true,
      },
      {
        key: "areaSqm",
        label: "Area (SQM)",
        sortable: true,
        width: 180,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <div className="px-2 text-right">
            {Number(row?.areaSqm || 0).toLocaleString("en-US", {
              minimumFractionDigits: 6,
              maximumFractionDigits: 6,
            })}
          </div>
        ),
      },
    ],
    [],
  );

  const standardDetailRows = useMemo(
    () =>
      standardRows.map((row, rowIndex) => ({
        ...row,
        rowIndex,
        key: `foh-standard-line-${rowIndex}`,
      })),
    [standardRows],
  );

  const standardColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 84,
        minWidth: 84,
        maxWidth: 84,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              disabled={!isStandardEditing}
              onClick={() => addStandardLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-100 bg-blue-50 text-[10px] text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Add process line"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              type="button"
              disabled={!isStandardEditing}
              onClick={() => removeStandardLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-[10px] text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              title="Delete process line"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "lineNo",
        label: "LN",
        width: 55,
        minWidth: 55,
        maxWidth: 55,
        sortable: false,
        requiredVisible: true,
        render: (row) => <div className="text-center">{row.lineNo}</div>,
      },
      {
        key: "processCode",
        label: "Process Code",
        width: 190,
        minWidth: 170,
        requiredVisible: true,
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.processCode || ""}
              readOnly
              disabled={!isStandardEditing}
              className="global-tran-td-inputclass-ui !h-7 w-full pr-7 text-[11px]"
            />
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className={`absolute right-2 text-xs ${
                isStandardEditing
                  ? "cursor-pointer text-blue-600 hover:text-blue-900"
                  : "cursor-not-allowed text-slate-300"
              }`}
              title="Select Process Code"
            />
          </div>
        ),
      },
      {
        key: "processName",
        label: "Process Description",
        width: 500,
        minWidth: 320,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.processName || ""}
            disabled
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      {
        key: "cycleTime",
        label: "Cycle Time",
        width: 180,
        minWidth: 160,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <input
            value={row.cycleTime || ""}
            disabled
            className="global-tran-td-inputclass-ui !h-7 w-full text-right text-[11px]"
          />
        ),
      },
      {
        key: "standardHourlyRate",
        label: "Std Hourly Rate",
        width: 170,
        minWidth: 150,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <div className="relative flex items-center">
            <input
              value={row.standardHourlyRate || ""}
              disabled={!isStandardEditing}
              inputMode="decimal"
              onFocus={(event) => {
                if (Number(event.target.value || 0) === 0) {
                  updateStandardLine(row.rowIndex, "standardHourlyRate", "");
                }
                requestAnimationFrame(() => event.target.select());
              }}
              onChange={(event) => {
                let value = event.target.value.replace(/[^0-9.]/g, "");
                const parts = value.split(".");
                if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
                updateStandardLine(row.rowIndex, "standardHourlyRate", value);
              }}
              onBlur={(event) =>
                updateStandardLine(
                  row.rowIndex,
                  "standardHourlyRate",
                  Number(event.target.value || 0).toFixed(2),
                )
              }
              className="global-tran-td-inputclass-ui !h-7 w-full pr-8 text-right text-[11px]"
            />
            <button
              type="button"
              disabled={!isStandardEditing}
              onClick={() => openRateModal(row)}
              className="absolute right-1 inline-flex h-5 w-5 items-center justify-center rounded text-blue-600 hover:bg-blue-100 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-slate-300"
              title="Compute detailed hourly rate"
            >
              <FontAwesomeIcon icon={faCalculator} className="text-[11px]" />
            </button>
          </div>
        ),
      },
    ],
    [isStandardEditing, standardRows],
  );

  const standardSummaryColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 80,
        minWidth: 80,
        maxWidth: 80,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEditStandard(row);
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded border border-blue-100 bg-blue-50 text-xs text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Edit FOH Standard"
            >
              <FontAwesomeIcon icon={faPenToSquare} />
            </button>
          </div>
        ),
      },
      { key: "bomCode", label: "BOM Code", width: 135, sortable: true, requiredVisible: true },
      {
        key: "fohEffectivityDate",
        label: "FOH Effectivity Date",
        width: 175,
        sortable: true,
        requiredVisible: true,
        render: (row) =>
          row?.fohEffectivityDate
            ? new Date(row.fohEffectivityDate).toLocaleDateString("en-US")
            : "",
      },
      {
        key: "bomEffectivityDate",
        label: "BOM Effectivity Date",
        width: 165,
        sortable: true,
        requiredVisible: true,
        render: (row) =>
          row?.bomEffectivityDate
            ? new Date(row.bomEffectivityDate).toLocaleDateString("en-US")
            : "",
      },
      { key: "itemType", label: "Item Type", width: 105, sortable: true, requiredVisible: true },
      { key: "itemCode", label: "Item Code", width: 145, sortable: true, requiredVisible: true },
      {
        key: "itemDescription",
        label: "Item Description",
        width: 280,
        sortable: true,
        requiredVisible: true,
      },
      { key: "uom", label: "UOM", width: 80, sortable: true, requiredVisible: true },
      {
        key: "quantity",
        label: "BOM Quantity",
        width: 130,
        sortable: true,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 6,
        render: (row) => (
          <div className="text-right">
            {Number(row?.quantity || 0).toLocaleString("en-US", {
              minimumFractionDigits: 6,
              maximumFractionDigits: 6,
            })}
          </div>
        ),
      },
      {
        key: "processCount",
        label: "No. of Processes",
        width: 135,
        sortable: true,
        requiredVisible: true,
        render: (row) => <div className="text-right">{Number(row?.processCount || 0)}</div>,
      },
      {
        key: "totalHourlyRate",
        label: "Total Hourly Rate",
        width: 145,
        sortable: true,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <div className="text-right">
            {Number(row?.totalHourlyRate || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      },
      { key: "remarks", label: "Remarks", width: 260, sortable: true, requiredVisible: true },
    ],
    [],
  );

  const laborRateDetailRows = useMemo(
    () =>
      laborRateRows.map((row, rowIndex) => ({
        ...row,
        rowIndex,
        key: `labor-rate-${rowIndex}`,
        totalLaborCost:
          Number(row.headCount || 0) *
          Number(row.cycleTime || 0) *
          Number(row.manHourRate || 0),
      })),
    [laborRateRows],
  );

  const laborRateColumns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 84,
        minWidth: 84,
        maxWidth: 84,
        sortable: false,
        filterable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="flex w-full items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => {
                const targetCycleTime =
                  standardRows[rateTargetRowIndex]?.cycleTime || "0.00";
                setLaborRateRows((previous) => {
                  const next = [...previous];
                  next.splice(
                    row.rowIndex + 1,
                    0,
                    emptyLaborRateLine(row.rowIndex + 2, targetCycleTime),
                  );
                  return next.map((item, index) => ({
                    ...item,
                    lineNo: index + 1,
                  }));
                });
              }}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-100 bg-blue-50 text-[10px] text-blue-600 transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
              title="Add labor line"
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
            <button
              type="button"
              onClick={() => removeLaborRateLine(row.rowIndex)}
              className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-100 bg-red-50 text-[10px] text-red-600 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
              title="Delete labor line"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "lineNo",
        label: "LN",
        width: 55,
        minWidth: 55,
        maxWidth: 55,
        sortable: false,
        requiredVisible: true,
        render: (row) => (
          <div className="text-center">{String(row.lineNo).padStart(2, "0")}</div>
        ),
      },
      {
        key: "department",
        label: "Department",
        width: 210,
        minWidth: 180,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.department || ""}
            onChange={(event) =>
              updateLaborRateLine(row.rowIndex, "department", event.target.value)
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      {
        key: "designation",
        label: "Designation",
        width: 210,
        minWidth: 180,
        requiredVisible: true,
        render: (row) => (
          <input
            value={row.designation || ""}
            onChange={(event) =>
              updateLaborRateLine(row.rowIndex, "designation", event.target.value)
            }
            className="global-tran-td-inputclass-ui !h-7 w-full text-[11px]"
          />
        ),
      },
      ...[
        {
          key: "headCount",
          label: (
            <span className="inline-block text-center leading-tight">
              Head<br />Count
            </span>
          ),
          decimals: 0,
          width: 95,
        },
        { key: "cycleTime", label: "Cycle Time", decimals: 2, width: 130 },
        { key: "manHourRate", label: "Man-hour Rate", decimals: 2, width: 145 },
      ].map((column) => ({
        key: column.key,
        label: column.label,
        width: column.width,
        minWidth: column.width,
        requiredVisible: true,
        renderType: "number",
        roundingOff: column.decimals,
        render: (row) => (
          <input
            ref={(element) => {
              if (column.key === "manHourRate") {
                manHourRateRefs.current[row.rowIndex] = element;
              }
            }}
            value={row[column.key] || ""}
            inputMode="decimal"
            onFocus={(event) => {
              if (
                column.key === "manHourRate" &&
                Number(event.target.value || 0) === 0
              ) {
                updateLaborRateLine(row.rowIndex, column.key, "");
              }
              requestAnimationFrame(() => event.target.select());
            }}
            onChange={(event) => {
              let value = event.target.value.replace(/[^0-9.]/g, "");
              const parts = value.split(".");
              if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
              updateLaborRateLine(row.rowIndex, column.key, value);
            }}
            onBlur={(event) =>
              updateLaborRateLine(
                row.rowIndex,
                column.key,
                Number(event.target.value || 0).toFixed(column.decimals),
              )
            }
            onKeyDown={(event) => {
              if (column.key !== "manHourRate" || event.key !== "Enter") return;
              event.preventDefault();
              updateLaborRateLine(
                row.rowIndex,
                column.key,
                Number(event.currentTarget.value || 0).toFixed(2),
              );
              requestAnimationFrame(() => {
                manHourRateRefs.current[row.rowIndex + 1]?.focus();
              });
            }}
            className="global-tran-td-inputclass-ui !h-7 w-full text-right text-[11px]"
          />
        ),
      })),
      {
        key: "totalLaborCost",
        label: "Total Labor Cost",
        width: 160,
        minWidth: 150,
        requiredVisible: true,
        renderType: "number",
        roundingOff: 2,
        render: (row) => (
          <div className="px-2 text-right font-semibold">
            {Number(row.totalLaborCost || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        ),
      },
    ],
    [laborRateRows],
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([
      useFieldLenghtCheck("PROD_LABORCLASS_REF"),
      useFieldLenghtCheck("PROD_RENTAREA_REF"),
    ])
      .then(([positionFields, rentAreaFields]) => {
        if (!mounted) return;
        setTableFields(positionFields || []);
        setRentAreaTableFields(rentAreaFields || []);
      })
      .catch((error) =>
        console.error("Unable to load FOH reference field lengths.", error),
      );

    return () => {
      mounted = false;
    };
  }, []);

  const isBusy =
    isListLoading ||
    isRentAreaListLoading ||
    isStandardSummaryLoading ||
    isChecking ||
    isRentAreaChecking ||
    saveMutation.isPending ||
    deleteMutation.isPending ||
    saveRentAreaMutation.isPending ||
    deleteRentAreaMutation.isPending ||
    saveStandardMutation.isPending ||
    laboratoryCodeState.isBusy ||
    laboratorySetupState.isBusy;

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="grid w-full grid-cols-1 items-center gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex w-full min-w-0 items-center gap-4 xl:justify-self-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center xl:w-auto xl:text-left">
              FOH Set-up
            </h1>
          </div>

          <div className="flex w-full justify-center xl:w-auto xl:justify-self-center">
            <div className="w-full md:w-auto">
              <div className="no-scrollbar flex flex-nowrap overflow-x-auto border-b border-blue-300 dark:border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`shrink-0 whitespace-nowrap rounded-md border-b-2 px-3 py-1 text-[10px] font-bold transition-all sm:px-4 sm:py-2 sm:text-[13px] ${
                      activeTab === tab.key
                        ? "border-blue-700 bg-blue-50/50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex min-h-8 w-full justify-center xl:mt-0 xl:w-auto xl:justify-self-end">
            {activeTab === "reference" && activeReferenceTab === "position" && (
              <ButtonBar
                buttons={[
                  {
                    key: "add",
                    label: "Add",
                    icon: faPlus,
                    onClick: () => {
                      resetForm();
                      setIsEditing(true);
                    },
                  },
                  {
                    key: "save",
                    label: "Save",
                    icon: faSave,
                    onClick: handleSave,
                    disabled: !isEditing || isBusy,
                  },
                  {
                    key: "delete",
                    label: "Delete",
                    icon: faTrashAlt,
                    onClick: handleDelete,
                    disabled: !selectedPositionCode || isBusy,
                  },
                  {
                    key: "reset",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetForm,
                  },
                ]}
              />
            )}
            {activeTab === "reference" && activeReferenceTab === "rentArea" && (
              <ButtonBar
                buttons={[
                  {
                    key: "add-rent-area",
                    label: "Add",
                    icon: faPlus,
                    onClick: () => {
                      resetRentAreaForm();
                      setIsRentAreaEditing(true);
                    },
                  },
                  {
                    key: "save-rent-area",
                    label: "Save",
                    icon: faSave,
                    onClick: handleSaveRentArea,
                    disabled: !isRentAreaEditing || isBusy,
                  },
                  {
                    key: "delete-rent-area",
                    label: "Delete",
                    icon: faTrashAlt,
                    onClick: handleDeleteRentArea,
                    disabled: !selectedAreaCode || isBusy,
                  },
                  {
                    key: "reset-rent-area",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetRentAreaForm,
                  },
                ]}
              />
            )}
            {activeTab === "reference" && activeReferenceTab === "laboratoryCode" && (
              <ButtonBar
                buttons={[
                  { key: "add-laboratory-code", label: "Add", icon: faPlus, onClick: () => laboratoryCodeRef.current?.add() },
                  { key: "save-laboratory-code", label: "Save", icon: faSave, onClick: () => laboratoryCodeRef.current?.save(), disabled: !laboratoryCodeState.isEditing || laboratoryCodeState.isBusy },
                  { key: "delete-laboratory-code", label: "Delete", icon: faTrashAlt, onClick: () => laboratoryCodeRef.current?.remove(), disabled: !laboratoryCodeState.selectedCode || laboratoryCodeState.isBusy },
                  { key: "reset-laboratory-code", label: "Reset", icon: faRotateLeft, onClick: () => laboratoryCodeRef.current?.reset() },
                ]}
              />
            )}
            {activeTab === "standard" && activeStandardTab === "setup" && (
              <ButtonBar
                buttons={[
                  {
                    key: "add-standard",
                    label: "Add",
                    icon: faPlus,
                    onClick: () => {
                      resetStandardSetup();
                      setIsStandardEditing(true);
                    },
                  },
                  {
                    key: "save-standard",
                    label: "Save",
                    icon: faSave,
                    onClick: handleSaveStandard,
                    disabled:
                      !isStandardEditing ||
                      !standardForm.bomId ||
                      saveStandardMutation.isPending,
                  },
                  {
                    key: "reset-standard",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetStandardSetup,
                  },
                ]}
              />
            )}
            {activeTab === "standard" && activeStandardTab === "summary" && (
              <ButtonBar
                buttons={[
                  {
                    key: "find-standard-summary",
                    label: "Find",
                    icon: faMagnifyingGlass,
                    onClick: () => findStandardSummary(),
                    disabled: isStandardSummaryLoading,
                  },
                  {
                    key: "reset-standard-summary",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: resetStandardSummary,
                    disabled: isStandardSummaryLoading,
                  },
                ]}
              />
            )}
            {activeTab === "other" && activeOtherTab === "rent" && (
              <ButtonBar
                buttons={rentAllocationState.activeView === "summary" ? [
                  {
                    key: "find-rent-allocation-summary",
                    label: "Find",
                    icon: faMagnifyingGlass,
                    onClick: () => rentAllocationRef.current?.refreshSummary(),
                    disabled: rentAllocationState.isBusy,
                  },
                  {
                    key: "reset-rent-allocation-summary",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: () => rentAllocationRef.current?.resetSummary(),
                    disabled: rentAllocationState.isBusy,
                  },
                ] : [
                  {
                    key: "add-rent-allocation",
                    label: "Add",
                    icon: faPlus,
                    onClick: () => rentAllocationRef.current?.add(),
                    disabled: rentAllocationState.isBusy,
                  },
                  {
                    key: "save-rent-allocation",
                    label: "Save",
                    icon: faSave,
                    onClick: () => rentAllocationRef.current?.save(),
                    disabled: !rentAllocationState.isEditing || rentAllocationState.isBusy,
                  },
                  {
                    key: "reset-rent-allocation",
                    label: "Reset",
                    icon: faRotateLeft,
                    onClick: () => rentAllocationRef.current?.reset(),
                    disabled: rentAllocationState.isBusy,
                  },
                ]}
              />
            )}
            {activeTab === "other" && activeOtherTab === "laboratory" && ["priceMatrix", "categoryMatrix"].includes(laboratorySetupState.activeView) && (
              <ButtonBar
                buttons={[
                  { key: "add-laboratory-price", label: "Add", icon: faPlus, onClick: () => laboratorySetupRef.current?.add(), disabled: laboratorySetupState.isBusy },
                  { key: "save-laboratory-price", label: "Save", icon: faSave, onClick: () => laboratorySetupRef.current?.save(), disabled: !laboratorySetupState.isEditing || laboratorySetupState.isBusy },
                  { key: "reset-laboratory-price", label: "Reset", icon: faRotateLeft, onClick: () => laboratorySetupRef.current?.reset(), disabled: laboratorySetupState.isBusy },
                ]}
              />
            )}
            {activeTab === "other" && activeOtherTab === "laboratory" && ["priceSummary", "categorySummary"].includes(laboratorySetupState.activeView) && (
              <ButtonBar
                buttons={[
                  { key: "find-laboratory-summary", label: "Find", icon: faMagnifyingGlass, onClick: () => laboratorySetupRef.current?.refreshSummary(), disabled: laboratorySetupState.isBusy },
                  { key: "reset-laboratory-summary", label: "Reset", icon: faRotateLeft, onClick: () => laboratorySetupRef.current?.resetSummary(), disabled: laboratorySetupState.isBusy },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-20">
            <div
              className={`flex w-full flex-col pb-3 pt-3 lg:flex-row ${
                collapseReferenceNav ? "gap-2" : "gap-4"
              } ${activeTab === "reference" ? "" : "hidden"}`}
            >
              <aside
                className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:w-auto ${
                  collapseReferenceNav ? "lg:w-20" : "lg:w-80"
                }`}
              >
                <div className="global-tran-textbox-group-div-ui !h-fit w-full self-start">
                  <div className="mb-2 flex items-center justify-between">
                    {!collapseReferenceNav && (
                      <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                          FOH Reference Codes
                        </div>
                        <div className="mt-0.5 text-xs leading-4 text-gray-500 dark:text-slate-400">
                          Maintain production reference records
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setCollapseReferenceNav((previous) => !previous)}
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      title={collapseReferenceNav ? "Expand reference navigation" : "Collapse reference navigation"}
                    >
                      <FontAwesomeIcon
                        icon={collapseReferenceNav ? faChevronRight : faChevronLeft}
                      />
                    </button>
                  </div>

                  <div
                    className={`flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible ${
                      collapseReferenceNav ? "lg:items-center" : ""
                    }`}
                  >
                  {referenceTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveReferenceTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm lg:w-full ${
                        activeReferenceTab === tab.key
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700"
                      } ${collapseReferenceNav ? "lg:w-16 lg:flex-col lg:justify-center lg:gap-1 lg:px-0.5" : ""}`}
                      title={collapseReferenceNav ? tab.label : undefined}
                    >
                        <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                        {!collapseReferenceNav && (
                          <span className="whitespace-nowrap">{tab.label}</span>
                        )}
                        {collapseReferenceNav && (
                          <span className="hidden max-w-[58px] text-center text-[8px] leading-tight lg:block">
                            {tab.label}
                          </span>
                        )}
                    </button>
                  ))}
                  </div>
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                <div className={activeReferenceTab === "position" ? "" : "hidden"}>
                  <Position
                    formTopRef={formTopRef}
                    formData={formData}
                    setFormData={setFormData}
                    isEditing={isEditing}
                    selectedPositionCode={selectedPositionCode}
                    getMax={getMax}
                    checkDuplicate={checkDuplicate}
                    registrationInfo={registrationInfo}
                    columns={columns}
                    positionList={positionList}
                    isListLoading={isListLoading}
                    handleEdit={handleEdit}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ["prodFOHPositionList"] })}
                  />
                </div>
                <div className={activeReferenceTab === "rentArea" ? "" : "hidden"}>
                <RentArea
                  formTopRef={formTopRef}
                  form={rentAreaForm}
                  setForm={setRentAreaForm}
                  isEditing={isRentAreaEditing}
                  selectedAreaCode={selectedAreaCode}
                  getMax={getRentAreaMax}
                  checkDuplicate={checkDuplicateRentArea}
                  registrationInfo={rentAreaRegistration}
                  columns={rentAreaColumns}
                  data={rentAreaList}
                  isLoading={isRentAreaListLoading}
                  onEdit={handleEditRentArea}
                  onRefresh={() => queryClient.invalidateQueries({ queryKey: ["prodFOHRentAreaList"] })}
                />
                </div>
                <div className={activeReferenceTab === "laboratoryCode" ? "" : "hidden"}>
                  <LaboratoryCodes ref={laboratoryCodeRef} onStateChange={setLaboratoryCodeState} />
                </div>
              </div>
            </div>
            <div
              className={`flex w-full flex-col pb-3 pt-3 lg:flex-row ${
                collapseStandardNav ? "gap-2" : "gap-4"
              } ${activeTab === "standard" ? "" : "hidden"}`}
            >
              <aside
                className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:w-auto ${
                  collapseStandardNav ? "lg:w-20" : "lg:w-80"
                }`}
              >
                <div className="global-tran-textbox-group-div-ui !h-fit w-full self-start">
                  <div className="mb-2 flex items-center justify-between">
                    {!collapseStandardNav && (
                      <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                          FOH Labor Std Setup
                        </div>
                        <div className="mt-0.5 text-xs leading-4 text-gray-500 dark:text-slate-400">
                          Maintain and review FOH standards
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setCollapseStandardNav((previous) => !previous)
                      }
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      title={
                        collapseStandardNav
                          ? "Expand standard navigation"
                          : "Collapse standard navigation"
                      }
                    >
                      <FontAwesomeIcon
                        icon={
                          collapseStandardNav ? faChevronRight : faChevronLeft
                        }
                      />
                    </button>
                  </div>

                  <div
                    className={`flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible ${
                      collapseStandardNav ? "lg:items-center" : ""
                    }`}
                  >
                    {standardSetupTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveStandardTab(tab.key)}
                        className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm lg:w-full ${
                          activeStandardTab === tab.key
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700"
                        } ${
                          collapseStandardNav
                            ? "lg:w-16 lg:flex-col lg:justify-center lg:gap-1 lg:px-0.5"
                            : ""
                        }`}
                        title={collapseStandardNav ? tab.label : undefined}
                      >
                        <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                        {!collapseStandardNav && (
                          <span className="whitespace-nowrap">{tab.label}</span>
                        )}
                        {collapseStandardNav && (
                          <span className="hidden max-w-[58px] text-center text-[8px] leading-tight lg:block">
                            {tab.label}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="min-w-0 flex-1">
                <div className={activeStandardTab === "setup" ? "" : "hidden"}>
                  <FOHStandard
                    form={standardForm}
                    isEditing={isStandardEditing}
                    updateForm={updateStandardForm}
                    registrationInfo={standardRegistration}
                    columns={standardColumns}
                    rows={standardDetailRows}
                    onBOMLookup={() => setShowStandardBOMLookup(true)}
                  />
                </div>
                <div className={activeStandardTab === "summary" ? "" : "hidden"}>
                  <FOHStandardSummary
                    columns={standardSummaryColumns}
                    data={standardSummary}
                    isLoading={isStandardSummaryLoading}
                    onRefresh={() => findStandardSummary()}
                  />
                </div>
              </div>
            </div>
            <div
              className={`flex w-full flex-col pb-3 pt-3 lg:flex-row ${
                collapseOtherNav ? "gap-2" : "gap-4"
              } ${activeTab === "other" ? "" : "hidden"}`}
            >
              <aside
                className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:w-auto ${
                  collapseOtherNav ? "lg:w-20" : "lg:w-80"
                }`}
              >
                <div className="global-tran-textbox-group-div-ui !h-fit w-full self-start">
                  <div className="mb-2 flex items-center justify-between">
                    {!collapseOtherNav && (
                      <div>
                        <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                          FOH Cost Setup
                        </div>
                        <div className="mt-0.5 text-xs leading-4 text-gray-500 dark:text-slate-400">
                          Maintain production overhead settings
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setCollapseOtherNav((previous) => !previous)}
                      className="flex h-8 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
                      title={collapseOtherNav ? "Expand setup navigation" : "Collapse setup navigation"}
                    >
                      <FontAwesomeIcon
                        icon={collapseOtherNav ? faChevronRight : faChevronLeft}
                      />
                    </button>
                  </div>

                  <div
                    className={`flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible ${
                      collapseOtherNav ? "lg:items-center" : ""
                    }`}
                  >
                  {otherSetupTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveOtherTab(tab.key)}
                      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm lg:w-full ${
                        activeOtherTab === tab.key
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700"
                      } ${collapseOtherNav ? "lg:w-16 lg:flex-col lg:justify-center lg:gap-1 lg:px-0.5" : ""}`}
                      title={collapseOtherNav ? tab.label : undefined}
                    >
                      <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                      {!collapseOtherNav && (
                        <span className="whitespace-nowrap">{tab.label}</span>
                      )}
                      {collapseOtherNav && (
                        <span className="hidden max-w-[58px] text-center text-[8px] leading-tight lg:block">
                          {tab.label}
                        </span>
                      )}
                    </button>
                  ))}
                  </div>
                </div>
              </aside>
              <div className={`min-w-0 flex-1 ${activeOtherTab === "rent" ? "" : "hidden"}`}>
                <RentSetup ref={rentAllocationRef} onStateChange={setRentAllocationState} />
              </div>
              <div className={`min-w-0 flex-1 ${activeOtherTab === "laboratory" ? "" : "hidden"}`}><LaboratorySetup ref={laboratorySetupRef} onStateChange={setLaboratorySetupState} /></div>
            </div>
      </div>

      {isRateModalOpen && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[1px]">
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-blue-200 bg-blue-100 px-5 py-3 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <FontAwesomeIcon icon={faCalculator} />
                  Std Hourly Rate - Detailed
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                  {standardRows[rateTargetRowIndex]?.processCode || "Process"}
                  {standardRows[rateTargetRowIndex]?.processName
                    ? ` - ${standardRows[rateTargetRowIndex].processName}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRateModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-white/70 hover:text-red-600 dark:hover:bg-slate-800"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="hidden">
                <table className="w-full border-collapse text-xs">
                  <thead className="bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-100">
                    <tr>
                      <th className="w-14 border-b border-r border-slate-200 px-2 py-2 text-center dark:border-slate-700">LN</th>
                      <th className="min-w-44 border-b border-r border-slate-200 px-2 py-2 text-left dark:border-slate-700">Department</th>
                      <th className="min-w-44 border-b border-r border-slate-200 px-2 py-2 text-left dark:border-slate-700">Designation</th>
                      <th className="w-28 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Head Count</th>
                      <th className="w-32 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Cycle Time</th>
                      <th className="w-36 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Man-hour Rate</th>
                      <th className="w-40 border-b border-r border-slate-200 px-2 py-2 text-right dark:border-slate-700">Total Labor Cost</th>
                      <th className="w-16 border-b border-slate-200 px-2 py-2 text-center dark:border-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laborRateRows.map((row, rowIndex) => {
                      const totalLaborCost =
                        Number(row.headCount || 0) *
                        Number(row.cycleTime || 0) *
                        Number(row.manHourRate || 0);

                      return (
                        <tr key={`labor-rate-${rowIndex}`} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                          <td className="border-r border-slate-200 px-2 py-1.5 text-center dark:border-slate-700">
                            {String(row.lineNo).padStart(2, "0")}
                          </td>
                          <td className="border-r border-slate-200 p-1 dark:border-slate-700">
                            <input
                              value={row.department}
                              onChange={(event) =>
                                updateLaborRateLine(rowIndex, "department", event.target.value)
                              }
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          <td className="border-r border-slate-200 p-1 dark:border-slate-700">
                            <input
                              value={row.designation}
                              onChange={(event) =>
                                updateLaborRateLine(rowIndex, "designation", event.target.value)
                              }
                              className="h-8 w-full rounded border border-slate-300 bg-white px-2 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                            />
                          </td>
                          {[
                            ["headCount", row.headCount, 0],
                            ["cycleTime", row.cycleTime, 2],
                            ["manHourRate", row.manHourRate, 2],
                          ].map(([field, value, decimals]) => (
                            <td key={field} className="border-r border-slate-200 p-1 dark:border-slate-700">
                              <input
                                value={value}
                                inputMode="decimal"
                                onFocus={(event) => event.target.select()}
                                onChange={(event) => {
                                  let nextValue = event.target.value.replace(/[^0-9.]/g, "");
                                  const parts = nextValue.split(".");
                                  if (parts.length > 2) nextValue = `${parts[0]}.${parts.slice(1).join("")}`;
                                  updateLaborRateLine(rowIndex, field, nextValue);
                                }}
                                onBlur={(event) =>
                                  updateLaborRateLine(
                                    rowIndex,
                                    field,
                                    Number(event.target.value || 0).toFixed(decimals),
                                  )
                                }
                                className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-right outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-800"
                              />
                            </td>
                          ))}
                          <td className="border-r border-slate-200 px-2 py-1.5 text-right font-semibold dark:border-slate-700">
                            {totalLaborCost.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLaborRateLine(rowIndex)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                              title="Delete labor line"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold dark:bg-slate-800">
                    <tr>
                      <td colSpan={3} className="border-r border-t border-slate-200 px-3 py-2 text-right dark:border-slate-700">Total</td>
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right dark:border-slate-700">
                        {laborRateTotals.totalHeadCount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} className="border-r border-t border-slate-200 dark:border-slate-700" />
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right dark:border-slate-700">
                        {laborRateTotals.totalLaborCost.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border-t border-slate-200 dark:border-slate-700" />
                    </tr>
                    <tr className="text-blue-700 dark:text-blue-300">
                      <td colSpan={6} className="border-r border-t border-slate-200 px-3 py-2 text-right dark:border-slate-700">
                        Average per Hour Rate
                      </td>
                      <td className="border-r border-t border-slate-200 px-2 py-2 text-right text-sm font-bold dark:border-slate-700">
                        {laborRateTotals.averagePerHourRate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="border-t border-slate-200 dark:border-slate-700" />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="global-tran-table-main-div-ui">
                <div className="global-tran-table-main-sub-div-ui min-h-[260px]">
                  <table className="w-full table-fixed border-separate border-spacing-0 [&_th]:border-b [&_th]:border-slate-200 [&_td]:border-b [&_td]:border-r [&_td]:border-slate-100 [&_tr>td:first-child]:border-l dark:[&_td]:border-slate-700">
                    <thead className="global-tran-thead-div-ui">
                      <tr>
                        <th className="global-tran-th-ui w-[55px]">LN</th>
                        <th className="global-tran-th-ui w-[190px]">Department</th>
                        <th className="global-tran-th-ui w-[190px]">Designation</th>
                        <th className="global-tran-th-ui w-[90px] whitespace-normal text-center leading-tight">
                          Head<br />Count
                        </th>
                        <th className="global-tran-th-ui w-[125px]">Cycle Time</th>
                        <th className="global-tran-th-ui w-[140px]">Man-hour Rate</th>
                        <th className="global-tran-th-ui w-[150px]">Total Labor Cost</th>
                        <th className="global-tran-th-ui sticky right-0 w-[84px] bg-blue-100 dark:bg-blue-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="relative">
                      {laborRateDetailRows.map((row) => (
                        <tr key={row.key} className="global-tran-tr-ui">
                          <td className="global-tran-td-ui text-center">
                            {String(row.lineNo).padStart(2, "0")}
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="relative">
                              <input
                                value={row.department || ""}
                                readOnly
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowRCLookup(true);
                                }}
                                className="global-tran-td-inputclass-ui w-full cursor-pointer pr-7"
                                title={row.rcCode || "Select Responsibility Center"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowRCLookup(true);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600"
                                title="Select Responsibility Center"
                              >
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                              </button>
                            </div>
                          </td>
                          <td className="global-tran-td-ui">
                            <div className="relative">
                              <input
                                value={row.designation || ""}
                                readOnly
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowPositionLookup(true);
                                }}
                                className="global-tran-td-inputclass-ui w-full cursor-pointer pr-7"
                                title={row.designationCode || "Select Position"}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setLaborLookupRowIndex(row.rowIndex);
                                  setShowPositionLookup(true);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600"
                                title="Select Position"
                              >
                                <FontAwesomeIcon icon={faMagnifyingGlass} />
                              </button>
                            </div>
                          </td>
                          {[
                            ["headCount", 0],
                            ["cycleTime", 2],
                            ["manHourRate", 2],
                          ].map(([field, decimals]) => (
                            <td key={field} className="global-tran-td-ui">
                              <input
                                ref={(element) => {
                                  if (field === "manHourRate") {
                                    manHourRateRefs.current[row.rowIndex] = element;
                                  }
                                }}
                                value={row[field] || ""}
                                inputMode="decimal"
                                onFocus={(event) => {
                                  if (
                                    field === "manHourRate" &&
                                    Number(event.target.value || 0) === 0
                                  ) {
                                    updateLaborRateLine(row.rowIndex, field, "");
                                  }
                                  requestAnimationFrame(() => event.target.select());
                                }}
                                onChange={(event) => {
                                  let value = event.target.value.replace(/[^0-9.]/g, "");
                                  const parts = value.split(".");
                                  if (parts.length > 2) value = `${parts[0]}.${parts.slice(1).join("")}`;
                                  updateLaborRateLine(row.rowIndex, field, value);
                                }}
                                onBlur={(event) =>
                                  updateLaborRateLine(
                                    row.rowIndex,
                                    field,
                                    Number(event.target.value || 0).toFixed(decimals),
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (field !== "manHourRate" || event.key !== "Enter") return;
                                  event.preventDefault();
                                  updateLaborRateLine(
                                    row.rowIndex,
                                    field,
                                    Number(event.currentTarget.value || 0).toFixed(2),
                                  );
                                  requestAnimationFrame(() => {
                                    manHourRateRefs.current[row.rowIndex + 1]?.focus();
                                  });
                                }}
                                className="global-tran-td-inputclass-ui w-full text-right"
                              />
                            </td>
                          ))}
                          <td className="global-tran-td-ui text-right font-normal">
                            {Number(row.totalLaborCost || 0).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="global-tran-td-ui sticky right-0 bg-white text-center dark:bg-black">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                className="global-tran-td-button-add-ui"
                                onClick={() => {
                                  const targetCycleTime =
                                    standardRows[rateTargetRowIndex]?.cycleTime || "0.00";
                                  setLaborRateRows((previous) => {
                                    const next = [...previous];
                                    next.splice(
                                      row.rowIndex + 1,
                                      0,
                                      emptyLaborRateLine(row.rowIndex + 2, targetCycleTime),
                                    );
                                    return next.map((item, index) => ({
                                      ...item,
                                      lineNo: index + 1,
                                    }));
                                  });
                                }}
                                title="Add labor line"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              <button
                                type="button"
                                className="global-tran-td-button-delete-ui"
                                onClick={() => removeLaborRateLine(row.rowIndex)}
                                title="Delete labor line"
                              >
                                <FontAwesomeIcon icon={faTrashAlt} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
                <span>Average per Hour Rate</span>
                <span className="min-w-24 text-right text-sm font-semibold">
                  {laborRateTotals.averagePerHourRate.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={applyLaborRate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Apply Average Rate
              </button>
            </div>
          </div>
        </div>
      )}

      <RCLookupModal
        isOpen={showRCLookup}
        onClose={handleCloseRCLookup}
        title="Select Responsibility Center"
      />

      <SearchProdLaborClassRef
        isOpen={showPositionLookup}
        onClose={selectPosition}
        title="Select Designation"
      />

      <BOMReferenceLookupModal
        isOpen={showStandardBOMLookup}
        onClose={handleStandardBOMSelect}
        title="Select BOM with Process"
        endpoint="/prodFOHSetup/lookupBOM"
        params={{ withBOMProcess: true }}
      />
    </div>
  );
};

export default ProdFOHSetup;
