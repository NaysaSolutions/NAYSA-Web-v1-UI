import React from "react";
import SearchGlobalReferenceTable from "@/NAYSA Cloud/Lookup/SearchGlobalReferenceTable";

const FOHStandardSummary = ({ columns, data, isLoading, onRefresh }) => (
  <div className="w-full pb-4">
    <div className="global-tran-tab-div-ui !mt-0">
      <div className="global-tran-tab-nav-ui">
        <button className="global-tran-tab-padding-ui global-tran-tab-text_active-ui">FOH Labor Standard Summary</button>
      </div>
      <div className="global-tran-table-main-div-ui relative min-h-[420px] overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <SearchGlobalReferenceTable docType="FOH Labor Standard Summary" columns={columns} data={data}
          isLoading={isLoading} itemsPerPage={100} showFilters showEmptyPagination autoFit={false}
          autoFillGrid onRefresh={onRefresh} />
      </div>
    </div>
  </div>
);

export default FOHStandardSummary;
