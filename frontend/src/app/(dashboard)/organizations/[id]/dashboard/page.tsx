"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { dashboard } from "@/lib/api";

export default function OrganizationDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useOrganizationParams();
  const [summary, setSummary] = useState<Record<string, number> | null>(null);

  const orgId = params.id;

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!user.organizations.some(o => o.id === Number(orgId))) {
      router.push("/dashboard");
    }
  }, [user, loading, orgId, router]);

  useEffect(() => {
    if (!orgId) return;
    dashboard.summary(Number(orgId)).then(({ data }) => setSummary(data.summary));
  }, [orgId]);

  if (loading || !summary) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Assets" value={fmt(summary.total_assets)} />
        <StatCard label="Total Liabilities" value={fmt(summary.total_liabilities)} />
        <StatCard label="Net Income" value={fmt(summary.net_income)} />
        <StatCard label="Total Revenue" value={fmt(summary.total_revenue)} />
        <StatCard label="Total Expenses" value={fmt(summary.total_expenses)} />
        <StatCard label="Total Equity" value={fmt(summary.total_equity)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-2">Accounts</h3>
          <p className="text-2xl font-bold">{summary.account_count}</p>
          <p className="text-sm text-gray-500">Active accounts</p>
        </div>
        <div className="card">
          <h3 className="font-medium text-gray-700 mb-2">Journal Entries</h3>
          <p className="text-2xl font-bold">{summary.entry_count}</p>
          <p className="text-sm text-gray-500">Posted entries</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

function useOrganizationParams() {
  const [params, setParams] = useState({ id: null as string | null });
  useEffect(() => {
    const id = window.location.pathname.split("/")[2];
    setParams({ id });
  }, []);
  return params;
}
