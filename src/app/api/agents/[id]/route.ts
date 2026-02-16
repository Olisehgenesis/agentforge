import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/agents/:id - Get agent details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
        },
        owner: true,
        verification: {
          select: { publicKey: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json({ error: "Failed to fetch agent" }, { status: 500 });
  }
}

// PATCH /api/agents/:id - Update agent
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...body,
        configuration: body.configuration
          ? JSON.stringify(body.configuration)
          : undefined,
      },
    });

    // Log the update
    await prisma.activityLog.create({
      data: {
        agentId: id,
        type: "info",
        message: `Agent configuration updated`,
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json({ error: "Failed to update agent" }, { status: 500 });
  }
}

// DELETE /api/agents/:id - Delete agent
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related records first
    await prisma.activityLog.deleteMany({ where: { agentId: id } });
    await prisma.transaction.deleteMany({ where: { agentId: id } });
    await prisma.agent.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 });
  }
}

