import { useMemo, useState } from "react";
import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
} from "react-router-dom";
import "./App.css";
import OverviewPage from "./pages/OverviewPage";
import SummaryPage from "./pages/SummaryPage";
import MediaPage from "./pages/MediaPage";
import TopicsPage from "./pages/TopicsPage";
import SpokespersonPage from "./pages/SpokespersonPage";
import ArticlesPage from "./pages/ArticlesPage";
import { articles, sentimentScore } from "./data/mediaData";
import type { Sentiment } from "./data/mediaData";
import { Button } from "./components/ui/button";
import {
  Home,
  LayoutDashboard,
  Newspaper,
  PieChart,
  User,
  TrendingUp,
  LogOut,
} from "lucide-react";

const inferTopic = (title: string) => {
  const lower = title.toLowerCase();
  if (
    lower.includes("ai") ||
    lower.includes("digital") ||
    lower.includes("platform")
  )
    return "Digital & AI";
  if (
    lower.includes("regulatory") ||
    lower.includes("lawsuit") ||
    lower.includes("review")
  )
    return "Regulatory";
  if (lower.includes("partnership") || lower.includes("contract"))
    return "Partnerships";
  if (
    lower.includes("growth") ||
    lower.includes("margins") ||
    lower.includes("capex")
  )
    return "Financial";
  if (
    lower.includes("health") ||
    lower.includes("clinic") ||
    lower.includes("patient")
  )
    return "Healthcare";
  if (
    lower.includes("energy") ||
    lower.includes("offshore") ||
    lower.includes("carbon")
  )
    return "Energy";
  return "Corporate Updates";
};

const spokespersonMap: Record<string, string> = {
  "Aurora Mobile": "Lina Hartono",
  "Nimbus Energy": "Rafael Suryo",
  "Keystone Health": "Dr. Maya Putri",
};

const DashboardLayout = () => {
  const dates = useMemo(
    () => articles.map((article) => article.date).sort(),
    [],
  );
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const [dateFrom] = useState(minDate);
  const [dateTo] = useState(maxDate);
  const [companyFilter] = useState("All");
  const [sentimentFilter] = useState("All");

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const withinDateRange =
        article.date >= dateFrom && article.date <= dateTo;
      const matchesCompany =
        companyFilter === "All" || article.company === companyFilter;
      const matchesSentiment =
        sentimentFilter === "All" || article.sentiment === sentimentFilter;
      return withinDateRange && matchesCompany && matchesSentiment;
    });
  }, [dateFrom, dateTo, companyFilter, sentimentFilter]);

  const kpis = useMemo(() => {
    const total = filteredArticles.length;
    const sentimentCounts = filteredArticles.reduce(
      (acc, article) => {
        acc[article.sentiment] += 1;
        return acc;
      },
      {
        Positive: 0,
        Neutral: 0,
        Negative: 0,
      } as Record<Sentiment, number>,
    );

    const avgScore = total
      ? (
          filteredArticles.reduce(
            (acc, article) => acc + sentimentScore[article.sentiment],
            0,
          ) / total
        ).toFixed(2)
      : "0.00";

    return {
      total,
      positiveShare: total
        ? Math.round((sentimentCounts.Positive / total) * 100)
        : 0,
      negativeShare: total
        ? Math.round((sentimentCounts.Negative / total) * 100)
        : 0,
      avgScore,
      sentimentCounts,
    };
  }, [filteredArticles]);

  const trendData = useMemo(() => {
    const grouped = new Map<
      string,
      { date: string; volume: number; score: number }
    >();
    filteredArticles.forEach((article) => {
      const current = grouped.get(article.date) || {
        date: article.date,
        volume: 0,
        score: 0,
      };
      current.volume += 1;
      current.score += sentimentScore[article.sentiment];
      grouped.set(article.date, current);
    });
    return Array.from(grouped.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        sentiment: Number((item.score / item.volume).toFixed(2)),
      }));
  }, [filteredArticles]);

  const sentimentData = useMemo(() => {
    return (Object.keys(kpis.sentimentCounts) as Sentiment[]).map((key) => ({
      name: key,
      value: kpis.sentimentCounts[key],
    }));
  }, [kpis.sentimentCounts]);

  const mediaData = useMemo(() => {
    const counts = filteredArticles.reduce<Record<string, number>>(
      (acc, item) => {
        acc[item.media] = (acc[item.media] || 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredArticles]);

  const topicData = useMemo(() => {
    const counts = filteredArticles.reduce<Record<string, number>>(
      (acc, item) => {
        const topic = inferTopic(item.title);
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      },
      {},
    );

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredArticles]);

  const spokespersonTable = useMemo(() => {
    const rows = filteredArticles.reduce<
      Record<
        string,
        {
          name: string;
          company: string;
          total: number;
          positive: number;
          neutral: number;
          negative: number;
        }
      >
    >((acc, article) => {
      const name = spokespersonMap[article.company];
      if (!name) return acc;
      const entry = acc[name] || {
        name,
        company: article.company,
        total: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      };
      entry.total += 1;
      if (article.sentiment === "Positive") entry.positive += 1;
      if (article.sentiment === "Neutral") entry.neutral += 1;
      if (article.sentiment === "Negative") entry.negative += 1;
      acc[name] = entry;
      return acc;
    }, {});

    return Object.values(rows);
  }, [filteredArticles]);

  const spokespersonData = useMemo(() => {
    return spokespersonTable.map((row) => ({
      name: row.name,
      value: row.total,
    }));
  }, [spokespersonTable]);

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo w-8" src="/logo.svg" alt="Client logo" />
        </div>
        <nav className="nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Home className="nav-icon" />
            Beranda
          </NavLink>
          <NavLink
            to="/rangkuman"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <LayoutDashboard className="nav-icon" />
            Rangkuman
          </NavLink>
          <NavLink
            to="/media"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <TrendingUp className="nav-icon" />
            Media
          </NavLink>
          <NavLink
            to="/topik"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <PieChart className="nav-icon" />
            Topik
          </NavLink>
          <NavLink
            to="/spokesperson"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <User className="nav-icon" />
            Spokesperson
          </NavLink>
          <NavLink
            to="/rekap-pemberitaan"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Newspaper className="nav-icon" />
            Rekap Pemberitaan
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <Button variant="outline" className="logout-button">
            <LogOut className="nav-icon" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="content">
        <header className="header flex flex-col items-start">
          <div className="bg-white flex justify-between items-center rounded-lg p-4 shadow-sm mb-4 w-full">
            <img className="h-8" src="/tbs-logo.png" alt="TBS Logo" />
            <div className="header-actions">
              <Button>Export Data</Button>
            </div>
          </div>
        </header>

        <Outlet
          context={{
            filteredArticles,
            kpis,
            trendData,
            sentimentData,
            mediaData,
            topicData,
            spokespersonData,
            spokespersonTable,
          }}
        />
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="rangkuman" element={<SummaryPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="topik" element={<TopicsPage />} />
          <Route path="spokesperson" element={<SpokespersonPage />} />
          <Route path="rekap-pemberitaan" element={<ArticlesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
