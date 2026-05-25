import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/cloudflare";

export type LedgerRecord = {
  id: number;
  date: string;
  type: "buy" | "sell";
  source: string;
  item_name: string;
  item_description: string;
  quantity: number;
  amount: number;
  counterparty_name: string;
  counterparty_address: string;
  notes: string;
  created_at: string;
};

const NO_DB_ERROR = {
  error: "台帳機能はCloudflareへのデプロイ後にご利用いただけます",
  code: "NO_DB",
};

export async function GET(req: NextRequest) {
  const db = await getDB();
  if (!db) return NextResponse.json(NO_DB_ERROR, { status: 503 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions: string[] = [];
  const params: string[] = [];

  if (type && (type === "buy" || type === "sell")) {
    conditions.push("type = ?");
    params.push(type);
  }
  if (from) {
    conditions.push("date >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("date <= ?");
    params.push(to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM kobutsu_ledger ${where} ORDER BY date DESC, id DESC LIMIT 500`;

  const result = await db.prepare(query).bind(...params).all<LedgerRecord>();
  return NextResponse.json(result.results);
}

export async function POST(req: NextRequest) {
  const db = await getDB();
  if (!db) return NextResponse.json(NO_DB_ERROR, { status: 503 });

  let body: Partial<LedgerRecord>;
  try {
    body = (await req.json()) as Partial<LedgerRecord>;
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const { date, type, source, item_name, item_description, quantity, amount, counterparty_name, counterparty_address, notes } = body;

  if (!date || !type || !item_name || amount === undefined) {
    return NextResponse.json({ error: "必須項目が不足しています（日付・種別・品目・金額）" }, { status: 400 });
  }

  const result = await db
    .prepare(
      `INSERT INTO kobutsu_ledger (date, type, source, item_name, item_description, quantity, amount, counterparty_name, counterparty_address, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      date,
      type,
      source ?? "manual",
      item_name,
      item_description ?? "",
      quantity ?? 1,
      amount,
      counterparty_name ?? "",
      counterparty_address ?? "",
      notes ?? ""
    )
    .run();

  return NextResponse.json({ id: result.meta.last_row_id }, { status: 201 });
}
