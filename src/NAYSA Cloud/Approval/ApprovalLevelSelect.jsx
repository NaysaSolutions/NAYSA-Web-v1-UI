const APPROVAL_LEVELS = [1, 2, 3, 4];

export default function ApprovalLevelSelect({ value, onChange, disabled = false }) {
  return (
    <select
      className="h-7 w-full bg-transparent px-2 text-[11px] font-medium text-slate-700 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
      value={Number(value || 1)}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {APPROVAL_LEVELS.map((level) => (
        <option key={level} value={level}>Level {level}</option>
      ))}
    </select>
  );
}
