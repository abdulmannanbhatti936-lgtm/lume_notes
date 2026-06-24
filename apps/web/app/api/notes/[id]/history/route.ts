import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify access
    const note = await prisma.note.findFirst({
      where: {
        id,
        tenant_id: session.user.tenantId,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const history = await prisma.noteHistory.findMany({
      where: { note_id: id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { historyId } = await request.json();

    if (!historyId) {
      return NextResponse.json(
        { error: "History ID is required" },
        { status: 400 }
      );
    }

    // Verify access and get history entry
    const [note, historyEntry] = await Promise.all([
      prisma.note.findFirst({
        where: {
          id,
          tenant_id: session.user.tenantId,
        },
      }),
      prisma.noteHistory.findUnique({
        where: { id: historyId },
      }),
    ]);

    if (!note || !historyEntry || historyEntry.note_id !== id) {
      return NextResponse.json(
        { error: "Note or history entry not found" },
        { status: 404 }
      );
    }

    // Restore note to history state
    // We create a new history entry of the CURRENT state before reverting
    const updatedNote = await prisma.$transaction(async tx => {
      await tx.noteHistory.create({
        data: {
          note_id: id,
          title: note.title,
          content: note.content as any,
        },
      });

      return tx.note.update({
        where: { id },
        data: {
          title: historyEntry.title,
          content: historyEntry.content as any,
        },
      });
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Revert history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
