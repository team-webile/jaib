"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { dashboard } from "@/lib/api";
import { useParams } from "next/navigation";

export default function BalanceSheetPage() {
  const params = useParams();
  const orgId = Number(params.id);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!orgId) return;
    dashboard.balanceSheet(orgId, { as_of_date: asOfDate }).then(({ data }) => setData(data));
  }, [orgId, asOfDate]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Balance Sheet</h2>
        <input type="date" className="input w-auto" value={asOfDate}
          onChange={e => setAsOfDate(e.target.value)} />
      </div>

      <div className="space-y-6">
        {/* Assets */}
        <div className="card">
          <h3 className="font-semibold text-blue-700 mb-3">Assets</h3>
          {data.assets && Array.isArray((data.assets as Record<string, unknown>).accounts) &&
            ((data.assets as { accounts: Array<{ name: string; balance: number }> }).accounts).length === 0 ? (
            <p className="text-sm text-gray-400">No asset accounts</p>
          ) : (
            (data.assets as { accounts: Array<{ name: string; balance: number }> }).accounts?.map((acc, i) => (
              <div key={i} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
                <span>{acc.name}</span>
                <span className="font-medium">{fmt(acc.balance)}</span>
              </div>
            ))
          )}
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
            <span>Total Assets</span>
            <span className="text-blue-700">{fmt((data.assets as { total: number }).total)}</span>
          </div>
        </div>

        {/* Liabilities */}
        <div className="card">
          <h3 className="font-semibold text-red-700 mb-3">Liabilities</h3>
          {(data.liabilities as { accounts: Array<{ name: string; balance: number }> }).accounts?.map((acc, i) => (
            <div key={i} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
              <span>{acc.name}</span>
              <span className="font-medium">{fmt(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
            <span>Total Liabilities</span>
            <span className="text-red-700">{fmt((data.liabilities as { total: number }).total)}</span>
          </div>
        </div>

        {/* Equity */}
        <div className="card">
          <h3 className="font-semibold text-purple-700 mb-3">Equity</h3>
          {(data.equity as { accounts: Array<{ name: string; balance: number }> }).accounts?.map((acc, i) => (
            <div key={i} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
              <span>{acc.name}</span>
              <span className="font-medium">{fmt(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between py-1 text-sm border-t">
            <span>Retained Earnings</span>
            <span className="font-medium">{fmt((data.equity as { retained_earnings: number }).retained_earnings)}</span>
          </div>
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
            <span>Total Equity</span>
            <span className="text-purple-700">{fmt((data.equity as { total: number }).total)}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="card bg-gray-50">
          <div className="flex justify-between text-sm mb-2">
            <span>Total Liabilities + Equity</span>
            <span className="font-medium">{fmt(data.total_liabilities_and_equity as number)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Balanced</span>
            <span className={`font-medium ${data.is_balanced ? "text-green-600" : "text-red-600"}`}>
              {data.is_balanced ? "✓ Yes" : "✗ No"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
