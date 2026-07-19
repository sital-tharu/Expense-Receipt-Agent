import { NextResponse } from "next/server";
import { askAgentStream, MAX_QUESTION_CHARS } from "@/lib/chat";
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
    const stream = await askAgentStream(question.trim());
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
        } catch (err) {
          // headers are already sent — append the failure as text
          console.error("Chat stream failed mid-answer:", err);
          controller.enqueue(
            encoder.encode(" [The agent hit an error — please try again.]"),
          );
        }
        controller.close();
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Chat failed:", err);
    return NextResponse.json(
      { error: "The agent couldn't answer that — try again" },
      { status: 500 },
    );
  }
}
