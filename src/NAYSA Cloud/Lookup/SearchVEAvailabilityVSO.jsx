import { useEffect, useState } from "react";
import { apiClient } from "@/NAYSA Cloud/Configuration/BaseURL.jsx";
import { LoadingSpinner } from "@/NAYSA Cloud/Global/utilities.jsx";
import { useSwalErrorAlert } from "@/NAYSA Cloud/Global/behavior.jsx";
import GlobalLookupModalv1 from "@/NAYSA Cloud/Lookup/SearchGlobalLookupv1.jsx";

const columns = [
  { key: "itemCode", label: "Item Code" }, { key: "itemName", label: "Vehicle Name" },
  { key: "make", label: "Make" }, { key: "model", label: "Model" },
  { key: "modelYear", label: "Model Year" }, { key: "color", label: "Color" },
  { key: "csNo", label: "CS No." }, { key: "engineNo", label: "Engine No." },
  { key: "serialNo", label: "Serial No." }, { key: "branchCode", label: "Branch" },
  { key: "branchName", label: "Branch Name" }, { key: "whouseCode", label: "Warehouse" },
  { key: "whouseName", label: "Warehouse Name" },
  { key: "availabilityStatus", label: "Availability Status" },
  { key: "reservedVsoNo", label: "Reserved VSO No." },
  { key: "sellingPrice", label: "Selling Price", renderType: "number", roundingOff: 2 },
];

const SearchVEAvailabilityVSO = ({ isOpen, onClose }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    apiClient.get("/ve/inventory/stock-card/availability")
      .then((response) => {
        if (!active) return;
        const source = response?.data?.data?.rows;
        setRows((Array.isArray(source) ? source : []).map((row) => ({ ...row, groupId: row.veId })));
      })
      .catch((error) => active && useSwalErrorAlert("Vehicle Inventory", error?.response?.data?.message || "Unable to load vehicle inventory."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;
  return <>
    {loading && <LoadingSpinner />}
    <GlobalLookupModalv1
      isOpen title="Select Available Vehicle" endpoint={columns} data={rows}
      singleSelect btnCaption="Use Selected Vehicle" onClose={onClose}
      onCancel={() => onClose?.(null)} preferenceKey="VSO:VehicleAvailability"
      exportFileName="Vehicle Inventory"
    />
  </>;
};

export default SearchVEAvailabilityVSO;
