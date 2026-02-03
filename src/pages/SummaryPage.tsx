import { useOutletContext } from "react-router-dom";
import type { DashboardContext } from "../types/dashboard";
import { sentimentColors } from "../data/mediaData";
import { Card, CardContent } from "../components/ui/card";

const SummaryPage = () => {
  const { kpis, sentimentData, mediaData, topicData, filteredArticles } =
    useOutletContext<DashboardContext>();

  const total = kpis.total || 1;
  const topMedia = mediaData[0];
  const topTopic = topicData[0];
  const latestDate = filteredArticles.length
    ? filteredArticles[filteredArticles.length - 1].date
    : undefined;

  return (
    <>
      <section className="kpi-grid">
        <Card className="kpi-card border-none shadow-none">
          <CardContent className="p-0">
            <p>Total coverage</p>
            <h2>{kpis.total}</h2>
            <span className="kpi-meta">Mentions captured</span>
          </CardContent>
        </Card>
        <Card className="kpi-card border-none shadow-none">
          <CardContent className="p-0">
            <p>Positive share</p>
            <h2>{kpis.positiveShare}%</h2>
            <span className="kpi-meta">Coverage perception</span>
          </CardContent>
        </Card>
        <Card className="kpi-card border-none shadow-none">
          <CardContent className="p-0">
            <p>Negative share</p>
            <h2>{kpis.negativeShare}%</h2>
            <span className="kpi-meta">Potential risk</span>
          </CardContent>
        </Card>
        <Card className="kpi-card border-none shadow-none">
          <CardContent className="p-0">
            <p>Avg. sentiment</p>
            <h2>{kpis.avgScore}</h2>
            <span className="kpi-meta">Weighted score</span>
          </CardContent>
        </Card>
      </section>

      <section className="summary-grid">
        <Card className="panel border-none shadow-none">
          <div className="panel-header">
            <h3>Sentiment mix</h3>
            <span className="panel-meta">Distribution overview</span>
          </div>
          <div className="summary-list">
            {sentimentData.map((item) => {
              const percent = Math.round((item.value / total) * 100);
              return (
                <div key={item.name} className="summary-row">
                  <div className="summary-label">
                    <span
                      className="status-dot"
                      style={{
                        backgroundColor:
                          sentimentColors[
                            item.name as keyof typeof sentimentColors
                          ],
                      }}
                    />
                    {item.name}
                  </div>
                  <div className="summary-bar">
                    <span
                      style={{
                        width: `${percent}%`,
                        backgroundColor:
                          sentimentColors[
                            item.name as keyof typeof sentimentColors
                          ],
                      }}
                    />
                  </div>
                  <strong>{percent}%</strong>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="panel border-none shadow-none">
          <div className="panel-header">
            <h3>Key highlights</h3>
            <span className="panel-meta">Pitch-ready insights</span>
          </div>
          <ul className="highlight-list">
            <li>
              <strong>{topMedia?.name ?? "N/A"}</strong> is the most active
              source with <strong>{topMedia?.value ?? 0}</strong> mentions.
            </li>
            <li>
              Coverage is centered around{" "}
              <strong>{topTopic?.name ?? "N/A"}</strong> topics in this period.
            </li>
            <li>
              Latest captured coverage date:{" "}
              <strong>{latestDate ?? "N/A"}</strong>.
            </li>
            <li>
              Overall sentiment score sits at <strong>{kpis.avgScore}</strong>,
              reflecting a mostly{" "}
              {kpis.positiveShare >= kpis.negativeShare
                ? "positive"
                : "cautious"}{" "}
              tone.
            </li>
          </ul>
        </Card>
      </section>
    </>
  );
};

export default SummaryPage;
