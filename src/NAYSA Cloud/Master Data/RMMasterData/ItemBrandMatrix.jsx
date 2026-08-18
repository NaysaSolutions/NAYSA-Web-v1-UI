import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faSave,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { useAuth } from "@/NAYSA Cloud/Authentication/AuthContext.jsx";
import {
  useSwalErrorAlert,
  useSwalErrorAlertAPI,
  useSwalSuccessAlert,
} from "@/NAYSA Cloud/Global/behavior.jsx";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable.jsx";

const ITEM_LIST_ENDPOINT = "/rmMast";
const BRAND_LIST_ENDPOINT = "/brand";
const ITEM_BRAND_MATCHING_ENDPOINT = "/itemBrandMatrix";
const ITEM_BRAND_MATCHING_UPSERT_ENDPOINT = "/upsertItemBrandMatrix";

const pick = (row, keys, fallback = "") => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
};

const parseRows = (payload) => {
  const data = payload?.data ?? payload;
  const rows = Array.isArray(data) ? data : [];
  const firstResult = rows?.[0]?.result ?? rows?.[0]?.Result;

  if (typeof firstResult === "string") {
    try {
      const parsed = JSON.parse(firstResult);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return rows;
};

const parseSprocJsonResult = (rows) => {
  if (!rows) return [];

  const result = rows?.[0]?.result ?? rows?.[0]?.Result;
  if (typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(rows) && rows.length && typeof rows[0] === "object") {
    return rows;
  }

  return [];
};

const isMatchedValue = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["1", "true", "y", "yes"].includes(normalized);
};

const normalizeItemRow = (row, index) => {
  const itemCode = String(
    pick(row, ["itemCode", "ITEM_CODE", "item_code", "code", "CODE"])
  ).trim();
  const itemName = String(
    pick(row, ["itemName", "itemDesc", "ITEM_NAME", "item_name", "rmName", "RM_NAME"])
  ).trim();
  const categoryCode = String(
    pick(row, ["categoryCode", "categCode", "CATEG_CODE", "category_code"])
  ).trim();

  return {
    ...row,
    id: itemCode || String(index),
    itemCode,
    itemName,
    categoryCode,
  };
};

const normalizeBrandRow = (row, index) => {
  const brandCode = String(
    pick(row, ["brandCode", "BRAND_CODE", "brand_code", "brand", "BRAND"])
  ).trim();
  const brandName = String(
    pick(row, ["brandName", "BRAND_NAME", "brand_name", "brandDesc", "BRAND_DESC"])
  ).trim();

  return {
    ...row,
    id: brandCode || String(index),
    brandCode,
    brandName,
    value: pick(row, ["value", "VALUE", "isMatched", "matched"], false),
    itemCode: String(pick(row, ["itemCode", "ITEM_CODE", "item_code"])).trim(),
  };
};

export default function ItemBrandMatrix({ embedded = false }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedItemCode, setSelectedItemCode] = useState(null);
  const [selectedItemRow, setSelectedItemRow] = useState(null);
  const [selectedBrandCodes, setSelectedBrandCodes] = useState([]);
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [isMatchingLoaded, setIsMatchingLoaded] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  useEffect(() => {
    document.title = "Item/Brand Matrix";
  }, []);

  const itemQuery = useQuery({
    queryKey: ["itemBrandItemMaster"],
    queryFn: async () => {
      const response = await apiClient.get(ITEM_LIST_ENDPOINT);
      return parseSprocJsonResult(response?.data?.data).map(normalizeItemRow);
    },
  });

  const brandQuery = useQuery({
    queryKey: ["brandMasterList"],
    queryFn: async () => {
      const response = await apiClient.get(BRAND_LIST_ENDPOINT);
      return parseRows(response?.data).map(normalizeBrandRow);
    },
  });

  const matchingQuery = useQuery({
    queryKey: ["itemBrandMatching", selectedItemCode],
    enabled: !!selectedItemCode,
    queryFn: async () => {
      const response = await apiClient.get(ITEM_BRAND_MATCHING_ENDPOINT, {
        params: {
          mode: "Load_itemBrandMatrix",
          itemCode: selectedItemCode,
        },
      });

      return parseRows(response?.data).map(normalizeBrandRow);
    },
  });

  const itemRows = useMemo(() => itemQuery.data || [], [itemQuery.data]);
  const brandRows = useMemo(() => brandQuery.data || [], [brandQuery.data]);
  const matchingRows = useMemo(() => matchingQuery.data || [], [matchingQuery.data]);

  const brandByCode = useMemo(
    () =>
      new Map(
        brandRows
          .filter((row) => row.brandCode)
          .map((row) => [row.brandCode, row])
      ),
    [brandRows]
  );

  const selectedItem = useMemo(
    () => selectedItemRow || itemRows.find((row) => row.itemCode === selectedItemCode) || null,
    [itemRows, selectedItemCode, selectedItemRow]
  );

  const displayedBrandRows = useMemo(() => {
    if (!selectedItemCode || !isMatchingLoaded) return [];

    if (!showAllBrands) {
      return matchingRows.map((matchedRow) => {
        const masterRow = brandByCode.get(matchedRow.brandCode);

        return {
          ...masterRow,
          ...matchedRow,
          brandCode: matchedRow.brandCode,
          brandName: matchedRow.brandName || masterRow?.brandName || "",
        };
      });
    }

    const matchingByBrandCode = new Map(
      matchingRows
        .filter((row) => row.brandCode)
        .map((row) => [row.brandCode, row])
    );

    return brandRows.map((brand) => {
      const matchedRow = matchingByBrandCode.get(brand.brandCode);

      return {
        ...brand,
        ...matchedRow,
        brandCode: brand.brandCode,
        brandName: brand.brandName || matchedRow?.brandName || "",
      };
    });
  }, [brandByCode, brandRows, isMatchingLoaded, matchingRows, selectedItemCode, showAllBrands]);

  const allDisplayedBrandCodes = useMemo(
    () => displayedBrandRows.map((row) => row.brandCode).filter(Boolean),
    [displayedBrandRows]
  );

  const isAllBrandsSelected = useMemo(() => {
    if (!allDisplayedBrandCodes.length) return false;
    return allDisplayedBrandCodes.every((code) => selectedBrandCodes.includes(code));
  }, [allDisplayedBrandCodes, selectedBrandCodes]);

  const isBusy =
    itemQuery.isLoading ||
    itemQuery.isFetching ||
    brandQuery.isLoading ||
    brandQuery.isFetching ||
    matchingQuery.isLoading ||
    matchingQuery.isFetching ||
    isLoadingAction;

  useEffect(() => {
    if (!isMatchingLoaded) return;

    const matchedCodes =
      showAllBrands
        ? matchingRows
            .filter(
              (row) =>
                isMatchedValue(row.value) ||
                String(row.itemCode || "").trim() === String(selectedItemCode || "").trim()
            )
            .map((row) => row.brandCode)
            .filter(Boolean)
        : matchingRows.map((row) => row.brandCode).filter(Boolean);

    setSelectedBrandCodes(matchedCodes);
  }, [isMatchingLoaded, matchingRows, selectedItemCode, showAllBrands]);

  const refreshRows = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["itemBrandItemMaster"] }),
      queryClient.invalidateQueries({ queryKey: ["brandMasterList"] }),
      queryClient.invalidateQueries({ queryKey: ["itemBrandMatching"] }),
    ]);
  };

  const resetPage = () => {
    setSelectedItemCode(null);
    setSelectedItemRow(null);
    setSelectedBrandCodes([]);
    setShowAllBrands(false);
    setIsMatchingLoaded(false);
  };

  const handleSelectItem = (row) => {
    setSelectedItemCode(row?.itemCode || "");
    setSelectedItemRow(row || null);
    setSelectedBrandCodes([]);
    setShowAllBrands(false);
    setIsMatchingLoaded(true);
  };

  const handleShowAllBrands = () => {
    if (!selectedItemCode) {
      return useSwalErrorAlert("Validation Error", "Please select an Item first.");
    }

    setShowAllBrands(true);
    setIsMatchingLoaded(true);
  };

  const toggleBrandSelection = (brandCode) => {
    setSelectedBrandCodes((previous) =>
      previous.includes(brandCode)
        ? previous.filter((code) => code !== brandCode)
        : [...previous, brandCode]
    );
  };

  const handleToggleSelectAllBrands = () => {
    setSelectedBrandCodes(isAllBrandsSelected ? [] : allDisplayedBrandCodes);
  };

  const handleSaveMatching = async () => {
    if (!selectedItemCode) {
      return useSwalErrorAlert("Validation Error", "Please select an Item.");
    }

    if (!showAllBrands) {
      return useSwalErrorAlert(
        "Validation Error",
        "Please click Show All Brands first."
      );
    }

    setIsLoadingAction(true);

    try {
      const payload = {
        json_data: {
          itemCode: selectedItemCode,
          brandCodes: selectedBrandCodes,
          userCode: user?.USER_CODE || user?.userCode || "ADMIN",
        },
      };

      const response = await apiClient.post(ITEM_BRAND_MATCHING_UPSERT_ENDPOINT, payload);
      const errorCount = Number(response?.data?.errorcount ?? 0);
      const errorMessage = response?.data?.errormsg || "";

      if (errorCount > 0) {
        return useSwalErrorAlert(
          "Error",
          errorMessage || "Failed to save Item - Brand Matching."
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["itemBrandMatching"] });
      setShowAllBrands(false);
      return useSwalSuccessAlert("Success!", "Item - brand matching saved successfully.");
    } catch (error) {
      return useSwalErrorAlertAPI("System Error", error);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const itemColumns = useMemo(
    () => [
      {
        key: "itemCode",
        label: "Item Code",
        sortable: true,
        width: 130,
        requiredVisible: true,
      },
      {
        key: "itemName",
        label: "Item Name",
        sortable: true,
        width: 300,
        requiredVisible: true,
      },
      {
        key: "categoryCode",
        label: "Category",
        sortable: true,
        width: 120,
      },
    ],
    []
  );

  const brandColumns = useMemo(
    () => [
      {
        key: "__check",
        label: (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={isAllBrandsSelected}
              onChange={handleToggleSelectAllBrands}
              className="h-4 w-4 accent-blue-600"
              title={isAllBrandsSelected ? "Deselect All" : "Select All"}
            />
          </div>
        ),
        sortable: false,
        width: 36,
        minWidth: 36,
        render: (row) => (
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={selectedBrandCodes.includes(row.brandCode)}
              onChange={() => toggleBrandSelection(row.brandCode)}
              className="h-5 w-4 accent-blue-600"
            />
          </div>
        ),
      },
      {
        key: "brandCode",
        label: "Brand Code",
        sortable: true,
        width: 140,
        requiredVisible: true,
      },
      {
        key: "brandName",
        label: "Brand Name",
        sortable: true,
        width: 320,
        requiredVisible: true,
      },
    ],
    [isAllBrandsSelected, selectedBrandCodes]
  );

  return (
    <div className="global-ref-main-div-ui">
      {isBusy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-4 border-blue-100 dark:border-gray-700" />
              <div className="absolute left-0 top-0 h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
            <span className="animate-pulse text-sm font-semibold">
              {isLoadingAction ? "Processing..." : "Loading..."}
            </span>
          </div>
        </div>
      )}

      {!embedded && (
      <div className="global-ref-header-ui">
        <div className="flex w-full flex-col gap-3 md:grid md:grid-cols-3 md:items-center md:gap-0">
          <div className="flex w-full md:w-auto md:justify-start">
            <h1 className="global-ref-headertext-ui w-full truncate text-center md:w-auto md:text-left">
              Item/Brand Matrix
            </h1>
          </div>

          <div className="hidden w-full justify-center md:flex" />

          <div className="flex w-full justify-center md:w-auto md:justify-end">
            <ButtonBar
              buttons={[
                {
                  key: "save",
                  label: <span className="ml-1 sm:inline">Save</span>,
                  icon: faSave,
                  onClick: handleSaveMatching,
                  disabled: !selectedItemCode || !showAllBrands || isLoadingAction,
                  className: `flex h-7 w-16 items-center justify-center rounded-md text-[11px] font-medium transition-all sm:h-8 sm:w-auto sm:px-4 ${
                    !selectedItemCode || !showAllBrands || isLoadingAction
                      ? "cursor-not-allowed bg-blue-500 text-white opacity-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`,
                },
                {
                  key: "reset",
                  label: <span className="ml-1 sm:inline">Reset</span>,
                  icon: faUndo,
                  onClick: resetPage,
                  className:
                    "flex h-7 w-16 items-center justify-center rounded-md bg-blue-600 text-[11px] font-medium text-white transition-all hover:bg-blue-700 sm:h-8 sm:w-auto sm:px-4",
                },
              ]}
            />
          </div>
        </div>
      </div>
      )}

      <div className="mt-24 flex h-auto w-full flex-col items-stretch gap-4 px-4 xl:flex-row">
        <div className="flex min-w-0 w-full xl:w-[50%]">
          <div className="flex h-full w-full flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 text-sm font-semibold text-blue-700">
              RM Inventory Item Master Data
            </div>

            <SearchGlobalReferenceTable
              docType="RM Inventory Item Master Data"
              columns={itemColumns}
              data={itemRows}
              isLoading={itemQuery.isLoading}
              isFetching={itemQuery.isFetching}
              onRowClick={handleSelectItem}
              onRowDoubleClick={handleSelectItem}
              itemsPerPage={50}
              tableSize="Half"
              showFilters
              showGlobalSearch
              showGroupBy={false}
              showPagination={true}
              onRefresh={refreshRows}
            />
          </div>
        </div>

        <div className="flex min-w-0 w-full flex-col rounded-xl border border-gray-100 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800 xl:w-[50%]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-lg font-semibold text-blue-800">
              Brand Matching
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleShowAllBrands}
                disabled={!selectedItemCode || isLoadingAction}
                className={`h-8 rounded-md px-4 text-xs font-medium transition-all ${
                  !selectedItemCode || isLoadingAction
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                }`}
              >
                <FontAwesomeIcon icon={faEye} className="mr-2" />
                Show All Brands
              </button>

              <button
                type="button"
                onClick={handleSaveMatching}
                disabled={!selectedItemCode || !showAllBrands || isLoadingAction}
                className={`h-8 rounded-md px-4 text-xs font-medium transition-all ${
                  !selectedItemCode || !showAllBrands || isLoadingAction
                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Save Matching
              </button>
            </div>
          </div>

          <div className="mb-2 text-sm font-semibold text-blue-800">
            <span className="block rounded-md bg-blue-100 px-2 py-1.5 text-sm font-extrabold text-blue-800">
              Item - {selectedItem?.itemCode || "No Item Selected"}
              {selectedItem?.itemName ? ` / ${selectedItem.itemName}` : ""}
            </span>
          </div>

          <SearchGlobalReferenceTable
            docType="Item Brand Matching"
            columns={brandColumns}
            data={displayedBrandRows}
            itemsPerPage={300}
            tableSize="Half"
            isLoading={matchingQuery.isLoading || brandQuery.isLoading}
            isFetching={matchingQuery.isFetching || brandQuery.isFetching}
            onRefresh={refreshRows}
            showGroupBy={false}
            showPagination={false}
          />
        </div>
      </div>
    </div>
  );
}
