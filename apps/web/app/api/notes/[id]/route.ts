import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { updateNoteSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenant_id: true },
    });

    if (!userRecord || userRecord.tenant_id !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Tenant not found or access revoked" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const note = await prisma.note.findFirst({
      where: {
        id,
        tenant_id: session.user.tenantId,
      },
      include: { author: { select: { email: true } } },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("Get note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenant_id: true },
    });

    if (!userRecord || userRecord.tenant_id !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Tenant not found or access revoked" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = updateNoteSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { title, content, tags, folder, folderId } = validationResult.data;

    const [note, tenant] = await Promise.all([
      prisma.note.findFirst({
        where: {
          id,
          tenant_id: session.user.tenantId,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
      }),
    ]);

    if (!note || !tenant) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (session.user.role === "member" && !(tenant as any).members_can_edit) {
      return NextResponse.json(
        { error: "Access denied: Members cannot edit notes" },
        { status: 403 }
      );
    }

    const updatedNote = await prisma.$transaction(async tx => {
      const contentChanged =
        content !== undefined &&
        JSON.stringify(content) !== JSON.stringify(note.content);
      const titleChanged = title !== undefined && title !== note.title;

      if (contentChanged || titleChanged) {
        // Find the most recent history entry for this note
        const lastHistory = await tx.noteHistory.findFirst({
          where: { note_id: id },
          orderBy: { created_at: "desc" },
        });

        const newTitle = title !== undefined ? title : note.title;
        const newContent = content !== undefined ? content : note.content;

        // Check if we are reverting to the exact state of the last history entry
        const isReverting =
          lastHistory &&
          JSON.stringify(newContent) === JSON.stringify(lastHistory.content) &&
          newTitle === lastHistory.title;

        if (isReverting) {
          // If reverting to the previous version, delete that history entry
          // to keep the history clean (as if the change never happened)
          await tx.noteHistory.delete({
            where: { id: lastHistory.id },
          });
          console.log(
            `[DEBUG] Reverted to last version, cleaned up history entry for note: ${id}`
          );
        } else {
          // Normal history creation with throttling
          const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
          const isRecent =
            lastHistory && new Date(lastHistory.created_at) > twoMinutesAgo;

          if (!isRecent) {
            await tx.noteHistory.create({
              data: {
                note_id: id,
                title: note.title,
                content: note.content as any,
              },
            });
          }
        }
      }

      return tx.note.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(tags !== undefined && { tags }),
          ...(folder !== undefined && { folder }),
          ...(folderId !== undefined && { folderId }),
        },
        include: { author: { select: { email: true } } },
      });
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error("Update note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { tenant_id: true },
    });

    if (!userRecord || userRecord.tenant_id !== session.user.tenantId) {
      return NextResponse.json(
        { error: "Tenant not found or access revoked" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const note = await prisma.note.findFirst({
      where: {
        id,
        tenant_id: session.user.tenantId,
      },
    });

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await prisma.note.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Note deleted" });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
