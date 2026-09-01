// src/NAYSA Cloud/Master Data/VEHSVServiceMaster/VEHSVMast_ReferenceCodeTab.jsx

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
  faIndustry,
  faCarSide,
  faCarRear,
  faLayerGroup,
  faGears,
  faScrewdriverWrench,
  faListCheck,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import VECarMakeCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VECarMakeCodes.jsx";
import VETypeCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VETypeCodes.jsx";
import VECarModelCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEModelCodes.jsx";
import VEPartClass from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEPartClass.jsx";

// Add these imports once the actual components are available:
// import VEClassCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEClassCodes.jsx";
// import VEServiceTypeCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEServiceTypeCodes.jsx";
// import VEServiceCodes from "@/NAYSA Cloud/Master Data/VEMasterData/ReferenceCodes/VEServiceCodes.jsx";

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">
      {title}
    </div>

    {subtitle ? (
      <div className="text-xs text-gray-500 mt-0.5 leading-4">
        {subtitle}
      </div>
    ) : null}
  </div>
);

const Card = ({ children, className = "" }) => (
  <div
    className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}
  >
    {children}
  </div>
);

const VEHSVMast_ReferenceCodeTab = forwardRef(
  (
    {
      onStateChange,
      isReadOnly = false,
      canAdd = true,
      canEdit = true,
      canSave = true,
      canDelete = true,
    },
    ref
  ) => {
    /*
     * ============================================================
     * CHILD REFERENCES
     * ============================================================
     */

    const makeRef = useRef(null);
    const typeRef = useRef(null);
    const modelRef = useRef(null);
    const classRef = useRef(null);
    const partClassRef = useRef(null);
    const serviceTypeRef = useRef(null);
    const serviceCodeRef = useRef(null);

    /*
     * ============================================================
     * PERMISSIONS
     * ============================================================
     */

    const permissionProps = {
      isReadOnly,
      canAdd,
      canEdit,
      canSave,
      canDelete,
    };

    /*
     * ============================================================
     * LEFT NAVIGATION
     * ============================================================
     */

    const [collapseNav, setCollapseNav] = useState(false);

    const refTabs = useMemo(
      () => [
        {
          id: "make",
          label: "Vehicle Make",
          icon: faIndustry,
        },
        {
          id: "type",
          label: "Vehicle Type",
          icon: faCarSide,
        },
        {
          id: "model",
          label: "Vehicle Model",
          icon: faCarRear,
        },
        {
          id: "class",
          label: "Vehicle Class",
          icon: faLayerGroup,
        },
        {
          id: "partClass",
          label: "Part Class",
          icon: faGears,
        },
        {
          id: "serviceType",
          label: "Service Type",
          icon: faScrewdriverWrench,
        },
        {
          id: "serviceCodes",
          label: "Service Codes",
          icon: faListCheck,
        },
      ],
      []
    );

    const [activeRefTab, setActiveRefTab] = useState(
      refTabs[0].id
    );

    /*
     * Keep the current tab available inside callbacks without
     * depending on stale React state.
     */
    const activeRefTabRef = useRef(refTabs[0].id);

    /*
     * ============================================================
     * TAB SWITCH
     * ============================================================
     */

    const switchRefTab = useCallback(
      (id) => {
        activeRefTabRef.current = id;
        setActiveRefTab(id);

        onStateChange?.((prev) => ({
          ...prev,
          activeRefTab: id,
          isEditing: false,
          canSave: false,
        }));
      },
      [onStateChange]
    );

    /*
     * ============================================================
     * CHILD STATE HANDLER
     * ============================================================
     */

    const childStateChange = useCallback(
      (patch) => {
        onStateChange?.((prev) => {
          const updatedState =
            typeof patch === "function"
              ? patch(prev)
              : {
                  ...prev,
                  ...patch,
                };

          return {
            ...prev,
            ...updatedState,
            activeRefTab: activeRefTabRef.current,
          };
        });
      },
      [onStateChange]
    );

    /*
     * ============================================================
     * INITIAL STATE
     * ============================================================
     */

    useEffect(() => {
      onStateChange?.((prev) => ({
        ...prev,
        activeRefTab: refTabs[0].id,
        isEditing: false,
        canSave: false,
      }));

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /*
     * ============================================================
     * PARENT HEADER BUTTON COMMANDS
     * ============================================================
     */

    useImperativeHandle(
      ref,
      () => ({
        add: () => {
          switch (activeRefTab) {
            case "make":
              makeRef.current?.add?.();
              break;

            case "type":
              typeRef.current?.add?.();
              break;

            case "model":
              modelRef.current?.add?.();
              break;

            case "class":
              classRef.current?.add?.();
              break;

            case "partClass":
              partClassRef.current?.add?.();
              break;

            case "serviceType":
              serviceTypeRef.current?.add?.();
              break;

            case "serviceCodes":
              serviceCodeRef.current?.add?.();
              break;

            default:
              break;
          }
        },

        save: () => {
          switch (activeRefTab) {
            case "make":
              makeRef.current?.save?.();
              break;

            case "type":
              typeRef.current?.save?.();
              break;

            case "model":
              modelRef.current?.save?.();
              break;

            case "class":
              classRef.current?.save?.();
              break;

            case "partClass":
              partClassRef.current?.save?.();
              break;

            case "serviceType":
              serviceTypeRef.current?.save?.();
              break;

            case "serviceCodes":
              serviceCodeRef.current?.save?.();
              break;

            default:
              break;
          }
        },

        reset: () => {
          switch (activeRefTab) {
            case "make":
              makeRef.current?.reset?.();
              break;

            case "type":
              typeRef.current?.reset?.();
              break;

            case "model":
              modelRef.current?.reset?.();
              break;

            case "class":
              classRef.current?.reset?.();
              break;

            case "partClass":
              partClassRef.current?.reset?.();
              break;

            case "serviceType":
              serviceTypeRef.current?.reset?.();
              break;

            case "serviceCodes":
              serviceCodeRef.current?.reset?.();
              break;

            default:
              break;
          }
        },
      }),
      [activeRefTab]
    );

    /*
     * ============================================================
     * RIGHT PANEL
     * ============================================================
     */

    const renderRight = () => {
      switch (activeRefTab) {
        case "make":
          return (
            <VECarMakeCodes
              ref={makeRef}
              onStateChange={childStateChange}
              {...permissionProps}
            />
          );

        case "type":
          return (
            <VETypeCodes
              ref={typeRef}
              onStateChange={childStateChange}
              {...permissionProps}
            />
          );

        case "model":
          return (
            <VECarModelCodes
              ref={modelRef}
              onStateChange={childStateChange}
              {...permissionProps}
            />
          );

        /*
         * Uncomment this case once VEClassCodes exists/imported.
         */
        // case "class":
        //   return (
        //     <VEClassCodes
        //       ref={classRef}
        //       onStateChange={childStateChange}
        //       {...permissionProps}
        //     />
        //   );

        case "partClass":
          return (
            <VEPartClass
              ref={partClassRef}
              onStateChange={childStateChange}
              {...permissionProps}
            />
          );

        /*
         * Uncomment these cases once the components exist/imported.
         */
        // case "serviceType":
        //   return (
        //     <VEServiceTypeCodes
        //       ref={serviceTypeRef}
        //       onStateChange={childStateChange}
        //       {...permissionProps}
        //     />
        //   );

        // case "serviceCodes":
        //   return (
        //     <VEServiceCodes
        //       ref={serviceCodeRef}
        //       onStateChange={childStateChange}
        //       {...permissionProps}
        //     />
        //   );

        default:
          return (
            <div className="p-4 text-sm text-gray-500">
              This reference-code component is not yet connected.
            </div>
          );
      }
    };

    /*
     * ============================================================
     * UI
     * ============================================================
     */

    return (
      <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start h-full min-h-[500px]">

        {/* LEFT REFERENCE NAVIGATION */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
            collapseNav ? "lg:w-14" : "lg:w-72"
          } w-full lg:w-auto`}
        >
          <Card className="w-full">

            <div className="flex items-center justify-between mb-2">
              {!collapseNav && (
                <SectionHeader
                  title="Reference Codes"
                  subtitle="Vehicle Service master references"
                />
              )}

              <button
                type="button"
                onClick={() =>
                  setCollapseNav((prev) => !prev)
                }
                className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
                title={
                  collapseNav
                    ? "Expand Reference Codes"
                    : "Collapse Reference Codes"
                }
              >
                <FontAwesomeIcon
                  icon={
                    collapseNav
                      ? faChevronRight
                      : faChevronLeft
                  }
                />
              </button>
            </div>

            <div
              className={`flex flex-col gap-2 ${
                collapseNav ? "items-center" : ""
              }`}
            >
              {refTabs.map((tab) => {
                const isActive =
                  activeRefTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      switchRefTab(tab.id)
                    }
                    className={`
                      w-full
                      flex
                      items-center
                      gap-2
                      px-3
                      py-2
                      rounded-md
                      text-xs
                      md:text-sm
                      font-bold
                      transition-colors
                      duration-200

                      ${
                        isActive
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                      }

                      ${
                        collapseNav
                          ? "justify-center px-2 !w-10"
                          : ""
                      }
                    `}
                    title={
                      collapseNav
                        ? tab.label
                        : undefined
                    }
                  >
                    <FontAwesomeIcon
                      icon={tab.icon}
                      className="w-4 h-4 shrink-0"
                    />

                    {!collapseNav && (
                      <span className="whitespace-nowrap">
                        {tab.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </Card>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 min-w-0 h-full">
          {renderRight()}
        </div>

      </div>
    );
  }
);

VEHSVMast_ReferenceCodeTab.displayName =
  "VEHSVMast_ReferenceCodeTab";

export default VEHSVMast_ReferenceCodeTab;
