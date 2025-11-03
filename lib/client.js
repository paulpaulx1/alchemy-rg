// /lib/client.js
import { createClient } from "next-sanity";

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2023-10-10",
  useCdn: true, // ✅ cached, suitable for ISR
  perspective: "published", // published content only
});

// Optional for API routes or background tasks
export const freshClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2023-10-10",
  useCdn: false, // ✅ bypass cache when needed
  token: process.env.SANITY_API_READ_TOKEN, // optional
});
