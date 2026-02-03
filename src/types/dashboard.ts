import type { Article, Sentiment } from "../data/mediaData";

export type KpiSummary = {
  total: number;
  positiveShare: number;
  negativeShare: number;
  avgScore: string;
  sentimentCounts: Record<Sentiment, number>;
};

export type TrendPoint = {
  date: string;
  volume: number;
  sentiment: number;
};

export type DistributionPoint = {
  name: string;
  value: number;
};

export type SpokespersonRow = {
  name: string;
  company: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
};

export type DashboardContext = {
  filteredArticles: Article[];
  kpis: KpiSummary;
  trendData: TrendPoint[];
  sentimentData: DistributionPoint[];
  mediaData: DistributionPoint[];
  topicData: DistributionPoint[];
  spokespersonData: DistributionPoint[];
  spokespersonTable: SpokespersonRow[];
};
