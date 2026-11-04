const APPROVAL_LEVELS = [1, 2, 3, 4];

export default function ApprovalLevelSelect({ value, onChange, disabled = false }) {
  return (
    <select
      className="h-7 w-full bg-transparent px-2 text-[11px] font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
      value={value === "" || value === null || value === undefined || Number(value) === 0 ? "" : Number(value)}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))}
    >
      <option value=""></option>
      {APPROVAL_LEVELS.map((level) => (
        <option key={level} value={level}>Level {level}</option>
      ))}
    </select>
  );
}
