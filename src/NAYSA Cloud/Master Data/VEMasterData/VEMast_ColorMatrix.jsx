import React, { useMemo } from "react";

const VEMast_ColorMatrix = ({
  rows = [],
  selectedCodes = [],
  disabled = false,
  onChange,
}) => {
  const selectedSet = useMemo(
    () =>
      new Set(
        (Array.isArray(selectedCodes) ? selectedCodes : [])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
      ),
    [selectedCodes]
  );

  const handleToggle = (code) => {
    const value = String(code ?? "").trim();
    if (!value || disabled) return;

    const nextSelected = Array.from(selectedSet);
    const hasValue = nextSelected.includes(value);

    const updated = hasValue
      ? nextSelected.filter((item) => item !== value)
      : [...nextSelected, value];

    onChange?.(updated);
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
        No available color codes.
      </div>
    );
  }

  return (
    <div className="grid max-h-[11rem] grid-cols-1 gap-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
      {rows.map((row, index) => {
        const code = String(row?.colorCode ?? row?.code ?? row?.COLOR_CODE ?? "").trim();
        const description = String(
          row?.colorDescription ?? row?.description ?? row?.COLOR_DESCRIPTION ?? row?.COLOR_DESC ?? ""
        ).trim();
        const ltoColor = String(row?.ltoColor ?? row?.LTO_COLOR ?? row?.lto_color ?? "").trim();
        const isSelected = selectedSet.has(code);

        return (
          <button
            key={`${code || "empty"}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => handleToggle(code)}
            className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-left transition ${
              isSelected
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="min-w-0">
              <div className="text-[10px] font-bold tracking-wide">{code || "--"}</div>
              <div className="truncate text-[9px] text-slate-500">{description || "No description"}</div>
            </div>

            <div className="flex items-center gap-1.5">
              {ltoColor ? (
                <span
                  className="h-3.5 w-3.5 rounded-full border border-slate-300"
                  style={{ backgroundColor: ltoColor }}
                  title={ltoColor}
                />
              ) : null}

              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[9px] font-bold ${
                  isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {isSelected ? "✓" : ""}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default VEMast_ColorMatrix;
