// A simple engine to guess the best chart based on data shape
export function autoDetectChartType(data) {
  // 1. Safety first
  if (!data || data.length === 0) return 'table';

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  // 2. Too many columns → table
  if (columns.length > 3) return 'table';

  let hasText = false;
  let hasNumber = false;
  let hasTime = false;

  // 3. Detect types
  columns.forEach(col => {
    const val = firstRow[col];
    const colName = col.toLowerCase();

    if (typeof val === 'number' || !isNaN(parseFloat(val))) {
      hasNumber = true;
    }

    if (typeof val === 'string' && isNaN(parseFloat(val))) {
      if (colName.includes('year') || colName.includes('date')) {
        hasTime = true;
      } else {
        hasText = true;
      }
    }
  });

  // 4. Decision logic
  if (hasTime && hasNumber) return 'line';
  if (hasText && hasNumber) {
    return data.length <= 6 ? 'pie' : 'bar';
  }

  return 'table';
}