const SPREADSHEET_ID = "1GE3b0j5FYOjrzKHy_tQeA9dEm6tRz0O3DFH3YJt9Pi0";
const BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv`;

export const SHEET_REFRESH_MS = 60_000;

export type SheetApiRow = Record<string, string | undefined>;

const toCsvUrl = (sheetNameOrGid?: string) => {
  if (!sheetNameOrGid) return BASE_URL;

  // kalau angka, anggap itu gid
  if (/^\d+$/.test(sheetNameOrGid)) {
    return `${BASE_URL}&gid=${sheetNameOrGid}`;
  }

  // fallback ke nama sheet
  return `${BASE_URL}&sheet=${encodeURIComponent(sheetNameOrGid)}`;
};

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      currentRow.push(currentValue);
      currentValue = "";
      rows.push(currentRow);
      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  currentRow.push(currentValue);
  rows.push(currentRow);

  return rows;
};

export const fetchPublishedSheetRows = async (
  sheetName?: string,
): Promise<SheetApiRow[]> => {
  const csvUrl = toCsvUrl(sheetName);
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error("Gagal mengambil data Google Sheet.");
  }

  const text = await response.text();
  const table = parseCsv(text);
  if (table.length === 0) return [];

  const headers = table[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );

  return table
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => {
      const record: SheetApiRow = {};
      headers.forEach((header, index) => {
        if (!header) return;
        record[header] = row[index]?.trim() ?? "";
      });
      return record;
    });
};
