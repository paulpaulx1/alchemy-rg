// app/api/revalidate/route.js
import { revalidateTag } from "next/cache";

export async function POST(req) {
  const secret = req.headers.get("x-sanity-secret");

  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    console.warn("[revalidate] Unauthorized attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("[revalidate] Webhook triggered for:", body?._type || "unknown");

    // Revalidate everything that fetched from Sanity
    await revalidateTag("sanity");

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("[revalidate] Error parsing payload", err);
    return new Response("Bad Request", { status: 400 });
  }
}
