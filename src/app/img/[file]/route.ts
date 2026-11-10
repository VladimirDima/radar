import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { imagesDir } from "@/lib/paths";

const FILE_RE = /^[\w-]+\.jpg$/;

export async function GET(
  _req: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!FILE_RE.test(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const full = path.join(imagesDir(), file);
  if (!fs.existsSync(full)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buf = fs.readFileSync(full);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
