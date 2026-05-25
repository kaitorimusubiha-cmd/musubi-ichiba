"use client";

import { useState, useEffect } from "react";

type TransactionType = "仕入れ" | "売上" | "手数料";

interface Transaction {
  id: string;
  type: TransactionType;
  counterparty: string;
  description: string;
  amount: number;
}

const STORAGE_KEY = "musubi-ichiba-session";

// サンプルCSVから確認した正式なマネーフォワード クラウド会計インポート形式
const MF_HEADER =
  "取引No,取引日,借方勘定科目,借方補助科目,借方部門,借方取引先,借方税区分,借方インボイス,借方金額(円),借方税額,貸方勘定科目,貸方補助科目,貸方部門,貸方取引先,貸方税区分,貸方インボイス,貸方金額(円),貸方税額,摘要,仕訳メモ,タグ,MF仕訳タイプ,決算整理仕訳,作成日時,作成者,最終更新日時,最終更新者";

function generateMFCSV(
  date: string,
  marketName: string,
  transactions: Transaction[]
): string {
  const rows = transactions.map((tx, index) => {
    const formattedDate = date.replace(/-/g, "/");
    // 相手方が市場名と同じ場合（手数料）は重複を避ける
    const parts = [tx.counterparty !== marketName ? tx.counterparty : "", tx.description].filter(Boolean);
    const summary = [marketName, ...parts].join(" ").trim();
    const no = (index + 1).toString();

    let debitAccount: string,
      debitTaxType: string,
      debitCounterparty: string,
      creditAccount: string,
      creditTaxType: string,
      creditCounterparty: string;

    if (tx.type === "仕入れ") {
      debitAccount = "仕入高";
      debitTaxType = "課税仕入 10%";
      debitCounterparty = tx.counterparty;
      creditAccount = "現金";
      creditTaxType = "対象外";
      creditCounterparty = "";
    } else if (tx.type === "売上") {
      debitAccount = "現金";
      debitTaxType = "対象外";
      debitCounterparty = "";
      creditAccount = "売上高";
      creditTaxType = "課税売上 10%";
      creditCounterparty = tx.counterparty;
    } else {
      // 手数料
      debitAccount = "支払手数料";
      debitTaxType = "課税仕入 10%";
      debitCounterparty = tx.counterparty || marketName;
      creditAccount = "現金";
      creditTaxType = "対象外";
      creditCounterparty = "";
    }

    return [
      no,                       // 取引No
      formattedDate,            // 取引日
      debitAccount,             // 借方勘定科目
      "",                       // 借方補助科目
      "",                       // 借方部門
      debitCounterparty,        // 借方取引先
      debitTaxType,             // 借方税区分
      "",                       // 借方インボイス
      tx.amount.toString(),     // 借方金額(円)
      "0",                      // 借方税額（MFが自動計算）
      creditAccount,            // 貸方勘定科目
      "",                       // 貸方補助科目
      "",                       // 貸方部門
      creditCounterparty,       // 貸方取引先
      creditTaxType,            // 貸方税区分
      "",                       // 貸方インボイス
      tx.amount.toString(),     // 貸方金額(円)
      "0",                      // 貸方税額（MFが自動計算）
      summary,                  // 摘要
      "",                       // 仕訳メモ
      "",                       // タグ
      "",                       // MF仕訳タイプ
      "",                       // 決算整理仕訳
      "",                       // 作成日時
      "",                       // 作成者
      "",                       // 最終更新日時
      "",                       // 最終更新者
    ].join(",");
  });

  return [MF_HEADER, ...rows].join("\r\n");
}

export default function IchibaPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [marketName, setMarketName] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [formType, setFormType] = useState<TransactionType>("仕入れ");
  const [formCounterparty, setFormCounterparty] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as { date?: string; marketName?: string; transactions?: Transaction[] };
        if (data.date) setDate(data.date);
        if (data.marketName) setMarketName(data.marketName);
        if (data.transactions) setTransactions(data.transactions);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, marketName, transactions }));
    } catch { /* ignore */ }
  }, [date, marketName, transactions]);

  useEffect(() => {
    if (formType === "手数料") setFormCounterparty(marketName);
  }, [formType, marketName]);

  const addTransaction = () => {
    const parsed = Number(formAmount);
    if (!formAmount || parsed <= 0) return;
    setTransactions((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type: formType,
        counterparty: formCounterparty.trim(),
        description: formDescription.trim(),
        amount: parsed,
      },
    ]);
    setFormCounterparty(formType === "手数料" ? marketName : "");
    setFormDescription("");
    setFormAmount("");
  };

  const removeTransaction = (id: string) =>
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));

  const downloadCSV = () => {
    if (transactions.length === 0) return;
    const csv = generateMFCSV(date, marketName, transactions);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `仕訳_${marketName || "古物市場"}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetSession = () => {
    if (!confirm("入力データをすべてクリアしますか？")) return;
    setDate(new Date().toISOString().split("T")[0]);
    setMarketName("");
    setTransactions([]);
  };

  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.type === "仕入れ") acc.purchase += tx.amount;
      else if (tx.type === "売上") acc.sales += tx.amount;
      else acc.fee += tx.amount;
      return acc;
    },
    { purchase: 0, sales: 0, fee: 0 }
  );
  const settlement = totals.sales - totals.purchase - totals.fee;
  const fmt = (n: number) => n.toLocaleString("ja-JP");

  const typeColors: Record<TransactionType, { badge: string; btn: string }> = {
    仕入れ: { badge: "bg-blue-100 text-blue-700", btn: "bg-blue-600 text-white" },
    売上: { badge: "bg-green-100 text-green-700", btn: "bg-green-600 text-white" },
    手数料: { badge: "bg-orange-100 text-orange-700", btn: "bg-orange-500 text-white" },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="text-center pb-2">
          <h1 className="text-2xl font-bold text-gray-800">市場仕訳CSV作成</h1>
          <p className="text-sm text-gray-500 mt-1">マネーフォワード クラウド会計 仕訳インポート用</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">市場情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">取引日</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">市場名</label>
              <input type="text" value={marketName} onChange={(e) => setMarketName(e.target.value)}
                placeholder="例: 東京古物市場"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">取引を追加</h2>
          <div className="flex gap-2 mb-4">
            {(["仕入れ", "売上", "手数料"] as TransactionType[]).map((type) => (
              <button key={type} onClick={() => setFormType(type)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${formType === type ? typeColors[type].btn : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {type}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">相手方</label>
                <input type="text" value={formCounterparty} onChange={(e) => setFormCounterparty(e.target.value)}
                  placeholder={formType === "手数料" ? marketName || "市場名" : "業者名（任意）"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">品目・摘要</label>
                <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="例: カメラ（任意）"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm text-gray-500 mb-1">金額（税込）</label>
                <div className="relative">
                  <input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTransaction()}
                    placeholder="0" min="1"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8" />
                  <span className="absolute right-3 top-2 text-sm text-gray-400">円</span>
                </div>
              </div>
              <button onClick={addTransaction} disabled={!formAmount || Number(formAmount) <= 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                追加
              </button>
            </div>
          </div>
        </div>

        {transactions.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">取引一覧 <span className="text-sm font-normal text-gray-400">{transactions.length}件</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">種別</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">相手方</th>
                    <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">品目</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">金額</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t border-gray-50">
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium ${typeColors[tx.type].badge}`}>{tx.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tx.counterparty || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{tx.description || "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-800">{fmt(tx.amount)}円</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeTransaction(tx.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className="text-blue-700">仕入合計: <strong>{fmt(totals.purchase)}円</strong></span>
                <span className="text-green-700">売上合計: <strong>{fmt(totals.sales)}円</strong></span>
                <span className="text-orange-700">手数料合計: <strong>{fmt(totals.fee)}円</strong></span>
                <span className={settlement >= 0 ? "text-green-800 font-semibold" : "text-red-700 font-semibold"}>
                  精算: <strong>{settlement >= 0 ? "+" : ""}{fmt(settlement)}円</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {transactions.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">取引を追加するとここに一覧が表示されます</div>
        )}

        <div className="flex gap-3">
          <button onClick={downloadCSV} disabled={transactions.length === 0}
            className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
            CSVをダウンロード（マネーフォワード用）
          </button>
          <button onClick={resetSession} className="bg-gray-200 text-gray-600 px-5 py-3 rounded-2xl text-sm hover:bg-gray-300 transition-colors">
            リセット
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
          <h3 className="font-semibold mb-2">使い方・注意事項</h3>
          <ul className="space-y-1.5 list-disc list-inside text-amber-800 leading-relaxed">
            <li>金額は税込で入力してください（消費税10%として処理されます）</li>
            <li>勘定科目の対応: 仕入れ→仕入高、売上→売上高、手数料→支払手数料</li>
            <li>相手勘定はすべて「現金」になります</li>
            <li>ダウンロードしたCSVはマネーフォワード クラウド会計の「仕訳帳」→「インポート」からアップロードしてください</li>
            <li>入力データはブラウザに自動保存されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
