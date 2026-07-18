import { NextResponse } from "next/server";
import { askAgent, MAX_QUESTION_CHARS } from "@/lib/chat";
import { isOwnerKeyValid } from "@/lib/owner";
import { consumeQuota, QUOTA_MESSAGE } from "@/lib/quota";

export const maxDuration = 30;

export async function POST(request: Request) {
  let question: unknown;
  try {
    ({ question } = await request.json());
  } catch {
    return NextResponse.json({ error: "Send JSON: {question}" }, { status: 400 });
  }
  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Ask a question first" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: `Keep questions under ${MAX_QUESTION_CHARS} characters` },
      { status: 400 },
    );
  }

  try {
    // Owner questions don't count against the public demo's daily cap
    if (!isOwnerKeyValid(request.headers.get("x-owner-key"))) {
      if (!(await consumeQuota("chat"))) {
        return NextResponse.json({ error: QUOTA_MESSAGE }, { status: 429 });
      }
    }
    const answer = await askAgent(question.trim());
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Chat failed:", err);
    return NextResponse.json(
      { error: "The agent couldn't answer that — try again" },
      { status: 500 },
    );
  }
}
