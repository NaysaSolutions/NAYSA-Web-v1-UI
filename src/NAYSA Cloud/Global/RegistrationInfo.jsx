import React from "react";

const RegistrationInfo = ({ data = {}, disabled = true, layout = "stacked" }) => {
  const v = data || {};

  // ✅ Parse SQL datetime as LOCAL time (NO timezone shifting)
  const parseSqlLocal = (value) => {
    if (!value) return null;

    const s = String(value).trim();
    const [datePart, timePartRaw] = s.includes("T") ? s.split("T") : s.split(" ");
    if (!datePart) return null;

    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    if (!yyyy || !mm || !dd) return null;

    let hh = 0, mi = 0, ss = 0;

    if (timePartRaw) {
      const timePart = timePartRaw.split(".")[0];
      const t = timePart.split(":").map(Number);
      hh = t[0] || 0;
      mi = t[1] || 0;
      ss = t[2] || 0;
    }

    return new Date(yyyy, mm - 1, dd, hh, mi, ss);
  };

  // ✅ Format: Jan 22, 2026 09:29:17 AM
  const formatDateTime = (value) => {
    const d = parseSqlLocal(value);
    if (!d) return value ? String(value) : "";

    const monthsShort = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    const pad = (n) => String(n).padStart(2, "0");

    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return `${monthsShort[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()} ${pad(hours)}:${pad(
      d.getMinutes()
    )}:${pad(d.getSeconds())} ${ampm}`;
  };

  const inputClass = `peer global-ref-textbox-ui ${
    disabled ? "global-ref-textbox-disabled" : "global-ref-textbox-enabled"
  }`;

  const labelClass = "global-ref-floating-label global-ref-label-disabled";

  const Field = ({ label, value }) => (
    <div className="relative">
      <input
        type="text"
        value={value || ""}
        disabled={disabled}
        readOnly
        placeholder=" "
        className={inputClass}
      />
      <label className={labelClass}>{label}</label>
    </div>
  );

  const registeredBy = v.registeredBy || "";
  const registeredDate = formatDateTime(v.registeredDate);
  const updatedBy = v.lastUpdatedBy || "";
  const updatedDate = formatDateTime(v.lastUpdatedDate);

  // ✅ 2-column layout
  if (layout === "twoCols") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Registered By" value={registeredBy} />
        <Field label="Updated By" value={updatedBy} />
        <Field label="Registered Date" value={registeredDate} />
        <Field label="Updated Date" value={updatedDate} />
      </div>
    );
  }

  // ✅ stacked layout (default)
  return (
    <div className="flex flex-col gap-4">
      <Field label="Registered By" value={registeredBy} />
      <Field label="Registered Date" value={registeredDate} />
      <Field label="Updated By" value={updatedBy} />
      <Field label="Updated Date" value={updatedDate} />
    </div>
  );
};

export default RegistrationInfo;
