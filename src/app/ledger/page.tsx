"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { LedgerRecord } from "@/app/api/ledger/route";

const TYPE_LABEL: Record<string, string> = { buy: "買取", sell: "売却" };
const SOURCE_LABEL: Record<string, string> = {
  receipt: "レシート",
  invoice: "領収書・請求書",
  market: "市場明細",
  manual: "手入力",
};

const fmt = (n: number) => n.toLocaleString("ja-JP");

export default function LedgerPage() {
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [noDb, setNoDb] = useState(false);
  const [filterType, setFilterType] = useState<"" | "buy" | "sell">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setNoDb(false);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);

    try {
      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = (await res.json()) as LedgerRecord[] | { code?: string };
      if (!res.ok) {
        if ((data as { code?: string }).code === "NO_DB") {
          setNoDb(true);
        }
        setRecords([]);
        return;
      }
      setRecords(data as LedgerRecord[]);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterFrom, filterTo]);

  useEffect(() => {
    void fetchRecords();
  }, [fetchRecords]);

  const handleDelete = async (id: number) => {
    if (!confirm("この記録を削除しますか？")) return;
    setDeleting(id);
    try {
      await fetch(`/api/ledger/${id}`, { method: "DELETE" });
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const totals = records.reduce(
    (acc, r) => {
      if (r.type === "buy") acc.buy += r.amount;
      else acc.sell += r.amount;
      return acc;
    },
    { buy: 0, sell: 0 }
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">古物台帳</h1>
            <p className="text-sm text-gray-500 mt-0.5">買取・売却の記録一覧</p>
          </div>
          <Link href="/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
            + 取引登録
          </Link>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">種別</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as "" | "buy" | "sell")}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">すべて</option>
                <option value="buy">買取</option>
                <option value="sell">売却</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">開始日</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">終了日</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <button onClick={fetchRecords}
              className="bg-gray-800 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-gray-700 transition-colors">
              絞り込む
            </button>
            {(filterType || filterFrom || filterTo) && (
              <button onClick={() => { setFilterType(""); setFilterFrom(""); setFilterTo(""); }}
                className="text-sm text-gray-500 hover:text-gray-700">
                クリア
              </button>
            )}
          </div>
        </div>

        {/* No DB notice */}
        {noDb && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <p className="text-amber-800 font-semibold mb-1">台帳機能はデプロイ後にご利用いただけます</p>
            <p className="text-sm text-amber-700">
              Cloudflare Workers へのデプロイが完了すると、買取・売却記録が保存・閲覧できるようになります。<br />
              エンジニアにデプロイを依頼してください。
            </p>
          </div>
        )}

        {/* Summary */}
        {!noDb && records.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">買取合計</p>
              <p className="text-lg font-bold text-blue-700">{fmt(totals.buy)}円</p>
              <p className="text-xs text-gray-400">{records.filter(r => r.type === "buy").length}件</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">売却合計</p>
              <p className="text-lg font-bold text-green-700">{fmt(totals.sell)}円</p>
              <p className="text-xs text-gray-400">{records.filter(r => r.type === "sell").length}件</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">差引（粗利）</p>
              <p className={`text-lg font-bold ${totals.sell - totals.buy >= 0 ? "text-green-800" : "text-red-700"}`}>
                {totals.sell - totals.buy >= 0 ? "+" : ""}{fmt(totals.sell - totals.buy)}円
              </p>
              <p className="text-xs text-gray-400">{records.length}件</p>
            </div>
          </div>
        )}

        {/* Table */}
        {!noDb && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                記録がありません。<Link href="/register" className="text-blue-600 hover:underline">取引を登録</Link>してください。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">日付</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">種別</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">品目</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">相手方</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">金額</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">書類</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${r.type === "buy" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {TYPE_LABEL[r.type] ?? r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {r.item_name}
                          {r.item_description && <span className="block text-xs text-gray-400">{r.item_description}</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.counterparty_name || "—"}
                          {r.counterparty_address && <span className="block text-xs text-gray-400">{r.counterparty_address}</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800 whitespace-nowrap">{fmt(r.amount)}円</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{SOURCE_LABEL[r.source] ?? r.source}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(r.id)}
                            disabled={deleting === r.id}
                            className="text-red-400 hover:text-red-600 text-xs disabled:opacity-40"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
