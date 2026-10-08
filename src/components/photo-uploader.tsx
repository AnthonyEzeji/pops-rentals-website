"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { isRemoteImage } from "@/lib/images";
import {
  PHOTO_CONTENT_TYPES,
  PHOTO_MAX_BYTES,
  UPLOAD_ROUTE,
  photoPathname,
} from "@/lib/uploads";

/**
 * Photo management for the vehicle form: drop files in, drag to reorder, X to remove.
 *
 * The list is kept in React state and mirrored into a hidden `photos` input as
 * newline-separated URLs — exactly what the textarea it replaces submitted — so
 * `saveVehicle` is unchanged and nothing is written to the database until the
 * form is saved. Removing a thumbnail therefore only drops the URL; the file
 * in Blob is deleted on save, once we know the removal was not abandoned.
 *
 * The URL field stays for photos hosted elsewhere, and is the whole input when
 * uploads are not configured.
 */

type Pending = { id: number; name: string; percentage: number; error?: string };

const ACCEPT = PHOTO_CONTENT_TYPES.join(",");
const MAX_MB = Math.round(PHOTO_MAX_BYTES / (1024 * 1024));

export function PhotoUploader({
  name,
  initial,
  folder,
  canUpload,
}: {
  name: string;
  /** Newline-separated URLs, as stored on the vehicle. */
  initial: string;
  /** The vehicle id, so each car's photos land in their own folder. */
  folder?: string;
  canUpload: boolean;
}) {
  const [photos, setPhotos] = useState<string[]>(() =>
    initial
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  );
  const [pending, setPending] = useState<Pending[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragIndex = useRef<number | null>(null);
  const nextId = useRef(0);

  async function uploadFiles(files: File[]) {
    // Sequential on purpose: a handful of 8MB photos over home broadband
    // upload faster one at a time than five fighting for the same pipe.
    for (const file of files) {
      const id = nextId.current++;
      setPending((current) => [...current, { id, name: file.name, percentage: 0 }]);

      const fail = (message: string) =>
        setPending((current) =>
          current.map((item) => (item.id === id ? { ...item, error: message } : item)),
        );

      if (!(PHOTO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
        fail("Not a JPEG, PNG, WebP or AVIF image.");
        continue;
      }
      if (file.size > PHOTO_MAX_BYTES) {
        fail(`Larger than ${MAX_MB}MB.`);
        continue;
      }

      try {
        const result = await upload(photoPathname(folder ?? "", file.name), file, {
          access: "public",
          contentType: file.type,
          handleUploadUrl: UPLOAD_ROUTE,
          onUploadProgress: ({ percentage }) =>
            setPending((current) =>
              current.map((item) => (item.id === id ? { ...item, percentage } : item)),
            ),
        });

        setPhotos((current) => [...current, result.url]);
        setPending((current) => current.filter((item) => item.id !== id));
      } catch (error) {
        fail(error instanceof Error ? error.message : "Upload failed.");
      }
    }
  }

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return;
    void uploadFiles(Array.from(files));
    if (fileInput.current) fileInput.current.value = "";
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    setPhotos((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function addUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    setPhotos((current) => (current.includes(url) ? current : [...current, url]));
    setUrlDraft("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={photos.join("\n")} />

      {canUpload ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer.files);
          }}
          className={`rounded-lg border border-dashed p-5 text-center transition-colors ${
            dragging ? "border-accent bg-accent/5" : "border-line bg-canvas"
          }`}
        >
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(event) => pick(event.target.files)}
          />
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => fileInput.current?.click()}
          >
            Choose photos
          </button>
          <p className="hint mt-2">
            or drag them here · JPEG, PNG, WebP or AVIF up to {MAX_MB}MB each
          </p>
        </div>
      ) : (
        <p className="hint">
          Uploading is not set up on this deployment — add a <code>BLOB_READ_WRITE_TOKEN</code> to
          enable it. Photo URLs can still be added by hand below.
        </p>
      )}

      {pending.length > 0 ? (
        <ul className="space-y-2">
          {pending.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{item.name}</span>
                {item.error ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() =>
                      setPending((current) => current.filter((entry) => entry.id !== item.id))
                    }
                  >
                    Dismiss
                  </button>
                ) : (
                  <span className="tabular-nums text-muted">{Math.round(item.percentage)}%</span>
                )}
              </div>
              {item.error ? (
                <p className="error">{item.error}</p>
              ) : (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li
              key={photo}
              draggable
              onDragStart={() => {
                dragIndex.current = index;
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex.current !== null) move(dragIndex.current, index);
                dragIndex.current = null;
              }}
              className="group relative cursor-grab overflow-hidden rounded-lg ring-1 ring-line ring-inset"
            >
              <div className="relative aspect-4/3 bg-raised">
                <Image
                  src={photo}
                  alt=""
                  fill
                  sizes="200px"
                  unoptimized={isRemoteImage(photo)}
                  className="object-cover"
                />
              </div>

              {index === 0 ? (
                <span className="badge absolute left-2 top-2 bg-canvas/85 text-brand ring-1 ring-brand/30 ring-inset backdrop-blur-sm">
                  Cover
                </span>
              ) : null}

              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-canvas/85 text-sm font-semibold text-danger ring-1 ring-line ring-inset backdrop-blur-sm"
              >
                ×
              </button>

              {/* Dragging is not reachable by keyboard, so order is also
                  adjustable with buttons. */}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-canvas/85 p-1 backdrop-blur-sm">
                <button
                  type="button"
                  aria-label={`Move photo ${index + 1} earlier`}
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                  className="btn-ghost btn-sm disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={`Move photo ${index + 1} later`}
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, index + 1)}
                  className="btn-ghost btn-sm disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No photos yet — the listing shows a branded placeholder until one is added.</p>
      )}

      <div className="flex gap-2">
        <input
          type="url"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Otherwise Enter in this field submits the whole vehicle form.
              event.preventDefault();
              addUrl();
            }
          }}
          placeholder="https://… or /vehicles/slug/01.jpg"
          className="input"
        />
        <button type="button" className="btn-secondary" onClick={addUrl}>
          Add URL
        </button>
      </div>
    </div>
  );
}
