"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { dashboard } from "@/lib/api";
import { useParams } from "next/navigation";

export default function IncomeStatementPage() {
  const params = useParams();
  const orgId = Number(params.id);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const today = new Date();
  const [fromDate, setFromDate] = useState(`${today.getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    if (!orgId) return;
    dashboard.incomeStatement(orgId, { from_date: fromDate, to_date: toDate }).then(({ data }) => setData(data));
  }, [orgId, fromDate, toDate]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  if (!data) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Loading...</p></div>;

  const netIncome = data.net_income as number;
  const isProfit = netIncome >= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Income Statement</h2>
        <div className="flex gap-2 items-center">
          <input type="date" className="input w-auto" value={fromDate}
            onChange={e => setFromDate(e.target.value)} />
          <span className="text-gray-400">to</span>
          <input type="date" className="input w-auto" value={toDate}
            onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-6">
        {/* Revenue */}
        <div className="card">
          <h3 className="font-semibold text-green-700 mb-3">Revenue</h3>
          {(data.revenue as { accounts: Array<{ name: string; balance: number }> }).accounts?.map((acc, i) => (
            <div key={i} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
              <span>{acc.name}</span>
              <span className="font-medium text-green-600">{fmt(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
            <span>Total Revenue</span>
            <span className="text-green-700">{fmt((data.revenue as { total: number }).total)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <h3 className="font-semibold text-orange-700 mb-3">Expenses</h3>
          {(data.expenses as { accounts: Array<{ name: string; balance: number }> }).accounts?.map((acc, i) => (
            <div key={i} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
              <span>{acc.name}</span>
              <span className="font-medium text-orange-600">{fmt(acc.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
            <span>Total Expenses</span>
            <span className="text-orange-700">{fmt((data.expenses as { total: number }).total)}</span>
          </div>
        </div>

        {/* Net Income */}
        <div className={`card ${isProfit ? "bg-green-50" : "bg-red-50"}`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-lg">Net Income</span>
            <span className={`text-xl font-bold ${isProfit ? "text-green-700" : "text-red-700"}`}>
              {fmt(netIncome)}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isProfit ? "Profit" : "Loss"} for the period
          </p>
        </div>
      </div>
    </div>
  );
}
