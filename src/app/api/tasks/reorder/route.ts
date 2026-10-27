import { NextResponse } from "next/server";

import { reorderTasks } from "@/lib/db";
import { firstIssue, reorderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send a valid JSON body." },
      { status: 400 },
    );
  }

  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    return NextResponse.json({ tasks: reorderTasks(parsed.data.items) });
  } catch (error) {
    console.error("[POST /api/tasks/reorder]", error);
    return NextResponse.json(
      { error: "Could not save the new order. Please try again." },
      { status: 500 },
    );
  }
}
