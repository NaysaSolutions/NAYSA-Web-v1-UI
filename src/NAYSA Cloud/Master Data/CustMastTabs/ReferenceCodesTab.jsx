// src/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodesTab.jsx
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUserTie,
  faMapMarkedAlt,
  faMapPin,
  faUsers,
  faBuilding,
  faTags,
  faReceipt,
  faFileInvoiceDollar,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

// ✅ Per-reference JSX (new)
import PayTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/PayTermRef";
import BillTermRef from "@/NAYSA Cloud/Master Data/CustMastTabs/ReferenceCodes/BillTermRef";

/* ===================== UI helpers ===================== */
const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <div className="text-sm font-bold text-gray-800">{title}</div>
    {subtitle ? <div className="text-xs text-gray-500 mt-0.5 leading-4">{subtitle}</div> : null}
  </div>
);

// ✅ Prevent the "white box" from stretching
const Card = ({ children, className = "" }) => (
  <div className={`global-tran-textbox-group-div-ui self-start !h-fit ${className}`}>
    {children}
  </div>
);

const ReferenceCodesTab = forwardRef(({ variant = "customer" }, ref) => {
  useImperativeHandle(ref, () => ({}));

  const [collapseNav, setCollapseNav] = useState(false);

  const refTabs = useMemo(() => {
    // Customer = full list
    const full = [
      { id: "salesrep", label: "SalesRep Codes", icon: faUserTie },
      { id: "zone", label: "Zone Codes", icon: faMapMarkedAlt },
      { id: "area", label: "Area Codes", icon: faMapPin },
      { id: "custtype", label: "Customer Types", icon: faUsers },
      { id: "billingterm", label: "Billing Terms", icon: faReceipt },
      { id: "bizstyle", label: "Business Style", icon: faBuilding },
      { id: "pricegroup", label: "Price Group", icon: faTags },
      
    ];

    // Vendor = only terms (plus anything you want vendor to maintain)
    const vendorOnly = [
      { id: "payterm", label: "Payment Terms", icon: faFileInvoiceDollar },
      
    ];

    return variant === "vendor" ? vendorOnly : full;
  }, [variant]);

  const [activeRefTab, setActiveRefTab] = useState(refTabs?.[0]?.id || "payterm");

  useEffect(() => {
    // if variant switches and current tab no longer exists, reset to first available
    if (!refTabs.some((t) => t.id === activeRefTab)) {
      setActiveRefTab(refTabs?.[0]?.id || "payterm");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refTabs]);

  const activeLabel = refTabs.find((t) => t.id === activeRefTab)?.label || "Reference";

  const renderRight = () => {
    // ✅ Wired tabs
    if (activeRefTab === "payterm") return <PayTermRef />;
    if (activeRefTab === "billingterm") return <BillTermRef />;

    // ✅ Placeholders (until you wire API)
    return (
      <Card>
        <SectionHeader
          title={activeLabel}
          subtitle="Not yet wired. Send the API endpoints + required fields and I’ll match it to the same maintenance format."
        />
      </Card>
    );
  };

  return (
    // ✅ FLEX layout so collapse works properly (grid col-span won't animate reliably)
    <div className="flex flex-col lg:flex-row gap-3 rounded-lg relative items-start">
      {/* LEFT NAV */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden shrink-0
          ${collapseNav ? "lg:w-14" : "lg:w-80"}
          w-full lg:w-auto
        `}
      >
        <Card>
          <div className="flex items-center justify-between mb-2">
            {!collapseNav && <SectionHeader title="Reference Codes" />}
            <button
              type="button"
              onClick={() => setCollapseNav((p) => !p)}
              className="w-9 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-200 transition"
              title={collapseNav ? "Expand" : "Collapse"}
            >
              <FontAwesomeIcon icon={collapseNav ? faChevronRight : faChevronLeft} />
            </button>
          </div>

          <div className={`flex flex-col gap-2 ${collapseNav ? "items-center" : ""}`}>
            {refTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveRefTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-colors duration-200
                  ${
                    activeRefTab === t.id
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
                  }
                  ${collapseNav ? "justify-center px-2 w-10" : ""}
                `}
                title={collapseNav ? t.label : undefined}
              >
                <FontAwesomeIcon icon={t.icon} className="w-4 h-4" />
                {!collapseNav && <span className="whitespace-nowrap">{t.label}</span>}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 min-w-0 grid grid-cols-1 gap-3">{renderRight()}</div>
    </div>
  );
});

ReferenceCodesTab.displayName = "ReferenceCodesTab";
export default ReferenceCodesTab;
