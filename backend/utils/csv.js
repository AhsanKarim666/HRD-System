const escapeCsvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[\s\uFEFF]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
};

const toCsv = (columns, rows) => [
  columns.map((column) => escapeCsvCell(column.label)).join(','),
  ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column.key])).join(',')),
].join('\r\n');

const parseReportPeriod = (month, year) => {
  const numericMonth = Number(month);
  const numericYear = Number(year);
  if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12 ||
      !Number.isInteger(numericYear) || numericYear < 2000 || numericYear > 2100) {
    return null;
  }
  return {
    month: numericMonth,
    year: numericYear,
    startDate: `${numericYear}-${String(numericMonth).padStart(2, '0')}-01`,
  };
};

const sendCsv = (res, filename, columns, rows) => {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  });
  return res.status(200).send(`\uFEFF${toCsv(columns, rows)}`);
};

module.exports = { escapeCsvCell, toCsv, parseReportPeriod, sendCsv };
