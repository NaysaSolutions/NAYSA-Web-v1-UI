export const filterKind = (column) => {
  const type = String(column?.filterType || column?.renderType || '').toLowerCase();
  return ['number', 'currency', 'amount', 'decimal'].includes(type) ? 'number'
    : ['date', 'datetime', 'datetime-local'].includes(type) ? 'date' : 'text';
};
export const isFilterActive = (filter) => typeof filter === 'object' && filter !== null
  ? ['blank', 'notBlank'].includes(filter.operator) || String(filter.value ?? '').trim() !== ''
  : String(filter ?? '').trim() !== '';
export function describeColumnFilter(filter) {
  if (!isFilterActive(filter)) return '';
  if (typeof filter !== 'object') return `Contains: ${filter}`;
  const labels = { contains:'Contains', notContains:'Does not contain', equals:'Equals', notEquals:'Does not equal', startsWith:'Starts with', endsWith:'Ends with', greater:'Greater than', greaterEqual:'Greater than or equal', less:'Less than', lessEqual:'Less than or equal', between:'Between', blank:'Blank', notBlank:'Not blank' };
  const values = Array.isArray(filter.values) ? filter.values : [filter.value];
  const mode = filter.operator === 'notContains' || filter.match === 'all' ? ' AND ' : ' OR ';
  return `${labels[filter.operator] || filter.operator}${['blank','notBlank'].includes(filter.operator) ? '' : ': ' + (filter.operator === 'between' ? `${filter.value} – ${filter.endValue}` : values.join(mode))}`;
}
const numeric = (value) => {
  if (value === null || String(value).trim() === '') return NaN;
  const text = String(value).trim().replace(/,/g, '');
  return Number(/^\(.*\)$/.test(text) ? `-${text.slice(1, -1)}` : text);
};
const day = (value) => {
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T| |$)/);
  let y, m, d;
  if (match) [, y, m, d] = match;
  else { match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if (!match) return NaN; [, m, d, y] = match; }
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  return date.getUTCFullYear() === +y && date.getUTCMonth() === +m - 1 && date.getUTCDate() === +d ? date.getTime() : NaN;
};
export function matchesColumnFilter(raw, display, filter, kind = 'text') {
  if (!isFilterActive(filter)) return true;
  if (typeof filter !== 'object') return String(display ?? '').toLowerCase().includes(String(filter).toLowerCase());
  const { operator, value, endValue } = filter;
  const blank = raw == null || String(raw).trim() === '';
  if (operator === 'blank') return blank;
  if (operator === 'notBlank') return !blank;
  if (kind === 'text' && ['contains', 'notContains'].includes(operator) && Array.isArray(filter.values)) {
    const values = filter.values.map((value) => String(value).trim().toLowerCase()).filter(Boolean);
    if (!values.length) return true;
    const text = String(display ?? '').toLowerCase();
    if (operator === 'notContains') return values.every((value) => !text.includes(value));
    return filter.match === 'all' ? values.every((value) => text.includes(value)) : values.some((value) => text.includes(value));
  }
  if (blank) return false;
  const compare = kind === 'number' ? numeric : kind === 'date' ? day : (v) => String(v ?? '').toLowerCase();
  const a = compare(kind === 'text' ? display : raw), b = compare(value), end = compare(endValue);
  if (kind !== 'text' && (!Number.isFinite(a) || !Number.isFinite(b))) return false;
  switch (operator) {
    case 'equals': return a === b;
    case 'notEquals': return a !== b;
    case 'startsWith': return String(a).startsWith(b);
    case 'endsWith': return String(a).endsWith(b);
    case 'notContains': return !String(a).includes(b);
    case 'greater': return a > b;
    case 'greaterEqual': return a >= b;
    case 'less': return a < b;
    case 'lessEqual': return a <= b;
    case 'between': return Number.isFinite(end) && a >= b && a <= end;
    default: return String(a).includes(b);
  }
}
