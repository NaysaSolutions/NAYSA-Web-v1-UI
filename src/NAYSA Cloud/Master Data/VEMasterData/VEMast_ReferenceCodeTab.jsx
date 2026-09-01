import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSitemap,
  faLayerGroup,
  faPalette,
  faCarSide,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import VECategCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VECategCodes";
import VEClassCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEClassCodes";
import VEColorCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEColorCodes";
import VECarMakeCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VECarMakeCodes";

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    {subtitle ? <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div> : null}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
    {children}
  </div>
);

const VEMast_ReferenceCodeTab = forwardRef(({
  onStateChange,
  isReadOnly = false,
  canAdd = true,
  canEdit = true,
  canSave = true,
  canDelete = true,
}, ref) => {
  const categoryRef = useRef(null);
  const classRef = useRef(null);
  const colorRef = useRef(null);
  const makeRef = useRef(null);

  const permissionProps = { isReadOnly, canAdd, canEdit, canSave, canDelete };

  const [collapseNav, setCollapseNav] = useState(false);

  const refTabs = useMemo(
    () => [
      { id: "category", label: "Category Codes", icon: faSitemap },
      { id: "classification", label: "Class Codes", icon: faLayerGroup },
      { id: "color", label: "Color Codes", icon: faPalette },
      { id: "make", label: "Vehicle Make Codes", icon: faCarSide },
    ],
    []
  );

  const [activeRefTab, setActiveRefTab] = useState(refTabs[0].id);
  const activeRefTabRef = useRef(refTabs[0].id);

  const switchRefTab = (id) => {
    activeRefTabRef.current = id;
    setActiveRefTab(id);
    onStateChange?.((prev) => ({ ...prev, activeRefTab: id }));
  };

  const childStateChange = useCallback(
    (patch) => {
      const updater =
        typeof patch === "function"
          ? (prev) => ({ ...patch(prev), activeRefTab: activeRefTabRef.current })
          : (prev) => ({ ...prev, ...patch, activeRefTab: activeRefTabRef.current });

      onStateChange?.(updater);
    },
    [onStateChange]
  );

  useEffect(() => {
    onStateChange?.((prev) => ({ ...prev, activeRefTab: refTabs[0].id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      add: () => {
        if (activeRefTab === "category") categoryRef.current?.add?.();
        if (activeRefTab === "classification") classRef.current?.add?.();
        if (activeRefTab === "color") colorRef.current?.add?.();
        if (activeRefTab === "make") makeRef.current?.add?.();
      },
      save: () => {
        if (activeRefTab === "category") categoryRef.current?.save?.();
        if (activeRefTab === "classification") classRef.current?.save?.();
        if (activeRefTab === "color") colorRef.current?.save?.();
        if (activeRefTab === "make") makeRef.current?.save?.();
      },
      reset: () => {
        if (activeRefTab === "category") categoryRef.current?.reset?.();
        if (activeRefTab === "classification") classRef.current?.reset?.();
        if (activeRefTab === "color") colorRef.current?.reset?.();
        if (activeRefTab === "make") makeRef.current?.reset?.();
      },
      downloadTemplate: () => categoryRef.current?.downloadTemplate?.(),
      triggerImport: () => categoryRef.current?.triggerImport?.(),
    }),
    [activeRefTab]
  );

  const renderRight = () => {
    switch (activeRefTab) {
      case "category":
        return <VECategCodes ref={categoryRef} onStateChange={childStateChange} {...permissionProps} />;
      case "classification":
        return <VEClassCodes ref={classRef} onStateChange={childStateChange} {...permissionProps} />;
      case "color":
        return <VEColorCodes ref={colorRef} onStateChange={childStateChange} {...permissionProps} />;
      case "make":
        return <VECarMakeCodes ref={makeRef} onStateChange={childStateChange} {...permissionProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start h-full min-h-[500px]">
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${collapseNav ? "lg:w-14" : "lg:w-80"} w-full lg:w-auto`}
      >
        <Card className="w-full">
          <div className="flex items-center justify-between mb-2">
            {!collapseNav && <SectionHeader title="Reference Codes" />}
            <button
              type="button"
              onClick={() => setCollapseNav((prev) => !prev)}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
            >
              <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
            </button>
          </div>

          <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
            {refTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchRefTab(tab.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
                  ${activeRefTab === tab.id ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"}
                  ${collapseNav ? "justify-center px-2 w-10" : ""}
                `}
                title={collapseNav ? tab.label : undefined}
              >
                <FontAwesomeIcon icon={tab.icon} className="w-4 h-4" />
                {!collapseNav && <span className="whitespace-nowrap">{tab.label}</span>}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex-1 min-w-0 h-full">{renderRight()}</div>
    </div>
  );
});

VEMast_ReferenceCodeTab.displayName = "VEMast_ReferenceCodeTab";
export default VEMast_ReferenceCodeTab;
