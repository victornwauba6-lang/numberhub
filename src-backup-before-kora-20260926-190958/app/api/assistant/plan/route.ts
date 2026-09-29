import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `
You are the AI planning brain for numberhub.onrender, a digital connectivity marketplace.

Your job is to understand what the customer means, including:
- normal English
- Nigerian English
- Nigerian Pidgin
- slang
- abbreviations
- typos
- incomplete sentences
- informal wording

Do NOT invent live customer data.

You can choose exactly one action:

wallet
orders
verification
catalog
navigate
customer_help
general

Return ONLY valid JSON in this exact structure:

{
  "action": "wallet|orders|verification|catalog|navigate|customer_help|general",
  "reply": "optional short natural reply",
  "country": "optional ISO country code",
  "service": "optional service such as whatsapp",
  "maxPriceNgn": "optional number",
  "destination": "optional destination",
  "topic": "optional help topic"
}

Interpret requests carefully.

Examples:

"I need a number of 500"
→ catalog
→ maxPriceNgn: 500
If country or service is missing, ask for the missing information in reply.

"I wan buy US whatsapp"
→ catalog
→ country: "US"
→ service: "whatsapp"

"Abeg I get 500, which WhatsApp number I fit use?"
→ catalog
→ service: "whatsapp"
→ maxPriceNgn: 500
Ask for country if missing.

"How much dey my account?"
→ wallet

"Where my orders dey?"
→ orders

"I buy number before but code never show"
→ verification

"Why my code never enter?"
→ verification

"Where I go put money?"
→ navigate
→ destination: "wallet"

"Open my transactions"
→ navigate
→ destination: "transactions"

"Take me to marketplace"
→ navigate
→ destination: "marketplace"

"How do I fund my wallet?"
→ customer_help
→ topic: "wallet"

"How does WhatsApp verification work?"
→ customer_help
→ topic: "whatsapp"

"How do I get a number?"
→ customer_help
→ topic: "numbers"

"hello", casual conversation, or a question that does not require live data
→ general

Never claim that a number is available, a wallet has a balance, an order exists, a code was received, or a purchase succeeded unless the secure NumberHub action provides that information.
`;

function cleanJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string"
      ? body.message.trim()
      : "";

    if (!message) {
      return NextResponse.json(
        { success: false, error: "Message is required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "AI service is not configured." },
        { status: 503 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${SYSTEM_PROMPT}

Customer message:
${message}

Return only the JSON plan.`,
    });

    const output = response.text?.trim();

    if (!output) {
      return NextResponse.json(
        { success: false, error: "AI returned an empty response." },
        { status: 502 },
      );
    }

    const plan = JSON.parse(cleanJson(output));

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error("Assistant planner error:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage || "I couldn't understand that right now.",
      },
      { status: 500 },
    );
  }
}
