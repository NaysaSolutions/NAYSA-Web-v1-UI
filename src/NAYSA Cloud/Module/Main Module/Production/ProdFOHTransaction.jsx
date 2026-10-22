import React, { useCallback, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faBuilding,
  faCalculator,
  faChevronLeft,
  faChevronRight,
  faFlask,
  faIndustry,
  faUsersGear,
  faMagnifyingGlass,
  faPlus,
  faPrint,
  faRotateLeft,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import ButtonBar from "@/NAYSA Cloud/Global/ButtonBar";
import DirectLabor from "./ProdFOHTransaction/DirectLabor.jsx";
import RentAllocation from "./ProdFOHTransaction/RentAllocation.jsx";
import Laboratory from "./ProdFOHTransaction/Laboratory.jsx";
import Electricity from "./ProdFOHTransaction/Electricity.jsx";
import Depreciation from "./ProdFOHTransaction/Depreciation.jsx";
import BoilerDiesel from "./ProdFOHTransaction/BoilerDiesel.jsx";

const tabs = [
  { key: "directLabor", label: "Direct Labor", icon: faUsersGear },
  { key: "rentAllocation", label: "Rent Allocation", icon: faBuilding },
  { key: "laboratory", label: "Laboratory", icon: faFlask },
  { key: "electricity", label: "Electricity", icon: faBolt },
  { key: "depreciation", label: "Depreciation", icon: faCalculator },
  { key: "boilerDiesel", label: "Boiler Diesel", icon: faIndustry },
];

const ProdFOHTransaction = () => {
  const [activeTab, setActiveTab] = useState("directLabor");
  const [collapseNavigation, setCollapseNavigation] = useState(false);
  const [activeView, setActiveView] = useState("details");
  const [resetVersions, setResetVersions] = useState({});
  const [addVersions, setAddVersions] = useState({});
  const [editingTabs, setEditingTabs] = useState({});
  const actionRefs = useRef({});
  const isEditing = Boolean(editingTabs[activeTab]);
  const registerActions = useCallback((tabKey, actions) => {
    actionRefs.current[tabKey] = actions;
  }, []);
  const detailButtons = [
    { key: "add", label: "Add", icon: faPlus, onClick: () => {
      setEditingTabs((previous) => ({ ...previous, [activeTab]: true }));
      setAddVersions((previous) => ({ ...previous, [activeTab]: (previous[activeTab] || 0) + 1 }));
    } },
    { key: "save", label: "Save", icon: faSave, onClick: () => actionRefs.current[activeTab]?.save?.(), disabled: !isEditing },
    { key: "print", label: "Print", icon: faPrint, onClick: () => {}, disabled: true },
    { key: "reset", label: "Reset", icon: faRotateLeft, onClick: () => {
      setEditingTabs((previous) => ({ ...previous, [activeTab]: false }));
      setResetVersions((previous) => ({ ...previous, [activeTab]: (previous[activeTab] || 0) + 1 }));
    } },
  ];
  const summaryButtons = [
    { key: "find", label: "Find", icon: faMagnifyingGlass, onClick: () => actionRefs.current[activeTab]?.find?.() },
    { key: "reset-summary", label: "Reset", icon: faRotateLeft, onClick: () => actionRefs.current[activeTab]?.resetSummary?.() },
  ];

  return (
    <div className="global-tran-main-div-ui">
      <div className="fixed left-6 right-6 top-12 z-30 mt-24 overflow-hidden rounded-xl border border-blue-100 bg-blue-100 shadow-xl md:mt-2 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex min-h-[68px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-[250px] items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FontAwesomeIcon icon={faIndustry} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-blue-900 dark:text-blue-100">FOH Transactions</h1>
              <p className="text-[11px] text-blue-700/70 dark:text-blue-300/70">Factory overhead production reporting and allocation</p>
            </div>
          </div>
          <div className="ml-auto shrink-0"><ButtonBar buttons={activeView === "details" ? detailButtons : summaryButtons} /></div>
        </div>
      </div>

      <div className={`mx-4 mb-5 mt-20 flex w-auto flex-col pb-3 md:mt-20 lg:flex-row ${collapseNavigation ? "gap-2" : "gap-4"}`}>
        <aside className={`w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out lg:w-auto ${collapseNavigation ? "lg:w-20" : "lg:w-72"}`}>
          <div className="global-tran-textbox-group-div-ui !h-fit w-full self-start">
            <div className="mb-2 flex items-center justify-between">
              {!collapseNavigation && (
                <div>
                  <div className="text-sm font-bold text-gray-800 dark:text-slate-100">FOH Transactions</div>
                  <div className="mt-0.5 text-xs leading-4 text-gray-500 dark:text-slate-400">Production overhead reporting</div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setCollapseNavigation((previous) => !previous)}
                className="flex h-8 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200 dark:text-slate-300 dark:hover:bg-slate-700"
                title={collapseNavigation ? "Expand transaction navigation" : "Collapse transaction navigation"}
              >
                <FontAwesomeIcon icon={collapseNavigation ? faChevronRight : faChevronLeft} />
              </button>
            </div>

            <nav className={`flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible ${collapseNavigation ? "lg:items-center" : ""}`} aria-label="FOH transaction types">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-bold transition-colors duration-200 md:text-sm lg:w-full ${
                    activeTab === tab.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  } ${collapseNavigation ? "lg:w-16 lg:flex-col lg:justify-center lg:gap-1 lg:px-0.5" : ""}`}
                  title={collapseNavigation ? tab.label : undefined}
                >
                  <FontAwesomeIcon icon={tab.icon} className="h-4 w-4" />
                  {!collapseNavigation && <span className="whitespace-nowrap">{tab.label}</span>}
                  {collapseNavigation && <span className="hidden max-w-[58px] text-center text-[8px] leading-tight lg:block">{tab.label}</span>}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className={activeTab === "directLabor" ? "block" : "hidden"}><DirectLabor isActive={activeTab === "directLabor"} isEditing={Boolean(editingTabs.directLabor)} onViewChange={setActiveView} onRecordLoaded={() => setEditingTabs((previous) => ({ ...previous, directLabor: true }))} addVersion={addVersions.directLabor || 0} resetVersion={resetVersions.directLabor || 0} registerActions={(actions) => registerActions("directLabor", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, directLabor: continueEditing }))} /></div>
          <div className={activeTab === "rentAllocation" ? "block" : "hidden"}><RentAllocation isActive={activeTab === "rentAllocation"} isEditing={Boolean(editingTabs.rentAllocation)} onViewChange={setActiveView} onRecordLoaded={() => setEditingTabs((previous) => ({ ...previous, rentAllocation: true }))} addVersion={addVersions.rentAllocation || 0} resetVersion={resetVersions.rentAllocation || 0} registerActions={(actions) => registerActions("rentAllocation", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, rentAllocation: continueEditing }))} /></div>
          <div className={activeTab === "laboratory" ? "block" : "hidden"}><Laboratory isActive={activeTab === "laboratory"} isEditing={Boolean(editingTabs.laboratory)} onViewChange={setActiveView} onRecordLoaded={() => setEditingTabs((previous) => ({ ...previous, laboratory: true }))} addVersion={addVersions.laboratory || 0} resetVersion={resetVersions.laboratory || 0} registerActions={(actions) => registerActions("laboratory", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, laboratory: continueEditing }))} /></div>
          <div className={activeTab === "electricity" ? "block" : "hidden"}><Electricity isActive={activeTab === "electricity"} isEditing={Boolean(editingTabs.electricity)} onViewChange={setActiveView} addVersion={addVersions.electricity || 0} resetVersion={resetVersions.electricity || 0} registerActions={(actions) => registerActions("electricity", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, electricity: continueEditing }))} /></div>
          <div className={activeTab === "depreciation" ? "block" : "hidden"}><Depreciation isActive={activeTab === "depreciation"} isEditing={Boolean(editingTabs.depreciation)} onViewChange={setActiveView} addVersion={addVersions.depreciation || 0} resetVersion={resetVersions.depreciation || 0} registerActions={(actions) => registerActions("depreciation", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, depreciation: continueEditing }))} /></div>
          <div className={activeTab === "boilerDiesel" ? "block" : "hidden"}><BoilerDiesel isActive={activeTab === "boilerDiesel"} isEditing={Boolean(editingTabs.boilerDiesel)} onViewChange={setActiveView} addVersion={addVersions.boilerDiesel || 0} resetVersion={resetVersions.boilerDiesel || 0} registerActions={(actions) => registerActions("boilerDiesel", actions)} onSaved={(continueEditing = false) => setEditingTabs((previous) => ({ ...previous, boilerDiesel: continueEditing }))} /></div>
        </div>
      </div>
    </div>
  );
};

export default ProdFOHTransaction;
