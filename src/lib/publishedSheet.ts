const PUBLISHED_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRc-1cZn0ErdhSuZTpDbJ6sJxUeF-WUar9-F64aT48ABP7W7TmDTXE4UwArq6RskH2OInIxyF1e8INR/pubhtml";

export const SHEET_REFRESH_MS = 60_000;

export type SheetApiRow = Record<string, string | undefined>;

const toCsvUrl = (url: string) => {
  if (url.includes("output=csv")) return url;
  if (url.includes("/pubhtml")) {
    return url.replace("/pubhtml", "/pub?output=csv");
  }
  if (url.includes("/pub?")) {
    return `${url}&output=csv`;
  }
  return `${url}${url.includes("?") ? "&" : "?"}output=csv`;
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

export const fetchPublishedSheetRows = async (): Promise<SheetApiRow[]> => {
  const csvUrl = toCsvUrl(PUBLISHED_SHEET_URL);
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
