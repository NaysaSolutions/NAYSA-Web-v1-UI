import React from "react";
import { Search } from "lucide-react";

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
  onBlur,
  onKeyDown,
  disabled,
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

  const renderLabel = () => (
    <label htmlFor={inputId} className={labelClass}>
      {required && <span className="global-ref-asterisk-ui mr-1">*</span>}
      {label}
    </label>
  );

  return (
    <div className="relative w-full">
      {type === "lookup" && (
        <div className="relative flex items-center w-full">
          <Input
            id={inputId}
            value={getDisplayValue(value, "lookup")}
            readOnly
            placeholder={placeholder}
            className={`${sharedClasses} cursor-pointer pr-12`}
            onClick={() => !disabled && !isAudit && onLookup?.()}
          />
          <button
            type="button"
            onClick={() => !disabled && !isAudit && onLookup?.()}
            disabled={disabled || isAudit}
            title="Search"
            className={`
              absolute right-0 top-0 h-8 sm:h-8 w-10 flex items-center justify-center
              rounded-r-lg border border-l-0 transition-colors
              ${
                !disabled && !isAudit
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
            className={sharedClasses}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderLabel()}
        </>
      )}

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
            className={`${sharedClasses} text-right`}
            maxLength={maxLength}
            onPaste={onPaste}
            {...props}
          />
          {renderLabel()}
        </>
      )}

      {type === "select" && (
        <>
          <Select
            value={getDisplayValue(value, "select")}
            onValueChange={(newVal) => handleChange(newVal)}
            disabled={disabled || readOnly || isAudit}
          >
            <SelectTrigger
              id={inputId}
              className={`${sharedClasses} flex items-center justify-between bg-transparent !leading-none`}
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
          {renderLabel()}
        </>
      )}
    </div>
  );
};

export default FieldRenderer;