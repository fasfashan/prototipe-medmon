import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  fetchPublishedSheetRows,
  SHEET_REFRESH_MS,
  type SheetApiRow,
} from "../lib/publishedSheet";
import { Button } from "../components/ui/button";

const normalizeDate = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;

  return parsed.toISOString().slice(0, 10);
};

const formatLongDate = (value: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

type ReportRow = {
  id: string;
  date: string;
  title: string;
  reportType: string;
  link: string;
};

const normalizeKey = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[_\-]+/g, " ");

const ReportsPage = () => {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchSheet = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const rows = await fetchPublishedSheetRows("331695401");
      const mapped = rows.map((row: SheetApiRow, index) => {
        const normalizedRow: Record<string, string> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (!key) return;
          const normalized = normalizeKey(key);
          const flat = normalized.replace(/\s+/g, "");
          normalizedRow[normalized] = String(value ?? "");
          normalizedRow[flat] = String(value ?? "");
        });

        const getValue = (column: string) => {
          const normalized = normalizeKey(column);
          const flat = normalized.replace(/\s+/g, "");
          return normalizedRow[normalized] ?? normalizedRow[flat] ?? "";
        };

        const rawDate = String(getValue("TANGGAL") || getValue("DATE") || "");
        const title = String(
          getValue("TITLE") ||
            getValue("NAMA REPORT") ||
            getValue("NAMA_REPORT") ||
            getValue("REPORT") ||
            "",
        ).trim();
        const reportType = String(
          getValue("JENIS REPORT") ||
            getValue("JENIS_REPORT") ||
            getValue("TYPE") ||
            "",
        ).trim();
        const link = String(getValue("LINK") || getValue("URL") || "").trim();

        return {
          id: String(getValue("ID") || `row-${index + 1}`),
          date: normalizeDate(rawDate),
          title: title || "-",
          reportType: reportType || "-",
          link: link || "#",
        } as ReportRow;
      });

      setRows(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSheet();
    const intervalId = window.setInterval(() => {
      fetchSheet(false);
    }, SHEET_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const hasRows = useMemo(() => rows.length > 0, [rows]);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [rows]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return (
    <Card className="table-section border-none shadow-none">
      <div className="panel-header">
        <h3>Reports</h3>
        <span className="panel-meta">{rows.length} reports in view</span>
      </div>
      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          Memuat data report...
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-rose-500 shadow-sm">
          {error}
        </div>
      ) : !hasRows ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 shadow-sm">
          Belum ada data report.
        </div>
      ) : (
        <div className="table-wrapper">
          <Table className="text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm">No</TableHead>
                <TableHead className="text-sm">Tanggal</TableHead>
                <TableHead className="text-sm">Nama Report</TableHead>
                <TableHead className="text-sm">Jenis Report</TableHead>
                <TableHead className="text-sm">Link Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedRows.map((report, index) => (
                <TableRow key={report.id}>
                  <TableCell className="text-sm">
                    {(page - 1) * pageSize + index + 1}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatLongDate(report.date)}
                  </TableCell>
                  <TableCell className="text-sm">{report.title}</TableCell>
                  <TableCell className="text-sm">{report.reportType}</TableCell>
                  <TableCell className="text-sm">
                    <a href={report.link} target="_blank" rel="noreferrer">
                      Download
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Prev
            </Button>
            <span className="text-xs text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default ReportsPage;
