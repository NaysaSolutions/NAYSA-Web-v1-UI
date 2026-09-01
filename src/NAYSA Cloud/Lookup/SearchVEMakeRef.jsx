// src/NAYSA Cloud/Lookup/SearchVEMakeRef.jsx

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faChevronLeft,
  faChevronRight,
  faEraser,
  faSearch,
  faSort,
  faSpinner,
  faSyncAlt,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";

/* ============================================================
   DEBOUNCE
   ============================================================ */

function useDebounce(value, delay) {
  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  useEffect(() => {
    const handler = setTimeout(
      () => setDebouncedValue(value),
      delay
    );

    return () =>
      clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/* ============================================================
   RESPONSE HELPER
   ============================================================ */

const extractRows = (payload) => {
  const res =
    payload?.data?.data?.[0]?.result ??
    payload?.data?.result ??
    payload?.data?.data;

  if (!res) {
    return [];
  }

  if (Array.isArray(res)) {
    return res;
  }

  if (typeof res === "string") {
    try {
      return JSON.parse(res) || [];
    } catch {
      return [];
    }
  }

  return [];
};

/* ============================================================
   NORMALIZE
   ============================================================ */

const normalizeMake = (row = {}) => ({
  code:
    row.code ??
    row.makeCode ??
    row.make_code ??
    row.MAKE_CODE ??
    "",

  description:
    row.description ??
    row.makeName ??
    row.make_name ??
    row.MAKE_NAME ??
    "",
});

/* ============================================================
   COMPONENT
   ============================================================ */

const SearchVEMakeRef = ({
  isOpen,
  onClose,
  customParam = "",
  title = "Search Vehicle Make",
  withPagination = false,
}) => {
  /* ============================================================
     FILTERS
     ============================================================ */

  const [
    filters,
    setFilters,
  ] = useState({
    code: "",
    description: "",
  });

  const [
    sortConfig,
    setSortConfig,
  ] = useState({
    key: "",
    direction: "asc",
  });

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /*
   * Same behavior as SearchBranchRef:
   * - 100 rows per page when pagination is enabled
   * - effectively all records when pagination is disabled
   */
  const pageSize =
    withPagination
      ? 100
      : 999999;

  const hasActiveFilters =
    Object.values(filters).some(
      (value) => value !== ""
    );

  const resetFilters = () =>
    setFilters({
      code: "",
      description: "",
    });

  const debouncedFilters =
    useDebounce(
      filters,
      300
    );

  /*
   * Reset to first page whenever filter changes.
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilters]);

  /* ============================================================
     LOAD VEHICLE MAKE
     ============================================================ */

  const {
    data: makes = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "lookupVEMake",
      customParam,
    ],

    queryFn: async () => {
      /*
       * Existing VEMakeController index()
       * returns the same Load result used by VECarMakeCodes.
       */
      const response =
        await apiClient.get(
          "/veMake"
        );

      return extractRows(
        response
      )
        .map(normalizeMake)
        .filter(
          (row) =>
            String(
              row.code || ""
            ).trim()
        );
    },

    enabled: isOpen,

    staleTime:
      1000 * 60 * 5,

    placeholderData:
      keepPreviousData,
  });

  /* ============================================================
     FILTER + SORT
     ============================================================ */

  const filteredAndSorted =
    useMemo(() => {
      if (!makes.length) {
        return [];
      }

      let result =
        makes.filter(
          (item) => {
            const code =
              String(
                item.code || ""
              ).toLowerCase();

            const description =
              String(
                item.description ||
                  ""
              ).toLowerCase();

            return (
              code.includes(
                debouncedFilters.code.toLowerCase()
              ) &&
              description.includes(
                debouncedFilters.description.toLowerCase()
              )
            );
          }
        );

      if (sortConfig.key) {
        result = [
          ...result,
        ].sort(
          (a, b) => {
            const aVal =
              String(
                a[
                  sortConfig.key
                ] ?? ""
              );

            const bVal =
              String(
                b[
                  sortConfig.key
                ] ?? ""
              );

            return sortConfig.direction ===
              "asc"
              ? aVal.localeCompare(
                  bVal,
                  undefined,
                  {
                    numeric:
                      true,
                  }
                )
              : bVal.localeCompare(
                  aVal,
                  undefined,
                  {
                    numeric:
                      true,
                  }
                );
          }
        );
      }

      return result;
    }, [
      makes,
      debouncedFilters,
      sortConfig,
    ]);

  /* ============================================================
     PAGINATION
     ============================================================ */

  const paginatedData =
    useMemo(() => {
      const startIndex =
        (currentPage - 1) *
        pageSize;

      return filteredAndSorted.slice(
        startIndex,
        startIndex +
          pageSize
      );
    }, [
      filteredAndSorted,
      currentPage,
      pageSize,
    ]);

  const totalPages =
    Math.ceil(
      filteredAndSorted.length /
        pageSize
    ) || 1;

  /* ============================================================
     SORT
     ============================================================ */

  const handleSort = (key) => {
    setSortConfig(
      (prev) => ({
        key,

        direction:
          prev.key === key &&
          prev.direction ===
            "asc"
            ? "desc"
            : "asc",
      })
    );
  };

  /* ============================================================
     APPLY SELECTED VEHICLE MAKE
     ============================================================ */

  const handleApply = (make) => {
    if (!make) {
      return;
    }

    /*
     * Return both generic names and make-specific names.
     * This makes the lookup convenient for multiple consumers.
     */
    onClose?.({
      ...make,

      makeCode:
        make.code || "",

      makeName:
        make.description || "",
    });
  };

  if (!isOpen) {
    return null;
  }

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fade-in">

      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col relative overflow-hidden transform animate-scale-in border border-slate-200">

        {/* =====================================================
            HEADER
            ===================================================== */}

        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200">

          <div className="flex items-center gap-2 pl-2 sm:pl-3">
            <h2 className="global-lookup-headertext-ui">
              {title}
            </h2>

            {isFetching && (
              <div className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">

            {hasActiveFilters && (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="px-2 py-1 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-all flex items-center gap-1.5"
              >
                <FontAwesomeIcon
                  icon={
                    faEraser
                  }
                />

                CLEAR
              </button>
            )}

            {isFetching && (
              <span className="text-[9px] text-blue-500 animate-pulse font-bold flex items-center gap-1 uppercase mt-0.5">
                <div className="w-1 h-1 bg-blue-500 rounded-full" />
                Syncing...
              </span>
            )}

            <button
              type="button"
              onClick={() =>
                refetch()
              }
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Refresh Data"
            >
              <FontAwesomeIcon
                icon={faSyncAlt}
                size="sm"
                spin={
                  isFetching
                }
              />
            </button>

            <button
              type="button"
              onClick={() =>
                onClose?.(null)
              }
              className="p-2 text-slate-400 hover:text-red-600 transition-colors"
              title="Close"
            >
              <FontAwesomeIcon
                icon={faTimes}
                size="lg"
              />
            </button>

          </div>
        </div>

        {/* =====================================================
            TABLE BODY
            ===================================================== */}

        <div className="flex-grow overflow-auto custom-scrollbar bg-white">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">

              <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="2x"
                className="mb-4 text-blue-500"
              />

              <p className="text-sm font-medium">
                Loading...
              </p>

            </div>
          ) : (
            <table className="min-w-full border-separate border-spacing-0 table-fixed">

              {/* TABLE HEADER */}
              <thead className="sticky top-0 z-10 bg-slate-200">
                <tr>
                  {[
                    {
                      label:
                        "Make Code",
                      key: "code",
                      width:
                        "w-[130px]",
                    },
                    {
                      label:
                        "Make Description",
                      key:
                        "description",
                    },
                  ].map(
                    (col) => (
                      <th
                        key={
                          col.key
                        }
                        className={`global-lookup-th-ui ${
                          col.width ||
                          ""
                        }`}
                      >
                        <div
                          onClick={() =>
                            handleSort(
                              col.key
                            )
                          }
                          className="flex items-center gap-3 cursor-pointer group mb-1"
                        >
                          <span className="global-lookup-th-text-ui">
                            {
                              col.label
                            }
                          </span>

                          <FontAwesomeIcon
                            icon={
                              faSort
                            }
                            className={`mb-1 text-[10px] ${
                              sortConfig.key ===
                              col.key
                                ? "text-gray-600"
                                : "opacity-30 group-hover:opacity-100"
                            }`}
                          />
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={
                              filters[
                                col
                                  .key
                              ]
                            }
                            onChange={(
                              event
                            ) =>
                              setFilters(
                                (
                                  prev
                                ) => ({
                                  ...prev,

                                  [col.key]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Filter..."
                            className="global-lookup-filter-text-ui"
                          />

                          <FontAwesomeIcon
                            icon={
                              faSearch
                            }
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"
                          />
                        </div>
                      </th>
                    )
                  )}
                </tr>
              </thead>

              {/* TABLE DATA */}
              <tbody className="divide-y divide-slate-100">

                {paginatedData.length >
                0 ? (
                  paginatedData.map(
                    (
                      make,
                      index
                    ) => (
                      <tr
                        key={
                          make.code ||
                          index
                        }
                        onClick={() =>
                          handleApply(
                            make
                          )
                        }
                        className="group hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        <td className="global-lookup-td-ui font-bold">
                          {
                            make.code
                          }
                        </td>

                        <td className="global-lookup-td-ui">
                          {
                            make.description
                          }
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <tr>
                    <td
                      colSpan="2"
                      className="px-4 py-20 text-center text-slate-400 italic text-sm"
                    >
                      No matching
                      records
                      found.
                    </td>
                  </tr>
                )}

              </tbody>
            </table>
          )}
        </div>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        <div className="global-lookup-footer-records-div-ui">

          <div className="flex flex-col">
            <span className="global-lookup-footer-records-text-ui">
              Total Records:{" "}
              {
                filteredAndSorted.length
              }
            </span>
          </div>

          {withPagination &&
            totalPages > 1 && (
              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (prev) =>
                        Math.max(
                          prev -
                            1,
                          1
                        )
                    )
                  }
                  disabled={
                    currentPage ===
                    1
                  }
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  <FontAwesomeIcon
                    icon={
                      faChevronLeft
                    }
                    className="text-[10px]"
                  />
                </button>

                <span className="text-[11px] font-semibold text-slate-600">
                  {
                    currentPage
                  }{" "}
                  /{" "}
                  {
                    totalPages
                  }
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage(
                      (prev) =>
                        Math.min(
                          prev +
                            1,
                          totalPages
                        )
                    )
                  }
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  <FontAwesomeIcon
                    icon={
                      faChevronRight
                    }
                    className="text-[10px]"
                  />
                </button>

              </div>
            )}
        </div>
      </div>

      {/* =======================================================
          LOOKUP ANIMATIONS / SCROLLBAR
          ======================================================= */}

      <style jsx="true">{`
        .animate-fade-in {
          animation: fadeIn 0.15s ease-out forwards;
        }

        .animate-scale-in {
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }

          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default SearchVEMakeRef;
