import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  fetchPublishedSheetRows,
  SHEET_REFRESH_MS,
  type SheetApiRow,
} from "../lib/publishedSheet";

type SheetRow = {
  publishedDate: string;
  spokesperson: string;
  sentiment: string;
};

type SentimentLabel = "Positif" | "Netral" | "Negatif";

const normalizeName = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (lower === "-" || lower === "—" || lower === "null" || lower === "n/a")
    return "";
  return trimmed;
};

const mapSentiment = (value: string): SentimentLabel => {
  const lower = value.toLowerCase();
  if (lower.includes("positif") || lower.includes("positive")) return "Positif";
  if (lower.includes("negatif") || lower.includes("negative")) return "Negatif";
  return "Netral";
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

const DEFAULT_START_DATE = "2025-01-01";

const SpokespersonPage = () => {
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [spokespersonPage, setSpokespersonPage] = useState(1);
  const [positivePage, setPositivePage] = useState(1);
  const [negativePage, setNegativePage] = useState(1);

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
        const spokespersonKey = Object.keys(normalizedRow).find((key) =>
          [
            "SPOKEPERSON",
            "SPOKESPERSON",
            "NARASUMBER",
            "JURU BICARA",
            "JURUBICARA",
            "JUBIR",
          ].some((token) => key.includes(token)),
        );
        const rawSpokesperson = String(
          getValue("SPOKEPERSON") ||
            getValue("SPOKESPERSON") ||
            getValue("NARASUMBER") ||
            getValue("JURU BICARA") ||
            getValue("JURUBICARA") ||
            getValue("JUBIR") ||
            (spokespersonKey ? normalizedRow[spokespersonKey] : "") ||
            "",
        ).trim();
        const normalizedSpokesperson = normalizeName(rawSpokesperson);

        return {
          publishedDate: normalizedDate,
          spokesperson: normalizedSpokesperson,
          sentiment: mapSentiment(String(getValue("TONE") || "")),
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

  const [minDate] = useMemo(() => {
    const dates = rows
      .map((item) => item.publishedDate)
      .filter(Boolean)
      .sort();
    return [DEFAULT_START_DATE, dates[dates.length - 1] ?? ""];
  }, [rows]);

  const todayString = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const withinDate =
        (!dateFrom || row.publishedDate >= dateFrom) &&
        (!dateTo || row.publishedDate <= dateTo);
      return withinDate;
    });
  }, [rows, dateFrom, dateTo]);

  const spokespersonDistribution = useMemo(() => {
    const counts = filteredRows.reduce<Record<string, number>>((acc, row) => {
      if (!row.spokesperson) return acc;
      acc[row.spokesperson] = (acc[row.spokesperson] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const spokespersonPageSize = 10;
  const totalSpokespersonPages = Math.max(
    1,
    Math.ceil(spokespersonDistribution.length / spokespersonPageSize),
  );

  useEffect(() => {
    setSpokespersonPage(1);
    setPositivePage(1);
    setNegativePage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (spokespersonPage > totalSpokespersonPages) {
      setSpokespersonPage(totalSpokespersonPages);
    }
  }, [spokespersonPage, totalSpokespersonPages]);

  const spokespersonChartData = useMemo(
    () =>
      spokespersonDistribution.slice(
        (spokespersonPage - 1) * spokespersonPageSize,
        spokespersonPage * spokespersonPageSize,
      ),
    [spokespersonDistribution, spokespersonPage, spokespersonPageSize],
  );

  const positiveDistribution = useMemo(() => {
    const counts = filteredRows
      .filter((row) => row.sentiment === "Positif" && row.spokesperson)
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.spokesperson] = (acc[row.spokesperson] || 0) + 1;
        return acc;
      }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const negativeDistribution = useMemo(() => {
    const counts = filteredRows
      .filter((row) => row.sentiment === "Negatif" && row.spokesperson)
      .reduce<Record<string, number>>((acc, row) => {
        acc[row.spokesperson] = (acc[row.spokesperson] || 0) + 1;
        return acc;
      }, {});
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRows]);

  const totalPositivePages = Math.max(
    1,
    Math.ceil(positiveDistribution.length / spokespersonPageSize),
  );
  const totalNegativePages = Math.max(
    1,
    Math.ceil(negativeDistribution.length / spokespersonPageSize),
  );

  useEffect(() => {
    if (positivePage > totalPositivePages) {
      setPositivePage(totalPositivePages);
    }
  }, [positivePage, totalPositivePages]);

  useEffect(() => {
    if (negativePage > totalNegativePages) {
      setNegativePage(totalNegativePages);
    }
  }, [negativePage, totalNegativePages]);

  const topPositive = useMemo(
    () =>
      positiveDistribution.slice(
        (positivePage - 1) * spokespersonPageSize,
        positivePage * spokespersonPageSize,
      ),
    [positiveDistribution, positivePage, spokespersonPageSize],
  );

  const topNegative = useMemo(
    () =>
      negativeDistribution.slice(
        (negativePage - 1) * spokespersonPageSize,
        negativePage * spokespersonPageSize,
      ),
    [negativeDistribution, negativePage, spokespersonPageSize],
  );

  const maxPositive = Math.max(1, ...topPositive.map((item) => item.value));
  const maxNegative = Math.max(1, ...topNegative.map((item) => item.value));

  if (loading) {
    return (
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-80 rounded-2xl border bg-white shadow-sm animate-pulse"
          />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h3 className="text-xl font-semibold">Data gagal dimuat</h3>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex min-w-[150px] flex-col gap-2">
          <label
            className="text-xs text-slate-500"
            htmlFor="spokespersonDateFrom"
          >
            Dari tanggal
          </label>
          <Input
            id="spokespersonDateFrom"
            type="date"
            value={dateFrom}
            min={minDate || undefined}
            max={dateTo || todayString}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div className="flex min-w-[150px] flex-col gap-2">
          <label
            className="text-xs text-slate-500"
            htmlFor="spokespersonDateTo"
          >
            Sampai
          </label>
          <Input
            id="spokespersonDateTo"
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={todayString}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setDateFrom(DEFAULT_START_DATE);
            setDateTo(todayString);
          }}
        >
          Reset filter
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        <Card className="rounded-2xl border bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Sebaran Spokesperson</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Jumlah pemberitaan</span>
              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpokespersonPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={spokespersonPage === 1}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-500">
                  {spokespersonPage} / {totalSpokespersonPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpokespersonPage((prev) =>
                      Math.min(totalSpokespersonPages, prev + 1),
                    )
                  }
                  disabled={spokespersonPage === totalSpokespersonPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full px-3 pb-6 ">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={spokespersonChartData}
                layout="vertical"
                margin={{ top: 10, right: 12, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ fontSize: 12 }}
                  tickMargin={4}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between gap-2 border-t px-6 py-3 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSpokespersonPage((prev) => Math.max(1, prev - 1))
              }
              disabled={spokespersonPage === 1}
            >
              Prev
            </Button>
            <span className="text-xs text-slate-500">
              {spokespersonPage} / {totalSpokespersonPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSpokespersonPage((prev) =>
                  Math.min(totalSpokespersonPages, prev + 1),
                )
              }
              disabled={spokespersonPage === totalSpokespersonPages}
            >
              Next
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Top Positif Spokesperson</h3>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPositivePage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={positivePage === 1}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-500">
                  {positivePage} / {totalPositivePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPositivePage((prev) =>
                      Math.min(totalPositivePages, prev + 1),
                    )
                  }
                  disabled={positivePage === totalPositivePages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
          <hr />
          <div className="space-y-3 px-6 pb-6 pt-2">
            {topPositive.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data.</p>
            ) : (
              topPositive.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-xs text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-slate-500">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-50">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(item.value / maxPositive) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t px-6 py-3 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPositivePage((prev) => Math.max(1, prev - 1))}
              disabled={positivePage === 1}
            >
              Prev
            </Button>
            <span className="text-xs text-slate-500">
              {positivePage} / {totalPositivePages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPositivePage((prev) =>
                  Math.min(totalPositivePages, prev + 1),
                )
              }
              disabled={positivePage === totalPositivePages}
            >
              Next
            </Button>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 p-6 pb-2">
            <h3>Top Negatif Spokesperson</h3>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNegativePage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={negativePage === 1}
                >
                  Prev
                </Button>
                <span className="text-xs text-slate-500">
                  {negativePage} / {totalNegativePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setNegativePage((prev) =>
                      Math.min(totalNegativePages, prev + 1),
                    )
                  }
                  disabled={negativePage === totalNegativePages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
          <hr />
          <div className="space-y-3 px-6 pb-6 pt-2">
            {topNegative.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada data.</p>
            ) : (
              topNegative.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-xs text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-slate-500">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-rose-50">
                    <div
                      className="h-2 rounded-full bg-rose-500"
                      style={{ width: `${(item.value / maxNegative) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t px-6 py-3 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNegativePage((prev) => Math.max(1, prev - 1))}
              disabled={negativePage === 1}
            >
              Prev
            </Button>
            <span className="text-xs text-slate-500">
              {negativePage} / {totalNegativePages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setNegativePage((prev) =>
                  Math.min(totalNegativePages, prev + 1),
                )
              }
              disabled={negativePage === totalNegativePages}
            >
              Next
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default SpokespersonPage;
