"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { accounts } from "@/lib/api";
import { useParams } from "next/navigation";

interface Account {
  id: number;
  name: string;
  code: string | null;
  type: string;
  sub_type: string | null;
  description: string | null;
  is_active: boolean;
  opening_balance: string;
}

const typeColors: Record<string, string> = {
  asset: "bg-blue-50 text-blue-700",
  liability: "bg-red-50 text-red-700",
  equity: "bg-purple-50 text-purple-700",
  revenue: "bg-green-50 text-green-700",
  expense: "bg-orange-50 text-orange-700",
};

export default function AccountsPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const orgId = Number(params.id);
  const [accountsList, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "asset", sub_type: "", description: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) loadAccounts();
  }, [orgId, filter, typeFilter]);

  const loadAccounts = () => {
    const params: Record<string, string> = {};
    if (filter) params.name = filter;
    if (typeFilter) params.type = typeFilter;
    accounts.list(orgId, params).then(({ data }) => setAccounts(data.accounts));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await accounts.create(orgId, { ...form, opening_balance: "0" });
      setShowForm(false);
      setForm({ name: "", code: "", type: "asset", sub_type: "", description: "" });
      loadAccounts();
    } catch (err: unknown) {
      setError("Failed to create account");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this account?")) return;
    try {
      await accounts.delete(orgId, id);
      loadAccounts();
    } catch { alert("Cannot delete account with journal entries"); }
  };

  const fmt = (n: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Accounts</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? "Cancel" : "+ New Account"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Code</label>
              <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && <p className="col-span-2 error-text">{error}</p>}
            <div className="col-span-2">
              <button type="submit" className="btn-primary">Create Account</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Search accounts..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <select className="input max-w-[160px]" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="equity">Equity</option>
          <option value="revenue">Revenue</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Opening Balance</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {accountsList.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No accounts yet</td></tr>
            ) : accountsList.map(acc => (
              <tr key={acc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{acc.code || "—"}</td>
                <td className="px-4 py-3 font-medium">{acc.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[acc.type] || ""}`}>
                    {acc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(acc.opening_balance)}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
