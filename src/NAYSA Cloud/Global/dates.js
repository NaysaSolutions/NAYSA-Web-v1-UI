
export const useGetCurrentDay = () => new Date().toISOString().split('T')[0];



export function useFormatToDate(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m && !value.includes("T")) return m[1];
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10); 
}





export function useReturnToDate(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m && !value.includes("T")) {
      const [year, month, day] = m[1].split('-');
      return `${month}/${day}/${year}`;
    }
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${month}/${day}/${year}`;
}