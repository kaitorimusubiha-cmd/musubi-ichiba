"use client";

import { useState, useRef } from "react";
import type { OcrResult } from "@/app/api/ocr/route";

type TxType = "buy" | "sell";

const SOURCE_LABEL: Record<string, string> = {
  receipt: "レシート",
  invoice: "領収書・請求書",
  market: "市場明細",
  manual: "手入力",
};

export default function RegisterPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string>("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const [txType, setTxType] = useState<TxType>("buy");
  const [source, setSource] = useState("manual");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyAddress, setCounterpartyAddress] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"ok" | "error" | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrError(null);
    setImageMediaType(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64 ?? null);
    };
    reader.readAsDataURL(file);
  };

  const handleOcr = async () => {
    if (!imageBase64) return;
    setOcrLoading(true);
    setOcrError(null);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mediaType: imageMediaType }),
      });
      const data = (await res.json()) as OcrResult & { error?: string };

      if (!res.ok || data.error) {
        setOcrError(data.error ?? "読み取りに失敗しました");
        return;
      }

      if (data.date) {
        const parsed = new Date(data.date);
        if (!isNaN(parsed.getTime())) {
          setDate(data.date);
        }
      }
      if (data.counterparty) setCounterpartyName(data.counterparty);
      if (data.main_item) setItemName(data.main_item);
      if (data.total) setAmount(String(data.total));
      if (data.notes) setNotes(data.notes);

      const docType = data.document_type ?? "";
      if (docType.includes("レシート")) setSource("receipt");
      else if (docType.includes("領収") || docType.includes("請求")) setSource("invoice");
      else if (docType.includes("市場")) setSource("market");
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : "通信エラーが発生しました");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!date || !itemName || !amount) return;

    setSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type: txType,
          source,
          item_name: itemName.trim(),
          item_description: itemDescription.trim(),
          quantity: 1,
          amount: Number(amount),
          counterparty_name: counterpartyName.trim(),
          counterparty_address: counterpartyAddress.trim(),
          notes: notes.trim(),
        }),
      });

      const data = (await res.json()) as { id?: number; error?: string; code?: string };

      if (!res.ok) {
        if (data.code === "NO_DB") {
          setSubmitError("台帳への保存はCloudflareへのデプロイ後にご利用いただけます。");
        } else {
          setSubmitError(data.error ?? "登録に失敗しました");
        }
        setSubmitResult("error");
        return;
      }

      setSubmitResult("ok");
      setItemName("");
      setItemDescription("");
      setAmount("");
      setCounterpartyName("");
      setCounterpartyAddress("");
      setNotes("");
      setSource("manual");
      setImagePreview(null);
      setImageBase64(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "通信エラーが発生しました");
      setSubmitResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = date && itemName.trim() && amount && Number(amount) > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="text-center pb-2">
          <h1 className="text-2xl font-bold text-gray-800">取引登録</h1>
          <p className="text-sm text-gray-500 mt-1">書類を撮影・スキャンすると自動で読み取ります</p>
        </div>

        {/* Image upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">書類を読み取る（任意）</h2>

          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="選択した書類" className="max-h-48 mx-auto rounded-lg object-contain" />
            ) : (
              <div className="text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">タップして写真を選択<br /><span className="text-xs">スマホカメラ・スキャナ対応</span></p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {imagePreview && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleOcr}
                disabled={ocrLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {ocrLoading ? "読み取り中..." : "AIで読み取る"}
              </button>
              <button
                onClick={() => { setImagePreview(null); setImageBase64(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-200 transition-colors"
              >
                クリア
              </button>
            </div>
          )}

          {ocrError && (
            <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{ocrError}</p>
          )}
        </div>

        {/* Transaction form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">取引内容</h2>

          {/* Type */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTxType("buy")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${txType === "buy" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              買取
            </button>
            <button
              onClick={() => setTxType("sell")}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${txType === "sell" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              売却
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">取引日 <span className="text-red-500">*</span></label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">書類種別</label>
                <select value={source} onChange={(e) => setSource(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                  {Object.entries(SOURCE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">品目 <span className="text-red-500">*</span></label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
                placeholder="例: デジタルカメラ、ブランドバッグ"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">特徴・状態</label>
              <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
                placeholder="例: 黒色、傷あり、シリアル番号: 12345"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">金額（税込） <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="0" min="1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8" />
                <span className="absolute right-3 top-2 text-sm text-gray-400">円</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">相手方名</label>
              <input type="text" value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)}
                placeholder="例: 田中太郎、○○商店"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">相手方住所</label>
              <input type="text" value={counterpartyAddress} onChange={(e) => setCounterpartyAddress(e.target.value)}
                placeholder="例: 静岡県浜松市…（任意）"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>

            <div>
              <label className="block text-sm text-gray-500 mb-1">備考</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="メモ（任意）"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
        </div>

        {submitResult === "ok" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800 font-medium text-center">
            登録しました
          </div>
        )}
        {submitResult === "error" && submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isFormValid || submitting}
          className="w-full bg-blue-600 text-white py-3 rounded-2xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {submitting ? "登録中..." : "台帳に登録する"}
        </button>

        <p className="text-center text-xs text-gray-400">
          ＊印は必須項目です。台帳への保存にはCloudflareへのデプロイが必要です。
        </p>
      </div>
    </div>
  );
}
