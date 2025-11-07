import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Card } from "../components/ui";

interface AnalyticsSummary {
  variant: string;
  action: string;
  event_count: number;
  unique_sessions: number;
  event_date: string;
}

interface VariantStats {
  variant: string;
  pageViews: number;
  ctaClicks: number;
  signups: number;
  purchases: number;
  conversionRate: number;
}

export function Analytics() {
  const [, setSummaryData] = useState<AnalyticsSummary[]>([]);
  const [variantStats, setVariantStats] = useState<VariantStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from("analytics_summary")
        .select("*")
        .order("event_date", { ascending: false });

      if (error) throw error;

      setSummaryData(data || []);
      calculateVariantStats(data || []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateVariantStats = (data: AnalyticsSummary[]) => {
    const variants = ["A", "B", "C"];
    const stats: VariantStats[] = variants.map((variant) => {
      const variantData = data.filter((d) => d.variant === variant);

      const pageViews = variantData
        .filter((d) => d.action === "page_view")
        .reduce((sum, d) => sum + d.unique_sessions, 0);

      const ctaClicks = variantData
        .filter((d) => d.action === "cta_click")
        .reduce((sum, d) => sum + d.event_count, 0);

      const signups = variantData
        .filter((d) => d.action === "signup")
        .reduce((sum, d) => sum + d.event_count, 0);

      const purchases = variantData
        .filter((d) => d.action === "purchase")
        .reduce((sum, d) => sum + d.event_count, 0);

      const conversionRate = pageViews > 0 ? (ctaClicks / pageViews) * 100 : 0;

      return {
        variant,
        pageViews,
        ctaClicks,
        signups,
        purchases,
        conversionRate,
      };
    });

    setVariantStats(stats);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-600 dark:text-neutral-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">
          A/B Testing Analytics
        </h1>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {variantStats.map((stats) => (
            <Card key={stats.variant} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Variant {stats.variant}
                </h2>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                  {stats.conversionRate.toFixed(1)}% CTR
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Page Views</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {stats.pageViews}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">CTA Clicks</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {stats.ctaClicks}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Signups</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {stats.signups}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600 dark:text-neutral-400">Purchases</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-bold">
                    {stats.purchases}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
            Test Performance Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left py-3 px-4 text-neutral-600 dark:text-neutral-400">Variant</th>
                  <th className="text-right py-3 px-4 text-neutral-600 dark:text-neutral-400">Views</th>
                  <th className="text-right py-3 px-4 text-neutral-600 dark:text-neutral-400">Clicks</th>
                  <th className="text-right py-3 px-4 text-neutral-600 dark:text-neutral-400">CTR</th>
                  <th className="text-right py-3 px-4 text-neutral-600 dark:text-neutral-400">Signups</th>
                  <th className="text-right py-3 px-4 text-neutral-600 dark:text-neutral-400">Purchases</th>
                </tr>
              </thead>
              <tbody>
                {variantStats.map((stats) => (
                  <tr
                    key={stats.variant}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100">
                      Variant {stats.variant}
                    </td>
                    <td className="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {stats.pageViews}
                    </td>
                    <td className="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {stats.ctaClicks}
                    </td>
                    <td className="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {stats.conversionRate.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {stats.signups}
                    </td>
                    <td className="text-right py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {stats.purchases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Testing Guidelines:</strong> Run tests for minimum 2 weeks or 1000 visitors per variant.
            A variant is considered successful if it achieves +15% improvement in CTR or +25% in purchases.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
