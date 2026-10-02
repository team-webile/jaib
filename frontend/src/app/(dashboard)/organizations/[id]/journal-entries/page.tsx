"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { journalEntries } from "@/lib/api";
import { useParams } from "next/navigation";

interface JELine {
  account_id: number;
  account_name: string;
  debit: string;
  credit: string;
  memo: string | null;
}

interface JournalEntry {
  id: number;
  entry_number: string;
  date: string;
  reference: string | null;
  description: string | null;
  status: string;
  lines: JELine[];
}

export default function JournalEntriesPage() {
  const { user, loading } = useAuth();
  const params = useParams();
  const orgId = Number(params.id);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string; type: string }>>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    reference: "",
    description: "",
    lines: [
      { account_id: "", debit: "", credit: "" },
      { account_id: "", debit: "", credit: "" },
    ],
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading) loadEntries();
  }, [orgId]);

  const loadEntries = () => {
    journalEntries.list(orgId).then(({ data }) => setEntries(data.data || data));
  };

  const loadAccounts = () => {
    import("@/lib/api").then(({ accounts }) => {
      accounts.list(orgId).then(({ data }) => setAccounts(data.accounts));
    });
  };

  useEffect(() => {
    if (showForm) loadAccounts();
  }, [showForm]);

  const addLine = () => {
    setForm(f => ({ ...f, lines: [...f.lines, { account_id: "", debit: "", credit: "" }] }));
  };

  const updateLine = (i: number, field: string, value: string) => {
    setForm(f => {
      const lines = [...f.lines];
      lines[i] = { ...lines[i], [field]: value };
      return { ...f, lines };
    });
  };

  const removeLine = (i: number) => {
    if (form.lines.length <= 2) return;
    setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      setError("Debits and credits must balance");
      return;
    }

    try {
      await journalEntries.create(orgId, {
        date: form.date,
        reference: form.reference || null,
        description: form.description || null,
        lines: form.lines.map(l => ({
          account_id: Number(l.account_id),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
        })),
      });
      setShowForm(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        description: "",
        lines: [{ account_id: "", debit: "", credit: "" }, { account_id: "", debit: "", credit: "" }],
      });
      loadEntries();
    } catch {
      setError("Failed to create journal entry");
    }
  };

  const fmt = (n: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Journal Entries</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="label">Date *</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Reference</label>
                <input className="input" value={form.reference}
                  onChange={e => setForm({ ...form, reference: e.target.value })} />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <div className="mb-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 mb-1">
                <div className="col-span-5">Account</div>
                <div className="col-span-3 text-right">Debit</div>
                <div className="col-span-3 text-right">Credit</div>
                <div className="col-span-1"></div>
              </div>
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                  <select className="input col-span-5" value={line.account_id}
                    onChange={e => updateLine(i, "account_id", e.target.value)} required>
                    <option value="">Select account...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                  </select>
                  <input className="input col-span-3 text-right" placeholder="0.00" value={line.debit}
                    onChange={e => updateLine(i, "debit", e.target.value)} type="number" step="0.01" min="0" />
                  <input className="input col-span-3 text-right" placeholder="0.00" value={line.credit}
                    onChange={e => updateLine(i, "credit", e.target.value)} type="number" step="0.01" min="0" />
                  <div className="col-span-1 flex items-center justify-center">
                    <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:underline mt-1">
                + Add line
              </button>
            </div>

            {error && <p className="error-text mb-3">{error}</p>}
            <button type="submit" className="btn-primary">Post Entry</button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entry #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Debit Total</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Credit Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No journal entries yet</td></tr>
            ) : entries.map(entry => {
              const debits = entry.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
              const credits = entry.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{entry.entry_number}</td>
                  <td className="px-4 py-3">{fmtDate(entry.date)}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.reference || "—"}</td>
                  <td className="px-4 py-3">{entry.description || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.status === "posted" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(debits)}</td>
                  <td className="px-4 py-3 text-right">{fmt(credits)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
