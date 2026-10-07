import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEdit,
  faPlus,
  faSave,
  faTrashAlt,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import { reftables } from "@/NAYSA Cloud/Global/reftable";
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
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import FieldRenderer from "@/NAYSA Cloud/Global/FieldRenderer";
import RegistrationInfo from "@/NAYSA Cloud/Global/RegistrationInfo.jsx";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";
import SearchCOAMast from "@/NAYSA Cloud/Lookup/SearchCOAMast";

const INITIAL_FORM = {
  rfpCode: "",
  rfpName: "",
  acctCode: "",
  acctName: "",
  active: "Y",
};

const INITIAL_REGISTRATION = {
  registeredBy: "",
  registeredDate: "",
  lastUpdatedBy: "",
  lastUpdatedDate: "",
};

const parseResult = (response, fallback = []) => {
  const raw = response?.data?.data?.[0]?.result ?? response?.data?.result;
  if (!raw) return fallback;

  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
};

const RFPCodeRef = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const formTopRef = useRef(null);
  const docType = "RFPCodeRef";

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [registrationInfo, setRegistrationInfo] = useState(
    INITIAL_REGISTRATION,
  );
  const [selectedCode, setSelectedCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [tableFields, setTableFields] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const { data: rfpCodes = [], isLoading: isListLoading } = useQuery({
    queryKey: ["rfpCodeList"],
    queryFn: async () => {
      const response = await apiClient.get("/rfpCode");
      return parseResult(response);
    },
    staleTime: 0,
  });

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setRegistrationInfo(INITIAL_REGISTRATION);
    setSelectedCode("");
    setIsEditing(false);
  };

  const saveMutation = useMutation({
    mutationFn: (payload) => apiClient.post("/upsertRFPCode", payload),
    onSuccess: (response) => {
      const row = response?.data?.data?.[0];
      if (!response?.data?.success || Number(row?.errorcount || 0) > 0) {
        useSwalErrorAlert(
          "Request for Payment Code",
          row?.errormsg || response?.data?.errormsg || "Unable to save record.",
        );
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["rfpCodeList"] });
      useSwalSuccessAlert(
        "Saved",
        "Request for Payment Code saved successfully.",
      );
      resetForm();
    },
    onError: (error) => useSwalErrorAlertAPI("Save Failed", error),
  });

  const updateForm = (changes) =>
    setFormData((current) => ({ ...current, ...changes }));

  const handleAdd = () => {
    resetForm();
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleEdit = (row) => {
    setSelectedCode(row.rfpCode || "");
    setFormData({
      rfpCode: row.rfpCode || "",
      rfpName: row.rfpName || "",
      acctCode: row.acctCode || "",
      acctName: row.acctName || "",
      active: row.active || "Y",
    });
    setRegistrationInfo({
      registeredBy: row.registeredBy || "",
      registeredDate: row.registeredDate || "",
      lastUpdatedBy: row.lastUpdatedBy || "",
      lastUpdatedDate: row.lastUpdatedDate || "",
    });
    setIsEditing(true);
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleCodeBlur = async () => {
    const rfpCode = formData.rfpCode.trim();
    if (!rfpCode || selectedCode) return;

    try {
      const response = await apiClient.post("/checkDuplicateRFPCode", {
        json_data: { rfpCode },
      });
      const result = parseResult(response, { result: "0" });
      if (String(result?.result) === "1") {
        useSwalErrorAlert(
          "Duplicate Code",
          `Request for Payment Code ${rfpCode} already exists.`,
        );
        updateForm({ rfpCode: "" });
      }
    } catch (error) {
      useSwalErrorAlertAPI("Validation Failed", error);
    }
  };

  const handleSave = () => {
    const rfpCode = formData.rfpCode.trim();
    const rfpName = formData.rfpName.trim();
    const acctCode = formData.acctCode.trim();

    if (!rfpCode || !rfpName || !acctCode) {
      useSwalErrorAlert(
        "Required Fields",
        "Request for Payment Code, Description, and GL Account are required.",
      );
      return;
    }

    saveMutation.mutate({
      json_data: JSON.stringify({
        json_data: {
          ...formData,
          rfpCode,
          rfpName,
          acctCode,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      }),
    });
  };

  const handleDelete = async (row) => {
    setIsWorking(true);
    try {
      const payload = { json_data: { rfpCode: row.rfpCode } };
      const inUseResponse = await apiClient.post(
        "/checkInUsedRFPCode",
        payload,
      );
      const inUse = parseResult(inUseResponse, { result: "0" });

      if (String(inUse?.result) === "1") {
        useSwalErrorAlert(
          "Cannot Delete",
          `Request for Payment Code ${row.rfpCode} is already used in a transaction.`,
        );
        return;
      }

      const confirmation = await useSwalDeleteConfirm(
        "Confirm Delete",
        `Delete Request for Payment Code ${row.rfpCode}?`,
      );
      if (!confirmation?.isConfirmed) return;

      await apiClient.post("/deleteRFPCode", {
        json_data: {
          rfpCode: row.rfpCode,
          rfpName: row.rfpName,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["rfpCodeList"] });
      useSwalDeleteRecord(
        "Deleted",
        "Request for Payment Code was removed.",
      );
      resetForm();
    } catch (error) {
      useSwalErrorAlertAPI("Delete Failed", error);
    } finally {
      setIsWorking(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "__actions",
        label: "Actions",
        width: 90,
        render: (row) => (
          <div className="flex w-full justify-center gap-2">
            <button
              type="button"
              className="global-ref-td-button-edit-ui"
              onClick={() => handleEdit(row)}
              title="Edit"
            >
              <FontAwesomeIcon icon={faEdit} />
            </button>
            <button
              type="button"
              className="global-ref-td-button-delete-ui"
              onClick={() => handleDelete(row)}
              title="Delete"
            >
              <FontAwesomeIcon icon={faTrashAlt} />
            </button>
          </div>
        ),
      },
      {
        key: "rfpCode",
        label: "RFP Code",
        sortable: true,
        pinned: true,
        width: 140,
      },
      {
        key: "rfpName",
        label: "Description",
        sortable: true,
        width: 420,
      },
      {
        key: "acctCode",
        label: "GL Account",
        sortable: true,
        width: 130,
      },
      {
        key: "acctName",
        label: "Account Name",
        sortable: true,
        width: 260,
      },
      {
        key: "active",
        label: "Active",
        sortable: true,
        width: 100,
        render: (row) => (row.active === "Y" ? "Yes" : "No"),
      },
    ],
    [user],
  );

  useEffect(() => {
    useFieldLenghtCheck("rfpcode_ref").then((fields) =>
      setTableFields(fields || []),
    );
  }, []);

  const getMaxLength = (column) => useGetFieldLength(tableFields, column);

  return (
    <div className="global-ref-main-div-ui">
      {(isListLoading || saveMutation.isPending || isWorking) && (
        <LoadingSpinner />
      )}

      <SearchCOAMast
        isOpen={showAccountModal}
        onClose={(row) => {
          setShowAccountModal(false);
          if (row) {
            updateForm({
              acctCode: row.acctCode || "",
              acctName: row.acctName || "",
            });
          }
        }}
      />

      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col items-center md:grid md:grid-cols-2">
          <h1 className="global-ref-headertext-ui">
            {reftables[docType] || "Request for Payment Codes"}
          </h1>
          <div className="flex flex-wrap justify-end gap-2">
            <ButtonBar
              buttons={[
                {
                  key: "add",
                  label: <span className="ml-1 sm:inline">Add</span>,
                  icon: faPlus,
                  onClick: handleAdd,
                  className:
                    "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                },
                {
                  key: "save",
                  label: <span className="ml-1 sm:inline">Save</span>,
                  icon: faSave,
                  onClick: handleSave,
                  disabled: !isEditing || saveMutation.isPending,
                  className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium text-white transition-all sm:h-8 sm:w-auto sm:px-4 ${
                    !isEditing || saveMutation.isPending
                      ? "cursor-not-allowed bg-blue-500 opacity-50"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`,
                },
                {
                  key: "reset",
                  label: <span className="ml-1 sm:inline">Reset</span>,
                  icon: faUndo,
                  onClick: resetForm,
                  className:
                    "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div ref={formTopRef} className="mt-24 flex flex-col lg:flex-row gap-2">
        <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FieldRenderer
              label="RFP Code"
              required
              value={formData.rfpCode}
              disabled={!isEditing || Boolean(selectedCode)}
              onChange={(value) => updateForm({ rfpCode: value.toUpperCase() })}
              onBlur={handleCodeBlur}
              maxLength={getMaxLength("rfp_code")}
            />
            <FieldRenderer
              label="Description"
              required
              value={formData.rfpName}
              disabled={!isEditing}
              onChange={(value) => updateForm({ rfpName: value })}
              maxLength={getMaxLength("rfp_name")}
            />
          </div>
          <div className="space-y-6">
            <FieldRenderer
              label="Active"
              type="select"
              value={formData.active}
              disabled={!isEditing}
              options={[
                { value: "Y", label: "Yes" },
                { value: "N", label: "No" },
              ]}
              onChange={(value) => updateForm({ active: value })}
            />
            <FieldRenderer
              label="Account Code"
              required
              type="lookup"
              value={
                formData.acctCode && formData.acctName
                  ? `${formData.acctCode} - ${formData.acctName}`
                  : formData.acctCode
              }
              disabled={!isEditing}
              onLookup={() => setShowAccountModal(true)}
              readOnly
            />
          </div>
        </div>
        <div className="w-full lg:w-[320px]">
          <RegistrationInfo layout="stacked" data={registrationInfo} />
        </div>
      </div>

      <div className="global-tran-table-main-div-ui mt-4">
        <SearchGlobalReferenceTable
          docType={docType}
          columns={columns}
          data={rfpCodes}
          onRowDoubleClick={handleEdit}
          itemsPerPage={200}
          isLoading={isListLoading}
          onRefresh={() =>
            queryClient.invalidateQueries({ queryKey: ["rfpCodeList"] })
          }
          autoFillGrid
        />
      </div>
    </div>
  );
};

export default RFPCodeRef;
