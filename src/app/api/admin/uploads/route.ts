import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import {
  PHOTO_CONTENT_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_PATHNAME,
  uploadsEnabled,
} from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints the upload tokens the admin's browser uses to send vehicle photos to
 * Vercel Blob (PRD §7.1).
 *
 * This route is the only security boundary on uploads: the token it returns
 * lets the holder write one file, so every request is authenticated here, and
 * the token itself is scoped to a single pathname, content type and size. Note
 * that `requireAdmin()` is deliberately not used — it redirects to the login
 * page, which an upload in progress cannot follow; a 401 lets the uploader
 * show "your session expired" instead.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (!uploadsEnabled()) {
    return NextResponse.json(
      { error: "Photo uploads are not configured on this deployment." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!PHOTO_PATHNAME.test(pathname)) {
          throw new Error("That file name is not allowed.");
        }

        return {
          allowedContentTypes: [...PHOTO_CONTENT_TYPES],
          maximumSizeInBytes: PHOTO_MAX_BYTES,
          // Two photos named IMG_1234.jpg must not overwrite each other, and a
          // changed photo must get a new URL or caches would serve the old one.
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ by: session.email }),
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    // Blob's own validation failures (type, size) land here too, and their
    // messages are written for the person uploading, so they are passed on.
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
