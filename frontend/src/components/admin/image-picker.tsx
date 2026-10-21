"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import type { MediaItem } from "@dilruba/shared/catalog";
import { builtInPhotos } from "@/lib/images";
import { ApiError, adminFetch } from "@/lib/admin-api";
import { ErrorBox } from "./ui";

// Big phone photos are shrunk in the browser first: faster uploads, and well under hosting
// request limits. The server re-encodes everything to WebP anyway.
const MAX_SIDE = 2400;
const SHRINK_ABOVE_BYTES = 2.5 * 1024 * 1024;

async function prepareUpload(file: File): Promise<Blob> {
  if (file.size <= SHRINK_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // e.g. HEIC the browser can't decode: let the server try
  }
}

async function uploadImage(file: File): Promise<MediaItem> {
  const body = await prepareUpload(file);
  let res: Response;
  try {
    res = await fetch("/api/admin/media", { method: "POST", headers: { "Content-Type": body.type || "application/octet-stream" }, body });
  } catch {
    throw new ApiError("Upload failed. Check your connection and try again.", 0);
  }
  const data = (await res.json().catch(() => ({}))) as MediaItem & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? (res.status === 413 ? "That image is too large." : "Upload failed"), res.status);
  return data;
}

/**
 * Modal for choosing an image: the site's built-in photos or uploaded ones. Calls `onSelect`
 * with the image URL.
 */
export function ImagePicker({ open, onClose, onSelect, title = "Choose an image" }: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"uploads" | "builtin">("uploads");
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      adminFetch<MediaItem[]>("/media")
        .then(setMedia)
        .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load images"));
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files)) uploaded.push(await uploadImage(file));
      setMedia((m) => [...uploaded.reverse(), ...(m ?? [])]);
      setTab("uploads");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(item: MediaItem) {
    if (!confirm("Delete this image for good?")) return;
    setError(null);
    try {
      await adminFetch(`/media/${item.id}`, { method: "DELETE" });
      setMedia((m) => m?.filter((x) => x.id !== item.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
    }
  }

  const choose = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="image-picker-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-hidden rounded-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id="image-picker-title" className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-sand hover:text-ink">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex gap-1 rounded-full bg-sand p-1">
            {(["uploads", "builtin"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${tab === t ? "bg-white shadow-sm" : "text-ink/65"}`}
              >
                {t === "uploads" ? "Uploaded" : "Website photos"}
              </button>
            ))}
          </div>
          <label className={`btn btn-primary !py-2 ${busy ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            {busy ? "Uploading…" : "Upload images"}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
          </label>
        </div>
        <p className="px-5 pt-2 text-xs text-muted">JPG, PNG or WebP. Landscape photos at least 1600px wide look best.</p>
        {error && <div className="px-5 pt-3"><ErrorBox message={error} /></div>}

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3 lg:grid-cols-4">
          {tab === "builtin"
            ? builtInPhotos.map((p) => <Tile key={p.url} url={p.url} label={p.key} onChoose={choose} />)
            : media === null
              ? <p className="col-span-full py-10 text-center text-sm text-muted">Loading…</p>
              : media.length === 0
                ? <p className="col-span-full py-10 text-center text-sm text-muted">No uploads yet. Use “Upload images”, or pick from the website photos.</p>
                : media.map((m) => (
                    <Tile
                      key={m.id}
                      url={m.url}
                      label={`${m.width}×${m.height} · ${m.usedBy ? `used by ${m.usedBy}` : "unused"}`}
                      onChoose={choose}
                      onDelete={m.usedBy === 0 ? () => void remove(m) : undefined}
                    />
                  ))}
        </div>
      </div>
    </dialog>
  );
}

function Tile({ url, label, onChoose, onDelete }: { url: string; label: string; onChoose: (url: string) => void; onDelete?: () => void }) {
  return (
    <div className="group relative">
      <button type="button" onClick={() => onChoose(url)} className="block w-full overflow-hidden rounded-xl ring-1 ring-line focus-visible:ring-2 focus-visible:ring-brand">
        <span className="relative block aspect-[4/3] bg-sand">
          <Image src={url} alt="" fill sizes="220px" className="object-cover transition-transform group-hover:scale-105" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold"><Check className="size-3.5" aria-hidden /> Use</span>
          </span>
        </span>
      </button>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-muted">{label}</p>
        {onDelete && (
          <button type="button" onClick={onDelete} aria-label="Delete image" className="rounded p-1 text-muted hover:text-brand">
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
