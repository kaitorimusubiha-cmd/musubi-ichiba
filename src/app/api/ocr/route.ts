import { NextRequest, NextResponse } from "next/server";
import { getApiKey } from "@/lib/cloudflare";

type ClaudeContent =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

export type OcrResult = {
  document_type: string;
  date: string | null;
  counterparty: string | null;
  main_item: string | null;
  total: number | null;
  notes: string | null;
};

const SYSTEM_PROMPT = `あなたは書類読み取りのAIです。
渡された画像（レシート・領収書・請求書・古物市場の明細書など）から情報を抽出し、以下のJSON形式のみで返答してください。説明文は不要です。

{
  "document_type": "レシート" | "領収書" | "請求書" | "市場明細" | "その他",
  "date": "YYYY-MM-DD形式の日付。読み取れない場合はnull",
  "counterparty": "発行元・店舗名・業者名。読み取れない場合はnull",
  "main_item": "主な品目・商品名（複数ある場合は代表的なものを1つ）。読み取れない場合はnull",
  "total": 合計金額の数値（税込、円単位）。読み取れない場合はnull,
  "notes": "その他メモや特記事項。なければnull"
}`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "APIキーが設定されていません" },
        { status: 500 }
      );
    }

    let body: { image?: string; mediaType?: string };
    try {
      body = (await req.json()) as { image?: string; mediaType?: string };
    } catch {
      return NextResponse.json(
        { error: "リクエストが不正です" },
        { status: 400 }
      );
    }

    const { image, mediaType } = body;
    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "画像データがありません" },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"];
    if (!allowedTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: "対応していない画像形式です（JPEG・PNG・WebP・GIF・HEIC）" },
        { status: 400 }
      );
    }

    const content: ClaudeContent[] = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: image,
        },
      },
      {
        type: "text",
        text: "この書類から情報を抽出してください。",
      },
    ];

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      return NextResponse.json(
        { error: `AI読み取りエラー(${claudeRes.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const claudeData = (await claudeRes.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const rawText = claudeData.content?.[0]?.text ?? "";

    let result: OcrResult;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found");
      result = JSON.parse(jsonMatch[0]) as OcrResult;
    } catch {
      return NextResponse.json(
        { error: "読み取り結果を解析できませんでした。もう一度お試しください。" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        error: `予期しないエラー: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 }
    );
  }
}
