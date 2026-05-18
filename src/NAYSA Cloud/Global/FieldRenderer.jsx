// import React from "react";
// import { Search, X } from "lucide-react";

// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectTrigger,
//   SelectValue,
//   SelectContent,
//   SelectItem,
// } from "@/components/ui/select";

// const FieldRenderer = ({
//   id,
//   name,
//   label,
//   required = false,
//   type = "text",
//   value,
//   onChange,
//   onLookup,
//   onClear,
//   onBlur,
//   onKeyDown,
//   disabled,
//   lookupDisabled = false,
//   options = [],
//   readOnly = false,
//   placeholder = " ",
//   inputRef,
//   variant = "default",
//   maxLength,
//   onPaste,
//   ...props
// }) => {
//   const isAudit = variant === "audit";
//   const isEnabled = !disabled || isAudit;
//   const lookupActionDisabled = disabled || lookupDisabled || isAudit;

//   const labelText = typeof label === "string" ? label : "";
//   const idSource = id || name || labelText;

//   const inputId = idSource
//     ? String(idSource).toLowerCase().replace(/[^a-z0-9]+/gi, "_")
//     : undefined;

//   const sharedClasses = `
//     peer w-full h-8 sm:h-8
//     global-ref-textbox-ui
//     !px-2
//     !font-normal
//     rounded-lg
//     ${isEnabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}
//     ${readOnly || isAudit ? "cursor-default" : ""}
//     focus-visible:ring-0 focus-visible:ring-offset-0
//     border shadow-none transition-all
//   `;

//   const labelClass = `global-ref-floating-label ${
//     isEnabled ? "global-ref-label-enabled" : "global-ref-label-disabled"
//   }`;

//   const getDisplayValue = (val, fieldType = "text") => {
//     if (val === undefined || val === null) return "";
//     if (typeof val !== "object") return String(val);

//     if (fieldType === "select") {
//       return val.value !== undefined && val.value !== null ? String(val.value) : "";
//     }

//     return val.label ?? val.value ?? "";
//   };

//   const handleChange = (val) => {
//     if (!onChange || readOnly || isAudit) return;

//     const isEvent = val && typeof val === "object" && "target" in val;
//     const finalValue = isEvent ? val.target.value : val;

//     onChange(finalValue);
//   };

//   const renderLabel = () => (
//     <label htmlFor={inputId} className={labelClass}>
//       {required && <span className="global-ref-asterisk-ui mr-1">*</span>}
//       {label}
//     </label>
//   );

//   return (
//     <div className="relative w-full">
//       {type === "lookup" && (
//         <div className="relative flex items-center w-full">
//           <Input
//             id={inputId}
//             value={getDisplayValue(value, "lookup")}
//             readOnly
//             placeholder={placeholder}
//             className={`${sharedClasses} cursor-pointer ${onClear ? "pr-20" : "pr-12"}`}
//             onClick={() => !lookupActionDisabled && onLookup?.()}
//           />
//           {onClear && getDisplayValue(value, "lookup") && (
//             <button
//               type="button"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 if (!lookupActionDisabled) onClear();
//               }}
//               disabled={lookupActionDisabled}
//               title="Clear"
//               className={`
//                 absolute right-10 top-0 h-8 sm:h-8 w-8 flex items-center justify-center
//                 border border-l-0 transition-colors
//                 ${
//                   !lookupActionDisabled
//                     ? "bg-white text-slate-400 hover:bg-red-50 hover:text-red-600"
//                     : "bg-gray-100 text-gray-300"
//                 }
//               `}
//             >
//               <X className="h-3.5 w-3.5" strokeWidth={3} />
//             </button>
//           )}
//           <button
//             type="button"
//             onClick={() => !lookupActionDisabled && onLookup?.()}
//             disabled={lookupActionDisabled}
//             title="Search"
//             className={`
//               absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center
//               rounded-r-lg border border-l-0 transition-colors
//               ${
//                 !lookupActionDisabled
//                   ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
//                   : "bg-gray-100 text-gray-400"
//               }
//             `}
//           >
//             <Search className="h-4 w-4" strokeWidth={3} />
//           </button>
//           {renderLabel()}
//         </div>
//       )}

//       {(type === "text" || type === "number" || type === "date") && (
//         <>
//           <Input
//             id={inputId}
//             ref={inputRef}
//             type={type}
//             placeholder={placeholder}
//             value={getDisplayValue(value, type)}
//             onChange={handleChange}
//             onBlur={onBlur}
//             onKeyDown={onKeyDown}
//             disabled={disabled}
//             readOnly={readOnly || isAudit}
//             className={sharedClasses}
//             maxLength={maxLength}
//             onPaste={onPaste}
//             {...props}
//           />
//           {renderLabel()}
//         </>
//       )}

//       {type === "amount" && (
//         <>
//           <Input
//             id={inputId}
//             ref={inputRef}
//             type="text"
//             placeholder={placeholder}
//             value={getDisplayValue(value, "amount")}
//             onChange={handleChange}
//             onBlur={onBlur}
//             onKeyDown={onKeyDown}
//             disabled={disabled}
//             readOnly={readOnly || isAudit}
//             className={`${sharedClasses} text-right`}
//             maxLength={maxLength}
//             onPaste={onPaste}
//             {...props}
//           />
//           {renderLabel()}
//         </>
//       )}

//       {type === "select" && (
//         <>
//           <Select
//             value={getDisplayValue(value, "select")}
//             onValueChange={(newVal) => handleChange(newVal)}
//             disabled={disabled || readOnly || isAudit}
//           >
//             <SelectTrigger
//               id={inputId}
//               className={`${sharedClasses} flex items-center justify-between bg-transparent !leading-none`}
//             >
//               <SelectValue placeholder={placeholder} />
//             </SelectTrigger>

//             <SelectContent className="rounded-xl">
//               {options.map((opt) => (
//                 <SelectItem
//                   key={String(opt.value)}
//                   value={String(opt.value)}
//                   className="text-xs rounded-lg"
//                 >
//                   {opt.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           {renderLabel()}
//         </>
//       )}
//     </div>
//   );
// };

// export default FieldRenderer;
import React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const FieldRenderer = ({
  id,
  name,
  label,
  required = false,
  type = "text",
  value,
  onChange,
  onLookup,
  onClear,
  onBlur,
  onKeyDown,
  disabled,
  lookupDisabled = false,
  options = [],
  readOnly = false,
  placeholder = " ",
  inputRef,
  variant = "default",
  maxLength,
  onPaste,
  ...props
}) => {
  const isAudit = variant === "audit";
  const isEnabled = !disabled || isAudit;
  const lookupActionDisabled = disabled || lookupDisabled || isAudit;

  const labelText = typeof label === "string" ? label : "";
  const idSource = id || name || labelText;

  const inputId = idSource
    ? String(idSource).toLowerCase().replace(/[^a-z0-9]+/gi, "_")
    : undefined;

  const sharedClasses = `
    peer w-full h-8 sm:h-8
    global-ref-textbox-ui
    !px-2
    !font-normal
    rounded-lg
    ${isEnabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"}
    ${readOnly || isAudit ? "cursor-default" : ""}
    focus-visible:ring-0 focus-visible:ring-offset-0
    border shadow-none transition-all
  `;

  const labelClass = `global-ref-floating-label ${
    isEnabled ? "global-ref-label-enabled" : "global-ref-label-disabled"
  }`;

  const getDisplayValue = (val, fieldType = "text") => {
    if (val === undefined || val === null) return "";
    if (typeof val !== "object") return String(val);

    if (fieldType === "select") {
      return val.value !== undefined && val.value !== null ? String(val.value) : "";
    }

    return val.label ?? val.value ?? "";
  };

  const handleChange = (val) => {
    if (!onChange || readOnly || isAudit) return;

    const isEvent = val && typeof val === "object" && "target" in val;
    const finalValue = isEvent ? val.target.value : val;

    onChange(finalValue);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange && !readOnly && !isAudit) {
      onChange("");
    }
  };

  const canClear = !disabled && !readOnly && !isAudit;

  const renderLabel = () => (
    <label htmlFor={inputId} className={labelClass}>
      {required && <span className="global-ref-asterisk-ui mr-1">*</span>}
      {label}
    </label>
  );

  /**
   * Soft rounded-rectangle clear button.
   * - Width slightly wider than height → visible rectangular shape
   * - borderRadius: 6px → curved corners, clearly NOT a circle
   * - Transparent background by default, no fill until hover
   * - Hover: very faint slate tint + slate icon darkens slightly
   * - side: "right" (default) or "left" — for right-aligned number/amount fields
   */
  const clearBtn = (onClick, side = "right") => (
    <button
      type="button"
      onClick={onClick}
      title="Clear"
      aria-label="Clear field"
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [side]: "5px",
        width: "24px",
        height: "18px",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        zIndex: 10,
        flexShrink: 0,
        transition: "background 0.15s, color 0.15s",
        color: "#94a3b8", // slate-400
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(148, 163, 184, 0.18)";
        e.currentTarget.style.color = "#475569"; // slate-600
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "#94a3b8";
      }}
    >
      <X style={{ width: "11px", height: "11px", strokeWidth: 2.5 }} />
    </button>
  );

  const renderClearButton = (currentValue, fieldType = "text") => {
    const displayVal = getDisplayValue(currentValue, fieldType);
    if (!canClear || !displayVal) return null;
    // number and amount are right-aligned text → X goes on the left side
    const side = fieldType === "number" || fieldType === "amount" ? "left" : "right";
    return clearBtn(handleClear, side);
  };

  return (
    <div className="relative w-full">

      {/* ── LOOKUP ─────────────────────────────────────────────── */}
      {type === "lookup" && (
        <div className="relative flex items-center w-full">
          <Input
            id={inputId}
            value={getDisplayValue(value, "lookup")}
            readOnly
            placeholder={placeholder}
            className={`${sharedClasses} cursor-pointer ${
              !lookupActionDisabled && getDisplayValue(value, "lookup")
                ? "pr-20"
                : "pr-10"
            }`}
            onClick={() => !lookupActionDisabled && onLookup?.()}
          />

          {!lookupActionDisabled && getDisplayValue(value, "lookup") && (
            <div
              style={{
                position: "absolute",
                right: "44px",
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 10,
              }}
            >
              {clearBtn((e) => {
                e.stopPropagation();
                if (onClear) {
                  onClear();
                } else if (onChange) {
                  onChange("");
                }
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => !lookupActionDisabled && onLookup?.()}
            disabled={lookupActionDisabled}
            title="Search"
            className={`
              absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center
              rounded-r-lg border border-l-0 transition-colors
              ${
                !lookupActionDisabled
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                  : "bg-gray-100 text-gray-400"
              }
            `}
          >
            <Search className="h-4 w-4" strokeWidth={3} />
          </button>

          {renderLabel()}
        </div>
      )}

      {/* ── TEXT / NUMBER / DATE ────────────────────────────────── */}
      {(type === "text" || type === "number" || type === "date") && (
        <>
          <Input
            id={inputId}
            ref={inputRef}
            type={type}
            placeholder={placeholder}
            value={getDisplayValue(value, type)}
            onChange={handleChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            readOnly={readOnly || isAudit}
            className={`${sharedClasses} ${
              type === "number" ? "text-right" : ""
            } ${
              canClear && getDisplayValue(value, type)
                ? type === "number" ? "pl-8" : "pr-8"
                : ""
            }`}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderClearButton(value, type)}
          {renderLabel()}
        </>
      )}

      {/* ── AMOUNT ─────────────────────────────────────────────── */}
      {type === "amount" && (
        <>
          <Input
            id={inputId}
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={getDisplayValue(value, "amount")}
            onChange={handleChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={disabled}
            readOnly={readOnly || isAudit}
            className={`${sharedClasses} text-right ${
              canClear && getDisplayValue(value, "amount") ? "pl-8" : ""
            }`}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderClearButton(value, "amount")}
          {renderLabel()}
        </>
      )}

      {/* ── SELECT ─────────────────────────────────────────────── */}
      {type === "select" && (
        <>
          <div className="relative w-full">
            <Select
              value={getDisplayValue(value, "select")}
              onValueChange={(newVal) => handleChange(newVal)}
              disabled={disabled || readOnly || isAudit}
            >
              <SelectTrigger
                id={inputId}
                className={`${sharedClasses} flex items-center justify-between bg-transparent !leading-none ${
                  canClear && getDisplayValue(value, "select") ? "pr-14" : ""
                }`}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>

              <SelectContent className="rounded-xl">
                {options.map((opt) => (
                  <SelectItem
                    key={String(opt.value)}
                    value={String(opt.value)}
                    className="text-xs rounded-lg"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canClear && getDisplayValue(value, "select") && (
              <div
                style={{
                  position: "absolute",
                  right: "30px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 10,
                }}
              >
                {clearBtn((e) => {
                  e.stopPropagation();
                  handleChange("");
                })}
              </div>
            )}
          </div>
          {renderLabel()}
        </>
      )}

    </div>
  );
};

export default FieldRenderer;