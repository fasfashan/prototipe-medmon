import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  fetchPublishedSheetRows,
  SHEET_REFRESH_MS,
  type SheetApiRow,
} from "../lib/publishedSheet";

type SheetRow = {
  publishedDate: string;
  media: string;
  title: string;
  summary: string;
  spokesperson: string;
  mainframe: string;
  topic: string;
  sentiment: string;
  url: string;
  company: string;
};

const SENTIMENT_LABELS = ["Positif", "Netral", "Negatif"] as const;
type SentimentLabel = (typeof SENTIMENT_LABELS)[number];

const sentimentColors: Record<SentimentLabel, string> = {
  Positif: "#22c55e",
  Netral: "#94a3b8",
  Negatif: "#ef4444",
};

const donutPalette = [
  "#0ea5e9",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#14b8a6",
  "#f97316",
  "#e11d48",
  "#6366f1",
];

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

const DEFAULT_START_DATE = "2025-01-01";

const formatDate = (value: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const mapSentiment = (value: string): SentimentLabel => {
  const lower = value.toLowerCase();
  if (lower.includes("positif") || lower.includes("positive")) return "Positif";
  if (lower.includes("negatif") || lower.includes("negative")) return "Negatif";
  return "Netral";
};

const clampText = (value: string, maxLength: number) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
};

const OverviewPage = () => {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [sentimentFilter, setSentimentFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState(
    "TANGGAL" as "TANGGAL" | "MEDIA" | "HEADLINE" | "TONE" | "LINK",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchSheet = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const rows = await fetchPublishedSheetRows();
      const mapped = rows.map((row: SheetApiRow) => {
        const normalizedRow: Record<string, string> = {};
        Object.entries(row).forEach(([key, value]) => {
          if (!key) return;
          normalizedRow[key.trim().toUpperCase()] = String(value ?? "");
        });

        const getValue = (column: string) => normalizedRow[column] ?? "";

        const rawDate = String(getValue("TANGGAL"));
        const normalizedDate = normalizeDate(rawDate);

        return {
          publishedDate: normalizedDate,
          media: String(getValue("MEDIA") || "N/A"),
          title: String(getValue("HEADLINE") || "Untitled"),
          summary: String(getValue("SUMMARY") || ""),
          spokesperson: String(getValue("SPOKESPERSON") || ""),
          mainframe: String(getValue("MAINFRAME") || "Lainnya"),
          topic: String(getValue("TOPIK") || "Lainnya"),
          sentiment: mapSentiment(String(getValue("TONE") || "")),
          url: String(getValue("LINK") || ""),
          company: String(getValue("JENIS") || "Umum"),
        };
      });

      setRows(mapped);

      const today = new Date();
      const todayString = today.toISOString().slice(0, 10);
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

  const companies = useMemo(() => {
    if (rows.length === 0) return ["All", "Client A", "Client B"];
    const uniqueCompanies = Array.from(new Set(rows.map((row) => row.company)));
    return ["All", ...uniqueCompanies];
  }, [rows]);

  const [minDate, maxDate] = useMemo(() => {
    const dates = rows
      .map((item) => item.publishedDate)
      .filter(Boolean)
      .sort();
    const max = dates[dates.length - 1] ?? "";
    return [DEFAULT_START_DATE, max];
  }, [rows]);

  const todayString = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const withinDate =
        (!dateFrom || row.publishedDate >= dateFrom) &&
        (!dateTo || row.publishedDate <= dateTo);
      const matchesCompany =
        companyFilter === "All" || row.company === companyFilter;
      const matchesSentiment =
        sentimentFilter === "All" || row.sentiment === sentimentFilter;
      return withinDate && matchesCompany && matchesSentiment;
    });
  }, [rows, dateFrom, dateTo, companyFilter, sentimentFilter]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, companyFilter, sentimentFilter]);

  useEffect(() => {
    setSortDirection(sortBy === "TANGGAL" ? "desc" : "asc");
  }, [sortBy]);

  const sentimentCounts = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc[row.sentiment as SentimentLabel] += 1;
        return acc;
      },
      { Positif: 0, Netral: 0, Negatif: 0 } as Record<SentimentLabel, number>,
    );
  }, [filteredRows]);

  const totalMentions = filteredRows.length;
  const positifShare = totalMentions
    ? Math.round((sentimentCounts.Positif / totalMentions) * 100)
    : 0;
  const netralShare = totalMentions
    ? Math.round((sentimentCounts.Netral / totalMentions) * 100)
    : 0;
  const negatifShare = totalMentions
    ? Math.round((sentimentCounts.Negatif / totalMentions) * 100)
    : 0;

  const sentimentDistribution = useMemo(
    () =>
      SENTIMENT_LABELS.map((label) => ({
        name: label,
        value: sentimentCounts[label],
      })),
    [sentimentCounts],
  );

  const dailyTrend = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; Positif: number; Netral: number; Negatif: number }
    >();

    filteredRows.forEach((row) => {
      const key = row.publishedDate || "Unknown";
      const entry = grouped.get(key) || {
        date: key,
        Positif: 0,
        Netral: 0,
        Negatif: 0,
      };
      entry[row.sentiment as SentimentLabel] += 1;
      grouped.set(key, entry);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }, [filteredRows]);

  const mainframeDistribution = useMemo(() => {
    const counts = filteredRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.mainframe] = (acc[row.mainframe] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const topicDistribution = useMemo(() => {
    const counts = filteredRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.topic] = (acc[row.topic] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const sortedRows = useMemo(() => {
    const valueFor = (row: SheetRow) => {
      switch (sortBy) {
        case "MEDIA":
          return row.media;
        case "HEADLINE":
          return row.title;
        case "TONE":
          return row.sentiment;
        case "LINK":
          return row.url;
        default:
          return row.publishedDate;
      }
    };

    return [...filteredRows].sort((a, b) => {
      const left = valueFor(a) || "";
      const right = valueFor(b) || "";
      const comparison = left.localeCompare(right, "id-ID", {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortBy, sortDirection]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pagedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  const handleReset = () => {
    setDateFrom(DEFAULT_START_DATE);
    setDateTo(todayString);
    setCompanyFilter("All");
    setSentimentFilter("All");
  };

  const renderLegend = (
    items: { name: string; value: number }[],
    getColor: (index: number, name: string) => string,
  ) => (
    <div className="flex flex-col gap-2 text-xs text-slate-600">
      {items.map((item, index) => (
        <div
          key={item.name}
          className="grid grid-cols-[12px_1fr_auto] items-center gap-2"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getColor(index, item.name) }}
          />
          <span className="truncate">{item.name}</span>
          <span className="font-semibold text-slate-900">{item.value}</span>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap gap-4 rounded-2xl border bg-white p-4 shadow-sm">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 flex-1 rounded-xl bg-slate-100 animate-pulse"
            />
          ))}
          <div className="h-10 w-36 rounded-xl bg-slate-100 animate-pulse" />
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-2xl bg-white shadow-sm border animate-pulse"
            />
          ))}
        </section>
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-80 rounded-2xl bg-white shadow-sm border animate-pulse"
            />
          ))}
        </section>
        <section className="h-96 rounded-2xl bg-white shadow-sm border animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h3 className="text-xl font-semibold">Data gagal dimuat</h3>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <Button onClick={() => window.location.reload()}>Coba lagi</Button>
      </div>
    );
  }

  return (
    <>
      <section className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex min-w-[150px] flex-col gap-2">
          <label className="text-xs text-slate-500" htmlFor="dateFrom">
            Dari tanggal
          </label>
          <Input
            id="dateFrom"
            type="date"
            value={dateFrom}
            min={minDate || undefined}
            max={dateTo || todayString}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div className="flex min-w-[150px] flex-col gap-2">
          <label className="text-xs text-slate-500" htmlFor="dateTo">
            Sampai
          </label>
          <Input
            id="dateTo"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={todayString}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
        <div className="flex min-w-[170px] flex-col gap-2">
          <label className="text-xs text-slate-500" htmlFor="company">
            Media
          </label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger id="company">
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-[170px] flex-col gap-2">
          <label className="text-xs text-slate-500" htmlFor="sentiment">
            Sentimen
          </label>
          <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
            <SelectTrigger id="sentiment">
              <SelectValue placeholder="Sentimen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua</SelectItem>
              {SENTIMENT_LABELS.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={handleReset}>
          Reset filter
        </Button>
        <Button onClick={fetchSheet}>Refresh data</Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mt-4">
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Total Pemberitaan</p>
            <h2 className="text-2xl font-bold">{totalMentions}</h2>
            <span className="text-xs text-slate-400">Artikel terpantau</span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">% Positif</p>
            <h2 className="text-2xl font-bold">{positifShare}%</h2>
            <span className="text-xs text-slate-400">Sentimen positif</span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">% Netral</p>
            <h2 className="text-2xl font-bold">{netralShare}%</h2>
            <span className="text-xs text-slate-400">Sentimen netral</span>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-white shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">% Negatif</p>
            <h2 className="text-2xl font-bold">{negatifShare}%</h2>
            <span className="text-xs text-slate-400">Sentimen negatif</span>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 mt-4">
        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Pergerakan Sentimen</h3>
            <span className="text-xs text-slate-400">
              Jumlah pemberitaan per hari
            </span>
          </div>
          <div className="h-[260px] w-full px-6">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={dailyTrend}
                margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Tanggal: ${formatDate(label)}`}
                />
                <Line
                  type="monotone"
                  dataKey="Positif"
                  stroke={sentimentColors.Positif}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Netral"
                  stroke={sentimentColors.Netral}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Negatif"
                  stroke={sentimentColors.Negatif}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 pb-6">
            {renderLegend(
              sentimentDistribution,
              (_, name) => sentimentColors[name as SentimentLabel],
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Sebaran Sentimen</h3>
            <span className="text-xs text-slate-400">Komposisi tone</span>
          </div>
          <div className="h-[260px] w-full px-6">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={sentimentDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {sentimentDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={sentimentColors[entry.name as SentimentLabel]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="px-6 pb-6">
            {renderLegend(
              sentimentDistribution,
              (_, name) => sentimentColors[name as SentimentLabel],
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Sebaran Mainframe</h3>
            <span className="text-xs text-slate-400">Kategori pemberitaan</span>
          </div>
          <div className="h-[260px] w-full px-6">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={mainframeDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {mainframeDistribution.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={donutPalette[index % donutPalette.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="max-h-40 overflow-y-auto px-6 pb-6">
            {renderLegend(
              mainframeDistribution,
              (index) => donutPalette[index % donutPalette.length],
            )}
          </div>
        </Card>

        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Sebaran Topik</h3>
            <span className="text-xs text-slate-400">Topik pemberitaan</span>
          </div>
          <div className="h-[260px] w-full px-6">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Tooltip />
                <Pie
                  data={topicDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={1}
                  minAngle={2}
                  isAnimationActive={false}
                >
                  {topicDistribution.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={donutPalette[(index + 3) % donutPalette.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="max-h-40 overflow-y-auto px-6 pb-6">
            {renderLegend(
              topicDistribution,
              (index) => donutPalette[(index + 3) % donutPalette.length],
            )}
          </div>
        </Card>
      </section>

      <Card className="rounded-2xl border bg-white shadow-sm mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 pb-2">
          <div className="space-y-1">
            <h3>Rekap Pemberitaan</h3>
            <span className="text-xs text-slate-400">
              {totalMentions} pemberitaan
            </span>
          </div>
          <div className=" flex items-center gap-3">
            <label className="text-xs text-nowrap text-slate-500">
              Urutkan menurut
            </label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Urutkan menurut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TANGGAL">Tanggal</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="HEADLINE">Headline</SelectItem>
                <SelectItem value="TONE">Tone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6">
          {pagedRows.map((row, index) => (
            <Card
              key={`${row.publishedDate}-${row.title}-${index}`}
              className="rounded-2xl border bg-slate-50 shadow-none"
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-900">
                    {row.media}
                  </span>
                  <span>{formatDate(row.publishedDate)}</span>
                </div>
                <h4 className="text-base font-semibold text-slate-900">
                  {row.title}
                </h4>
                <p className="text-sm text-slate-600">
                  {clampText(row.summary || "Ringkasan belum tersedia.", 160)}
                </p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Badge
                    variant={
                      row.sentiment === "Negatif"
                        ? "destructive"
                        : row.sentiment === "Positif"
                          ? "success"
                          : "outline"
                    }
                  >
                    {row.sentiment}
                  </Badge>
                  {row.url ? (
                    <a
                      className="text-sm font-medium text-rose-500 hover:text-rose-600"
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Baca selengkapnya
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Link tidak tersedia
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6 text-sm text-slate-500">
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Sebelumnya
          </Button>
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Berikutnya
          </Button>
        </div>
      </Card>
    </>
  );
};

export default OverviewPage;
