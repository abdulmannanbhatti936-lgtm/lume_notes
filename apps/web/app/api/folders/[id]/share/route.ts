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

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        tenant_id: (session.user as any).tenantId,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // @ts-ignore
    const sharing = await (prisma as any).sharedFolder.findUnique({
      where: { folder_id: id },
    });

    return NextResponse.json(sharing || { shared: false });
  } catch (error) {
    console.error("Get folder share status error:", error);
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
    const body = await request.json().catch(() => ({}));
    const { expires_in } = body;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        tenant_id: (session.user as any).tenantId,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: (session.user as any).tenantId },
    });

    if (session.user.role === "member" && !(tenant as any)?.members_can_share) {
      return NextResponse.json(
        { error: "Access denied: Members cannot share folders" },
        { status: 403 }
      );
    }

    // @ts-ignore
    const existingSharing = await (prisma as any).sharedFolder.findUnique({
      where: { folder_id: id },
    });

    if (existingSharing) {
      return NextResponse.json(existingSharing);
    }

    let expires_at: Date | null = null;
    if (expires_in) {
      const now = new Date();
      switch (expires_in) {
        case "1h":
          expires_at = new Date(now.getTime() + 60 * 60 * 1000);
          break;
        case "24h":
          expires_at = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case "7d":
          expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          expires_at = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    // @ts-ignore
    const sharedFolder = await (prisma as any).sharedFolder.create({
      data: {
        folder_id: id,
        is_public: true,
        expires_at,
      },
    });

    // Automatically share all notes inside this folder
    const notesInFolder = await prisma.note.findMany({
      where: { folderId: id },
    });

    for (const note of notesInFolder) {
      // @ts-ignore
      const existingSharedNote = await (prisma as any).sharedNote.findUnique({
        where: { note_id: note.id },
      });

      if (!existingSharedNote) {
        // @ts-ignore
        await (prisma as any).sharedNote.create({
          data: {
            note_id: note.id,
            is_public: true,
            expires_at,
          },
        });
      } else {
        // @ts-ignore
        await (prisma as any).sharedNote.update({
          where: { id: existingSharedNote.id },
          data: {
            is_public: true,
            expires_at,
          },
        });
      }
    }

    return NextResponse.json(sharedFolder, { status: 201 });
  } catch (error) {
    console.error("Create folder share error:", error);
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
    const { id } = await params;

    const folder = await prisma.folder.findFirst({
      where: {
        id,
        tenant_id: (session.user as any).tenantId,
      },
    });

    // @ts-ignore
    const sharing = await (prisma as any).sharedFolder.findUnique({
      where: { folder_id: id },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: (session.user as any).tenantId },
    });

    if (session.user.role === "member" && !(tenant as any)?.members_can_share) {
      return NextResponse.json(
        { error: "Access denied: Members cannot share folders" },
        { status: 403 }
      );
    }

    if (!folder || !sharing) {
      return NextResponse.json(
        { error: "Shared folder not found" },
        { status: 404 }
      );
    }

    // @ts-ignore
    await (prisma as any).sharedFolder.delete({
      where: { id: sharing.id },
    });

    // Automatically unshare all notes inside this folder
    const notesInFolder = await prisma.note.findMany({
      where: { folderId: id },
    });

    for (const note of notesInFolder) {
      // @ts-ignore
      await (prisma as any).sharedNote.deleteMany({
        where: { note_id: note.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete folder share error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
