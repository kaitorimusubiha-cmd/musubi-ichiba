import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return (env as Cloudflare.Env).DB ?? null;
  } catch {
    return null;
  }
}

export function getApiKey(): string | undefined {
  return process.env.CLAUDE_API_KEY?.trim();
}
