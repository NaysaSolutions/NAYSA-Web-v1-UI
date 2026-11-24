import React, { useEffect, useMemo, useState } from "react";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import SearchGlobalLookupv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";

const columns = [
  { key: "cjoNo", label: "CJO No.", sortable: true },
  { key: "cjoDate", label: "CJO Date", sortable: true, type: "date" },
  { key: "vjeNo", label: "VJE No.", sortable: true },
  { key: "custCode", label: "Customer Code", sortable: true },
  { key: "custName", label: "Customer Name", sortable: true },
  { key: "plateNo", label: "Plate No.", sortable: true },
  { key: "makeName", label: "Make", sortable: true },
  { key: "modelName", label: "Model", sortable: true },
  { key: "typeName", label: "Vehicle Type", sortable: true },
  { key: "cjoAmount", label: "CJO Amount", sortable: true, type: "number", format: 2 },
  { key: "processingStatus", label: "Processing Status", sortable: true },
  { key: "status", label: "Document Status", sortable: true },
  { key: "cjoId", label: "CJO ID", hidden: true },
  { key: "groupId", label: "Group ID", hidden: true },
];

const unwrapRows = (response) => {
  const raw =
    response?.data?.data?.[0]?.result ??
    response?.data?.result ??
    response?.data?.data ??
    response?.data;

  if (!raw) return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const SearchCJOOpen = ({
  isOpen,
  branchCode,
  onCancel,
  onClose,
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const normalizedBranch = useMemo(
    () => String(branchCode || "").trim(),
    [branchCode]
  );

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadOpenCJO = async () => {
      setLoading(true);

      try {
        const response = await apiClient.post("/getCJOOpenLookup", {
          json_data: {
            branchCode: normalizedBranch,
          },
        });

        if (!mounted) return;

        setRows(unwrapRows(response));
      } catch (error) {
        console.error("Unable to load open CJO lookup:", error);

        if (mounted) {
          setRows([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOpenCJO();

    return () => {
      mounted = false;
    };
  }, [isOpen, normalizedBranch]);

  if (!isOpen) return null;

  return (
    <>
      <SearchGlobalLookupv1
        isOpen={isOpen}
        title="Open Vehicle Job Order (CJO)"
        endpoint={columns}
        data={rows}
        singleSelect
        btnCaption="Select CJO"
        onClose={(payload) => {
          const selected =
            payload?.records?.[0] ??
            rows.find((row) =>
              (payload?.data || []).includes(row.groupId)
            );

          if (selected) {
            onClose?.(selected);
          }
        }}
        onCancel={onCancel}
        modalMaxWidthClass="max-w-[92rem]"
        exportFileName="Open_CJO"
        preferenceKey="SearchCJOOpen:SVI"
      />

      {loading && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-white/40">
          <LoadingSpinner />
        </div>
      )}
    </>
  );
};

export default SearchCJOOpen;
