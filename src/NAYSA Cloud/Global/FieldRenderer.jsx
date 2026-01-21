import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

const FieldRenderer = ({
  id,
  name,                 // ✅ add this
  label,
  required = false,
  type = "text",
  value,
  onChange,
  onLookup,
  disabled,
  options = [],
}) => {
  const isEnabled = !disabled;

  // ✅ Safely derive a string key for the input id
  const labelText = typeof label === "string" ? label : "";
  const idSource = id || name || labelText;

  const inputId =
    idSource
      ? String(idSource).toLowerCase().replace(/[^a-z0-9]+/gi, "_")
      : undefined;

  const baseInput = `peer global-ref-textbox-ui ${
    isEnabled ? "global-ref-textbox-enabled" : "global-ref-textbox-disabled"
  }`;

  const labelClass = `global-ref-floating-label ${
    isEnabled ? "global-ref-label-enabled" : "global-ref-label-disabled"
  }`;

  // ✅ keep your original behavior (value only), but safer if some callers pass event
  const handleChange = (e) => {
  if (!onChange) return;

  // ✅ If caller uses handleFormChange(event)
  if (name) {
    onChange({ target: { name, value: e.target.value } });
    return;
  }

  // ✅ fallback: if caller uses onChange(value)
  onChange(e.target.value);
};


  const renderLabel = () => (
    <label htmlFor={inputId} className={labelClass}>
      {/* ✅ asterisk on LEFT side */}
      {required && <span className="global-ref-asterisk-ui mr-1"></span>}
      {label}
    </label>
  );

  return (
    <div className="relative w-full">
      {/* LOOKUP */}
      {type === "lookup" && (
        <>
          <div
            className={`flex items-stretch global-ref-textbox-ui ${
              isEnabled
                ? "global-ref-textbox-enabled"
                : "global-ref-textbox-disabled"
            }`}
          >
            <input
              id={inputId}
              type="text"
              placeholder=" "
              readOnly
              value={value || ""}
              className="peer flex-grow bg-transparent border-none px-3 focus:outline-none cursor-pointer"
              onClick={() => isEnabled && onLookup && onLookup()}
            />

            <button
              type="button"
              onClick={() => isEnabled && onLookup && onLookup()}
              disabled={!isEnabled}
              tabIndex={-1}
              className={`
                absolute right-[1px] inset-y-[1px]
                w-10 flex items-center justify-center
                rounded-r-md
                ${
                  isEnabled
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }
              `}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </button>
          </div>

          {renderLabel()}
        </>
      )}

      {/* TEXT */}
      {type === "text" && (
        <>
          <input
            id={inputId}
            type="text"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          {renderLabel()}
        </>
      )}

      {/* NUMBER */}
      {type === "number" && (
        <>
          <input
            id={inputId}
            type="number"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          {renderLabel()}
        </>
      )}

      {/* DATE */}
      {type === "date" && (
        <>
          <input
            id={inputId}
            type="date"
            placeholder=" "
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          />
          {renderLabel()}
        </>
      )}

      {/* SELECT */}
      {type === "select" && (
        <>
          <select
            id={inputId}
            value={value || ""}
            onChange={handleChange}
            disabled={disabled}
            className={baseInput}
          >
            <option value=""></option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {renderLabel()}

          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export default FieldRenderer;
