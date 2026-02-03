import { useEffect, useMemo, useState } from "react";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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

type ArticleRow = {
  id: string;
  title: string;
  media: string;
  date: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  toneLabel: string;
  company: string;
  url: string;
  mediaType: string;
  spokesperson: string;
  mainframe: string;
  topic: string;
};

const mapSentiment = (value: string): ArticleRow["sentiment"] => {
  const lower = value.toLowerCase();
  if (lower.includes("positif") || lower.includes("positive"))
    return "Positive";
  if (lower.includes("negatif") || lower.includes("negative"))
    return "Negative";
  return "Neutral";
};

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

const resolveMediaType = (value: string) => {
  const raw = value.trim();
  if (!raw) return "Online";
  const lower = raw.toLowerCase();
  if (lower.includes("cetak") || lower.includes("print")) return "Cetak";
  if (lower.includes("online") || lower.includes("digital")) return "Online";
  return raw;
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

const resolveToneLabel = (tone: string, sentiment: ArticleRow["sentiment"]) => {
  if (tone.trim()) return tone.trim();
  if (sentiment === "Positive") return "Positif";
  if (sentiment === "Negative") return "Negatif";
  return "Netral";
};

const DEFAULT_START_DATE = "2025-01-01";

const ArticlesPage = () => {
  const [rows, setRows] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mediaType, setMediaType] = useState("Semua");
  const [page, setPage] = useState(1);

  const fetchSheet = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const rows = await fetchPublishedSheetRows();
      const mapped = rows.map((row: SheetApiRow, index) => {
        const normalizedRow: Record<string, string> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (!key) return;
          normalizedRow[key.trim().toUpperCase()] = String(value ?? "");
        });

        const getValue = (column: string) => normalizedRow[column] ?? "";

        const rawDate = String(getValue("TANGGAL"));
        const normalizedDate = normalizeDate(rawDate);

        const headline = String(
          getValue("HEADLINE") || getValue("JUDUL") || "",
        ).trim();
        const media = String(getValue("MEDIA") || "").trim();
        const company = String(
          getValue("COMPANY") || getValue("PERUSAHAAN") || "",
        ).trim();
        const url = String(getValue("LINK") || getValue("URL") || "").trim();
        const toneRaw = String(
          getValue("TONE") ||
            getValue("SENTIMEN") ||
            getValue("SENTIMENT") ||
            "",
        );
        const mediaTypeValue =
          String(
            getValue("JENIS MEDIA") ||
              getValue("JENIS_MEDIA") ||
              getValue("MEDIA TYPE") ||
              getValue("MEDIA_TYPE") ||
              "",
          ) || "";
        const spokesperson =
          String(
            getValue("SPOKESPERSON") ||
              getValue("SPOKEPERSON") ||
              getValue("SPOKES PERSON") ||
              getValue("SPOKE PERSON") ||
              getValue("JURU BICARA") ||
              getValue("JURU_BICARA") ||
              getValue("JURUBICARA") ||
              getValue("NARASUMBER") ||
              getValue("NARA SUMBER") ||
              "",
          ) || "";
        const mainframe = String(getValue("MAINFRAME") || "") || "";
        const topic =
          String(getValue("TOPIK") || getValue("TOPIC") || "") || "";
        const sentiment = mapSentiment(toneRaw);

        return {
          id: String(getValue("ID") || `row-${index + 1}`),
          title: headline || "-",
          media: media || "-",
          date: normalizedDate,
          sentiment,
          toneLabel: resolveToneLabel(toneRaw, sentiment),
          company: company || "-",
          url: url || "#",
          mediaType: resolveMediaType(mediaTypeValue),
          spokesperson: spokesperson.trim() || "-",
          mainframe: mainframe.trim() || "-",
          topic: topic.trim() || "-",
        } as ArticleRow;
      });

      setRows(mapped);

      const todayString = new Date().toISOString().slice(0, 10);
      setDateFrom((current) => current || DEFAULT_START_DATE);
      setDateTo((current) => current || todayString);
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

  const todayString = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const [minDate] = useMemo(() => {
    const dates = rows
      .map((article) => article.date)
      .filter(Boolean)
      .sort();
    return [DEFAULT_START_DATE, dates[dates.length - 1] ?? ""];
  }, [rows]);

  useEffect(() => {
    setDateFrom((current) => current || DEFAULT_START_DATE);
    setDateTo((current) => current || todayString);
  }, [todayString]);

  const filteredRows = useMemo(() => {
    return rows.filter((article) => {
      const matchesDate =
        (!dateFrom || article.date >= dateFrom) &&
        (!dateTo || article.date <= dateTo);
      const matchesMedia =
        mediaType === "Semua" || article.mediaType === mediaType;
      return matchesDate && matchesMedia;
    });
  }, [rows, dateFrom, dateTo, mediaType]);

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, mediaType]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  return (
    <Card className="table-section border-none shadow-none">
      <div className="panel-header">
        <h3>Rekap Pemberitaan</h3>
        <span className="panel-meta">
          {filteredRows.length} mentions in view
        </span>
      </div>
      {loading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-4 shadow-sm">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-10 w-40 rounded-xl bg-slate-100 animate-pulse"
              />
            ))}
          </div>
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-8 w-full rounded-lg bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-semibold">Data gagal dimuat</h3>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex min-w-[160px] flex-col gap-2">
              <label className="text-xs text-slate-500" htmlFor="mediaType">
                Jenis media
              </label>
              <Select value={mediaType} onValueChange={setMediaType}>
                <SelectTrigger id="mediaType">
                  <SelectValue placeholder="Pilih jenis media" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semua">Semua</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                  <SelectItem value="Cetak">Cetak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[150px] flex-col gap-2">
              <label
                className="text-xs text-slate-500"
                htmlFor="articleDateFrom"
              >
                Dari tanggal
              </label>
              <Input
                id="articleDateFrom"
                type="date"
                value={dateFrom}
                min={minDate || undefined}
                max={dateTo || todayString}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div className="flex min-w-[150px] flex-col gap-2">
              <label className="text-xs text-slate-500" htmlFor="articleDateTo">
                Sampai
              </label>
              <Input
                id="articleDateTo"
                type="date"
                value={dateTo}
                min={dateFrom || minDate || undefined}
                max={todayString}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setMediaType("Semua");
                setDateFrom(DEFAULT_START_DATE);
                setDateTo(todayString);
              }}
            >
              Reset filter
            </Button>
          </div>
          <div className="table-wrapper">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-sm">No</TableHead>
                  <TableHead className="text-sm">Tanggal</TableHead>
                  <TableHead className="text-sm">Headline</TableHead>
                  <TableHead className="text-sm">Spokesperson</TableHead>
                  <TableHead className="text-sm">Mainframe</TableHead>
                  <TableHead className="text-sm">Topik</TableHead>
                  <TableHead className="text-sm">Tone/Sentimen</TableHead>
                  <TableHead className="text-sm">Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((article, index) => (
                  <TableRow key={article.id}>
                    <TableCell className="text-sm">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatLongDate(article.date)}
                    </TableCell>
                    <TableCell className="text-sm">{article.title}</TableCell>
                    <TableCell className="text-sm">
                      {article.spokesperson}
                    </TableCell>
                    <TableCell className="text-sm">
                      {article.mainframe}
                    </TableCell>
                    <TableCell className="text-sm">{article.topic}</TableCell>
                    <TableCell className="text-sm">
                      <Badge
                        variant={
                          article.sentiment === "Negative"
                            ? "destructive"
                            : article.sentiment === "Positive"
                              ? "success"
                              : "outline"
                        }
                      >
                        {article.toneLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <a href={article.url} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        </>
      )}
    </Card>
  );
};

export default ArticlesPage;
