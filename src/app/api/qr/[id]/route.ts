import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/qr/:id - return PNG image stored in database
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({ where: { id } });
  if (!qr) {
    return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  }

  // `dataUrl` may be `data:image/png;base64,....` or raw base64
  let base64 = qr.dataUrl;
  const comma = base64.indexOf(",");
  if (comma !== -1) {
    base64 = base64.slice(comma + 1);
  }

  const buf = Buffer.from(base64, "base64");
  return new NextResponse(buf, { headers: { "Content-Type": "image/png" } });
}
