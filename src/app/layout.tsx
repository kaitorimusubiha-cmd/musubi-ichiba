import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "古物台帳・仕訳CSV | むすび",
  description: "古物台帳管理とマネーフォワード クラウド会計用CSVの作成",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-gray-50">
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-1">
            <Link
              href="/"
              className="font-bold text-gray-800 mr-4 shrink-0"
            >
              むすび
            </Link>
            <Link
              href="/register"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              取引登録
            </Link>
            <Link
              href="/ledger"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              古物台帳
            </Link>
            <Link
              href="/ichiba"
              className="text-sm px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              市場CSV
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
