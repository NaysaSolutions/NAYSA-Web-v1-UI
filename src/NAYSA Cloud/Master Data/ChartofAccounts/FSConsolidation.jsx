import React, { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faSave,
  faUndo,
  faTrashAlt,
  faInfoCircle,
  faChevronDown,
  faFilePdf,
  faVideo,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";

import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar.jsx";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";

import {
  reftablesPDFGuide,
  reftablesVideoGuide,
} from "@/NAYSA Cloud/Global/reftable";

import {
  useSwalErrorAlert,
  useSwalSuccessAlert,
  useSwalErrorAlertAPI,
  useSwalDeleteConfirm,
  useSwalDeleteRecord,
} from "@/NAYSA Cloud/Global/behavior.jsx";

import {
  useFieldLenghtCheck,
  useGetFieldLength,
} from "@/NAYSA Cloud/Global/procedure";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast.jsx";
import SearchFSConso from "@/NAYSA Cloud/Lookup/SearchFSConso.jsx";

const DOC_TYPE = "FSConso";

const EMPTY_ROW = {
  fsConsoCode: "",
  fsConsoName: "",
  fsType: "",
  acctBalance: "",
  sumGrp: "",
  sumOper: "",
  topLine: "",
  bottomLine: "",
  currSign: "N",

  // acctCode: "",
  // acctName: "",

  // glRetEarn: "",
  // glRetEarnName: "",
  // fsRetEarn: "",
  // fsRetEarnName: "",
  // fsNetIncome: "",
  // fsNetIncomeName: "",

  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
  __isNew: true,
  __isDirty: true,
};

const FSConsolidation = forwardRef(function FSConsolidation(
  {
    embedded = false,
    activeTab = "fsconso",
    setActiveTab = () => {},
    tabs = [],
  },
  ref
) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const guideRef = useRef(null);
  const pdfLink = reftablesPDFGuide[DOC_TYPE];
  const videoLink = reftablesVideoGuide[DOC_TYPE];

  const [isOpenGuide, setOpenGuide] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [tblFieldArray, setTblFieldArray] = useState([]);
  const [savingAll, setSavingAll] = useState(false);
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);

  const [registrationInfo, setRegistrationInfo] = useState({
    registeredBy: "",
    registeredDate: "",
    lastUpdatedBy: "",
    lastUpdatedDate: "",
  });

  const [modals, setModals] = useState({
    coa: false,
    glRetEarn: false,
    fsRetEarn: false,
    fsNetIncome: false,
  });

  const userCode = user?.USER_CODE || "ADMIN";

  const toggleModal = (name, isOpen) =>
    setModals((prev) => ({ ...prev, [name]: isOpen }));

  const { data: fsconso = [], isLoading: isListLoading } = useQuery({
    queryKey: ["fsconsoList"],
    queryFn: async () => {
      const { data } = await apiClient.get("/fsconso");
      const raw = data?.data?.[0]?.result || data?.[0]?.result || data?.result;
      return raw ? JSON.parse(raw) : [];
    },
  });

  useEffect(() => {
    const normalized = (fsconso || []).map((row) => ({
      ...row,
      fsType: row.fsType ?? "",
      fsConsoCode: row.fsConsoCode ?? "",
      fsConsoName: row.fsConsoName ?? "",
      acctBalance: row.acctBalance ?? "",
      sumGrp: row.sumGrp ?? "",
      sumOper: row.sumOper ? String(row.sumOper).toUpperCase() : "",
      topLine: row.topLine ? String(row.topLine).toUpperCase() : "",
      bottomLine: row.bottomLine ? String(row.bottomLine).toUpperCase() : "",
      currSign: String(row.currSign || "N").toUpperCase() === "Y" ? "Y" : "N",

      // acctCode: row.acctCode ?? "",
      // acctName: row.acctName ?? "",

      // glRetEarn: row.glRetEarn ?? "",
      // glRetEarnName: row.glRetEarnName ?? "",
      // fsRetEarn: row.fsRetEarn ?? "",
      // fsRetEarnName: row.fsRetEarnName ?? "",
      // fsNetIncome: row.fsNetIncome ?? "",
      // fsNetIncomeName: row.fsNetIncomeName ?? "",

      __isNew: false,
      __isDirty: false,
    }));

    setRows(normalized);

    if (normalized.length > 0 && !selectedRow) {
      const firstKey = normalized[0].fsConsoCode || normalized[0].__tempId;
      setSelectedRow(firstKey);
      setRegistrationInfo({
        registeredBy: normalized[0].registeredBy || "",
        registeredDate: normalized[0].registeredDate || "",
        lastUpdatedBy: normalized[0].lastUpdatedBy || "",
        lastUpdatedDate: normalized[0].lastUpdatedDate || "",
      });
    }
  }, [fsconso]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await useFieldLenghtCheck("FS_CONSOLIDATION");
      if (mounted) setTblFieldArray(res || []);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getMax = (col) => useGetFieldLength(tblFieldArray, col);

  const { mutateAsync: deleteFSConso, isLoading: isDeleting } = useMutation({
    mutationFn: async (payload) => await apiClient.post("/deleteFSConso", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fsconsoList"] });
      useSwalDeleteRecord(
        "Deleted!",
        "The FS Consolidation has been removed from the system."
      );
    },
    onError: (error) => useSwalErrorAlertAPI("Delete Error", error),
  });

  const handleRowSelect = (row) => {
    const rowKey = row.fsConsoCode || row.__tempId;
    setSelectedRow(rowKey);
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
  };

  const openRegistrationModal = (row) => {
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
    setIsRegModalOpen(true);
  };

  const updateRow = (rowKey, field, value) => {
    setRows((prev) =>
      prev.map((row) => {
        const key = row.fsConsoCode || row.__tempId;
        if (key !== rowKey) return row;
        return {
          ...row,
          [field]: value,
          __isDirty: true,
        };
      })
    );
  };

  const addRow = () => {
    const tempId = `NEW-${Date.now()}`;
    const newRow = {
      ...EMPTY_ROW,
      __tempId: tempId,
    };
    setRows((prev) => [newRow, ...prev]);
    setSelectedRow(tempId);
    setRegistrationInfo({
      registeredBy: "",
      registeredDate: "",
      lastUpdatedBy: "",
      lastUpdatedDate: "",
    });
  };

  const resetTable = () => {
    const normalized = (fsconso || []).map((row) => ({
      ...row,
      fsType: row.fsType ?? "",
      fsConsoCode: row.fsConsoCode ?? "",
      fsConsoName: row.fsConsoName ?? "",
      acctBalance: row.acctBalance ?? "",
      sumGrp: row.sumGrp ?? "",
      sumOper: String(row.sumOper || "").toUpperCase(),
      topLine: String(row.topLine || "").toUpperCase(),
      bottomLine: String(row.bottomLine || "").toUpperCase(),
      currSign: String(row.currSign || "N").toUpperCase() === "Y" ? "Y" : "N",

      acctCode: row.acctCode ?? "",
      acctName: row.acctName ?? "",

      glRetEarn: row.glRetEarn ?? "",
      glRetEarnName: row.glRetEarnName ?? "",
      fsRetEarn: row.fsRetEarn ?? "",
      fsRetEarnName: row.fsRetEarnName ?? "",
      fsNetIncome: row.fsNetIncome ?? "",
      fsNetIncomeName: row.fsNetIncomeName ?? "",

      __isNew: false,
      __isDirty: false,
    }));

    setRows(normalized);

    if (normalized.length > 0) {
      const firstKey = normalized[0].fsConsoCode || normalized[0].__tempId;
      setSelectedRow(firstKey);
      setRegistrationInfo({
        registeredBy: normalized[0].registeredBy || "",
        registeredDate: normalized[0].registeredDate || "",
        lastUpdatedBy: normalized[0].lastUpdatedBy || "",
        lastUpdatedDate: normalized[0].lastUpdatedDate || "",
      });
    } else {
      setSelectedRow(null);
      setRegistrationInfo({
        registeredBy: "",
        registeredDate: "",
        lastUpdatedBy: "",
        lastUpdatedDate: "",
      });
    }
  };

  const validateRow = (row) => {
    const missing = [];
    if (!row.fsConsoCode?.trim()) missing.push("FS Conso Code");
    if (!row.fsConsoName?.trim()) missing.push("FS Conso Name");
    if (!row.fsType?.trim()) missing.push("FS Type");

    if (missing.length) {
      useSwalErrorAlert(
        "Validation Error",
        `Please fill in: ${missing.join(", ")}`
      );
      return false;
    }

    return true;
  };

  const checkDuplicate = async (row) => {
    if (!row.__isNew) return false;

    const payload = {
      json_data: {
        fsConsoCode: row.fsConsoCode,
      },
    };

    const response = await apiClient.post("/checkDuplicateFSConso", payload);
    const sqlRow = response?.data?.data?.[0];
    const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
    const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

    return parsedData.result === "1";
  };

  const saveOneRow = async (row) => {
    const payload = {
      json_data: JSON.stringify({
        json_data: {
          fsConsoCode: row.fsConsoCode,
          fsConsoName: row.fsConsoName,
          fsType: row.fsType,
          acctBalance: row.acctBalance,
          sumGrp: row.sumGrp,
          sumOper: row.sumOper,
          topLine: row.topLine,
          bottomLine: row.bottomLine,
          currSign: row.currSign,

          acctCode: row.acctCode,

          glRetEarn: row.glRetEarn,
          fsRetEarn: row.fsRetEarn,
          fsNetIncome: row.fsNetIncome,

          action: row.__isNew ? "ADD" : "EDIT",
          userCode,
        },
      }),
    };

    const response = await apiClient.post("/upsertFSConso", payload);
    const sqlRow = response?.data?.data?.[0];

    if (sqlRow?.errorcount > 0) {
      throw new Error(sqlRow?.errormsg || `Failed to save ${row.fsConsoCode}`);
    }

    const status = response?.data?.status ?? response?.data?.data?.status;
    const success = response?.data?.success || status === "success" || !status;

    if (!success) {
      throw new Error(
        response?.data?.message ||
          response?.data?.data?.message ||
          `Failed to save ${row.fsConsoCode}`
      );
    }
  };

  const handleSaveAll = async () => {
    const dirtyRows = rows.filter((r) => r.__isDirty);

    if (!dirtyRows.length) {
      return useSwalErrorAlert("No Changes", "There are no modified rows to save.");
    }

    try {
      setSavingAll(true);

      for (const row of dirtyRows) {
        if (!validateRow(row)) {
          setSavingAll(false);
          return;
        }

        if (row.__isNew) {
          const isDuplicate = await checkDuplicate(row);
          if (isDuplicate) {
            setSavingAll(false);
            return useSwalErrorAlert(
              "Duplicate Code",
              `FS Conso Code already exists: ${row.fsConsoCode}`
            );
          }
        }

        await saveOneRow(row);
      }

      await queryClient.invalidateQueries({ queryKey: ["fsconsoList"] });
      useSwalSuccessAlert(
        "Success!",
        "All modified FS Consolidation rows were saved."
      );
    } catch (error) {
      useSwalErrorAlertAPI("Save Error", error?.message || error);
    } finally {
      setSavingAll(false);
    }
  };

  const handleDelete = async (row) => {
    try {
      if (row.__isNew) {
        setRows((prev) =>
          prev.filter(
            (r) =>
              (r.fsConsoCode || r.__tempId) !==
              (row.fsConsoCode || row.__tempId)
          )
        );

        if ((row.fsConsoCode || row.__tempId) === selectedRow) {
          setSelectedRow(null);
        }
        return;
      }

      const payload = {
        json_data: {
          fsConsoCode: row.fsConsoCode,
        },
      };

      const response = await apiClient.post("/checkInUsedFSConso", payload);
      const sqlRow = response?.data?.data?.[0];
      const rawJsonString = sqlRow?.result || Object.values(sqlRow || {})[0];
      const parsedData = JSON.parse(rawJsonString || '{"result":"0"}');

      if (parsedData.result === "1") {
        return useSwalErrorAlertAPI(
          `Cannot Delete FS Consolidation Code: ${row.fsConsoCode}`,
          `Code was already used.`
        );
      }

      const confirm = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Are you sure you want to delete Code: ${row.fsConsoCode}?`
      );

      if (!confirm.isConfirmed) return;

      await deleteFSConso(payload);
    } catch (error) {
      useSwalErrorAlertAPI("System Error", error);
    }
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (guideRef.current && !guideRef.current.contains(e.target)) {
        setOpenGuide(false);
      }
    };

    const handleKey = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveAll();
      }
    };

    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [rows]);

  const selectedRowData = useMemo(() => {
    return rows.find((r) => (r.fsConsoCode || r.__tempId) === selectedRow) || null;
  }, [rows, selectedRow]);

  const updateSelectedRowField = (field, value) => {
    if (!selectedRowData) return;
    const rowKey = selectedRowData.fsConsoCode || selectedRowData.__tempId;
    updateRow(rowKey, field, value);
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: <span className="hidden md:inline">Actions</span>,
        width: 110,
        sortable: false,
        render: (row) => (
          <div className="flex gap-1 justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                addRow();
              }}
              className="global-ref-td-button-edit-ui"
              title="Add"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span className="md:hidden">Add</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(row);
              }}
              className="global-ref-td-button-delete-ui"
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              <span className="md:hidden">Delete</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                openRegistrationModal(row);
              }}
              className="global-ref-td-button-reg-ui"
              title="Registration Info"
            >
              <FontAwesomeIcon icon={faClipboardList} />
              <span className="md:hidden">Reg. Info</span>
            </button>
          </div>
        ),
      },
      {
        key: "fsType",
        label: "FS Type",
        width: 170,
        sortable: true,
        autoWidthValue: (row) =>
          row.fsType === "BS"
            ? "Balance Sheet"
            : row.fsType === "IS"
            ? "Income Statement"
            : "",
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <select
              className="w-full min-w-[120px] rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.fsType ?? ""}
              onChange={(e) => updateRow(rowKey, "fsType", e.target.value)}
            >
              <option value=""></option>
              <option value="BS">Balance Sheet</option>
              <option value="IS">Income Statement</option>
            </select>
          );
        },
      },
      {
        key: "fsConsoCode",
        label: "FS Conso Code",
        width: 150,
        sortable: true,
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <input
              className="w-full min-w-[110px] rounded-md border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.fsConsoCode || ""}
              maxLength={getMax("fsConsoCode") || 50}
              disabled={!row.__isNew}
              onChange={(e) =>
                updateRow(rowKey, "fsConsoCode", (e.target.value || "").toUpperCase())
              }
            />
          );
        },
      },
      {
        key: "fsConsoName",
        label: "FS Conso Name",
        width: 350,
        sortable: true,
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <input
              className="w-full min-w-[100px] rounded-md border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.fsConsoName || ""}
              maxLength={getMax("fsConsoName") || 100}
              onChange={(e) => updateRow(rowKey, "fsConsoName", e.target.value)}
            />
          );
        },
      },
      {
        key: "sumGrp",
        label: "Summary Group",
        width: 150,
        sortable: true,
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <input
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.sumGrp || ""}
              maxLength={getMax("sumGrp") || 30}
              onChange={(e) => updateRow(rowKey, "sumGrp", e.target.value)}
            />
          );
        },
      },
      {
        key: "sumOper",
        label: "Summary Operation",
        width: 150,
        sortable: true,
        autoWidthValue: (row) =>
          row.sumOper === "A"
            ? "Added"
            : row.sumOper === "S"
            ? "Subtracted"
            : "",
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.sumOper ?? ""}
              onChange={(e) => updateRow(rowKey, "sumOper", e.target.value)}
            >
              <option value=""></option>
              <option value="A">Added</option>
              <option value="S">Subtracted</option>
            </select>
          );
        },
      },
      // {
      //   key: "topLine",
      //   label: "Top Line",
      //   width: 120,
      //   sortable: true,
      //   autoWidthValue: (row) =>
      //     row.topLine === "S" ? "Single" : row.topLine === "D" ? "Double" : "",
      //   render: (row) => {
      //     const rowKey = row.fsConsoCode || row.__tempId;
      //     return (
      //       <select
      //         className="w-full rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      //         value={row.topLine ?? ""}
      //         onChange={(e) => updateRow(rowKey, "topLine", e.target.value)}
      //       >
      //         <option value=""></option>
      //         <option value="S">Single</option>
      //         <option value="D">Double</option>
      //       </select>
      //     );
      //   },
      // },
      {
        key: "bottomLine",
        label: "Bottom Line",
        width: 150,
        sortable: true,
        autoWidthValue: (row) =>
          row.bottomLine === "S" ? "Single" : row.bottomLine === "D" ? "Double" : "",
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.bottomLine ?? ""}
              onChange={(e) => updateRow(rowKey, "bottomLine", e.target.value)}
            >
              <option value=""></option>
              <option value="S">Single</option>
              <option value="D">Double</option>
            </select>
          );
        },
      },
      {
        key: "currSign",
        label: "Curr Sign",
        width: 100,
        sortable: true,
        autoWidthValue: (row) =>
          row.currSign === "Y" ? "Yes" : row.currSign === "N" ? "No" : "",
        render: (row) => {
          const rowKey = row.fsConsoCode || row.__tempId;
          return (
            <select
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
              value={row.currSign ?? "N"}
              onChange={(e) => updateRow(rowKey, "currSign", e.target.value)}
            >
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          );
        },
      },
    ],
    [rows, tblFieldArray]
  );

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || isDeleting || savingAll) && <LoadingSpinner />}

      <div className="global-ref-header-ui">
        <div className="w-full flex flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="w-full md:w-auto flex">
            <h1 className="global-ref-headertext-ui w-full md:w-auto truncate text-center md:text-left">
              FS Consolidation
            </h1>
          </div>

          <div className="w-full md:justify-center flex">
            {embedded && tabs?.length > 0 ? (
              <div className="w-full md:w-auto">
                <div className="flex flex-nowrap overflow-x-auto no-scrollbar border-b border-blue-300 dark:border-gray-700">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`shrink-0 whitespace-nowrap px-3 py-1 sm:py-2 sm:px-4 text-[10px] sm:text-[13px] font-bold transition-all border-b-2 rounded-md ${
                        activeTab === tab.id
                          ? "border-blue-700 text-blue-700 bg-blue-50/50"
                          : "border-transparent text-gray-500 hover:text-blue-500"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full md:justify-center flex" />
            )}
          </div>

          <div className="w-full md:w-auto flex md:justify-end">
            <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2 flex-wrap">
              <ButtonBar
                buttons={[
                  {
                    key: "save",
                    label: <span className="sm:inline ml-1">Save</span>,
                    icon: faSave,
                    onClick: handleSaveAll,
                    className:
                      "flex items-center justify-center h-7 w-14 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                  {
                    key: "reset",
                    label: <span className="sm:inline ml-1">Reset</span>,
                    icon: faUndo,
                    onClick: resetTable,
                    className:
                      "flex items-center justify-center h-7 w-14 sm:w-auto sm:h-8 sm:px-4 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all",
                  },
                ]}
              />

              <div ref={guideRef} className="relative">
                <button
                  onClick={() => setOpenGuide((v) => !v)}
                  className="bg-blue-600 text-white h-7 w-14 sm:w-auto sm:h-8 sm:px-4 rounded-md flex items-center justify-center gap-1 hover:bg-blue-700 transition-all"
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="text-[12px]" />
                  <span className="sm:inline ml-1 text-[11px] font-medium">Info</span>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className="hidden sm:inline text-[10px] opacity-80"
                  />
                </button>

                {isOpenGuide && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md shadow-xl bg-white ring-1 ring-black/10 z-[60] dark:bg-gray-800 overflow-hidden">
                    <button
                      onClick={() => {
                        window.open(pdfLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900 border-b border-gray-100 dark:border-gray-700"
                    >
                      <FontAwesomeIcon icon={faFilePdf} className="mr-2 text-red-500" />
                      PDF Guide
                    </button>
                    <button
                      onClick={() => {
                        window.open(videoLink, "_blank");
                        setOpenGuide(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-xs hover:bg-blue-50 dark:hover:bg-blue-900"
                    >
                      <FontAwesomeIcon icon={faVideo} className="mr-2 text-blue-500" />
                      Video Guide
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

<div className="mt-20 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  <FieldRenderer
  label="GL Retained Earnings"
  type="lookup"
  value={
    selectedRowData?.glRetEarn
      ? `(${selectedRowData.glRetEarn}) - ${selectedRowData.glRetEarnName || ""}`
      : ""
  }
  onLookup={() => {
    if (!selectedRowData) return;
    toggleModal("glRetEarn", true);
  }}
  readOnly
/>

<FieldRenderer
  label="FS Retained Earnings"
  type="lookup"
  value={
    selectedRowData?.fsRetEarn
      ? `(${selectedRowData.fsRetEarn}) - ${selectedRowData.fsRetEarnName || ""}`
      : ""
  }
  onLookup={() => {
    if (!selectedRowData) return;
    toggleModal("fsRetEarn", true);
  }}
  readOnly
/>

<FieldRenderer
  label="FS Net Income"
  type="lookup"
  value={
    selectedRowData?.fsNetIncome
      ? `(${selectedRowData.fsNetIncome}) - ${selectedRowData.fsNetIncomeName || ""}`
      : ""
  }
  onLookup={() => {
    if (!selectedRowData) return;
    toggleModal("fsNetIncome", true);
  }}
  readOnly
/>
</div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="global-tran-table-main-div-ui">
          <SearchGlobalReferenceTable
            docType={DOC_TYPE}
            columns={columns}
            data={rows}
            isLoading={isListLoading}
            itemsPerPage={500}
            showFilters={true}
            onRowDoubleClick={handleRowSelect}
            onRowClick={handleRowSelect}
            selectedRowKey={selectedRow}
            rowKeyField="fsConsoCode"
            // autoFillGrid="True"
          />
        </div>
      </div>

      {isRegModalOpen && (
        <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-[1px] flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <RegistrationInfo layout="stacked" data={registrationInfo} />
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setIsRegModalOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

<SearchCOAMast
  isOpen={modals.glRetEarn}
  onClose={(v) => {
    toggleModal("glRetEarn", false);
    if (!v || !selectedRowData) return;
    updateSelectedRowField("glRetEarn", v.acctCode || "");
    updateSelectedRowField("glRetEarnName", v.acctName || "");
  }}
/>

<SearchFSConso
  isOpen={modals.fsRetEarn}
  customParam="BS"
  onClose={(v) => {
    toggleModal("fsRetEarn", false);
    if (!v || !selectedRowData) return;
    updateSelectedRowField("fsRetEarn", v.fsConsoCode || "");
    updateSelectedRowField("fsRetEarnName", v.fsConsoName || "");
  }}
/>

<SearchFSConso
  isOpen={modals.fsNetIncome}
  customParam="IS"
  onClose={(v) => {
    toggleModal("fsNetIncome", false);
    if (!v || !selectedRowData) return;
    updateSelectedRowField("fsNetIncome", v.fsConsoCode || "");
    updateSelectedRowField("fsNetIncomeName", v.fsConsoName || "");
  }}
/>

    </div>
  );
});

export default FSConsolidation;