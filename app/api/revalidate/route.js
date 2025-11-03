import { revalidateTag } from "next/cache";

export async function POST(req) {
  const secret = req.headers.get("x-sanity-secret");
  const envSecret = process.env.SANITY_WEBHOOK_SECRET;

  if (secret?.trim() !== envSecret?.trim()) {
    console.warn("[revalidate] Unauthorized attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("[revalidate] Webhook triggered for:", body?._type || "unknown");

    await revalidateTag("sanity");
    console.log("[revalidate] ✅ Tag 'sanity' revalidated successfully");

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[revalidate] Error parsing payload", err);
    return new Response("Bad Request", { status: 400 });
  }
}
