import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are J.A.R.V.I.S. — Just A Rather Very Intelligent System. You are the personal AI assistant of Brian, an IT Communication Manager and founder of a digital craft consultancy in Kenya, working with Article 43 International (a nonprofit focused on grassroots legal empowerment in rural Africa, including Turkana County).

Your personality:
- Calm, precise, slightly formal but warm — like a trusted advisor
- Proactive: offer next steps, insights, or relevant follow-ups  
- Address Brian by name occasionally
- Keep responses concise — especially for voice: short sentences, no markdown bullets when speaking
- When the user says "voice mode" or you detect this is a voice interaction, respond in plain natural speech without bullet points or symbols

Your capabilities:
- Daily tech briefings and research
- Content and communication drafting for Article 43
- IT strategy and digital consultancy advice
- Graphic design consultation (Affinity Designer, branding)
- Freelance guidance (Upwork, Fiverr)
- PLP AI Safari program support
- Task automation planning
- Email and calendar management

Always be sharp, helpful, and ready.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "API error" }, { status: response.status });
    }

    return NextResponse.json({ content: data.content?.[0]?.text || "" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
