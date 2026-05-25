import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/cloudflare";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = await getDB();
  if (!db) {
    return NextResponse.json(
      { error: "台帳機能はCloudflareへのデプロイ後にご利用いただけます" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const numId = Number(id);
  if (!numId || isNaN(numId)) {
    return NextResponse.json({ error: "無効なID" }, { status: 400 });
  }

  await db.prepare("DELETE FROM kobutsu_ledger WHERE id = ?").bind(numId).run();
  return NextResponse.json({ ok: true });
}
