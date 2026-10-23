"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Heart, Loader2, Star } from "lucide-react";
import type { PublicFeedbackInfo } from "@dilruba/shared/ops";

const labels = ["", "Poor", "Not great", "Okay", "Good", "Excellent"];

export function FeedbackForm() {
  const search = useSearchParams();
  const ref = (search.get("ref") ?? "").toUpperCase();
  const token = search.get("t") ?? "";
  const [info, setInfo] = useState<PublicFeedbackInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [canPublish, setCanPublish] = useState(true);
  const [state, setState] = useState<{ busy: boolean; error?: string; done?: boolean; reviewUrl?: string | null }>({ busy: false });

  const load = useCallback(async () => {
    if (!ref || !token) return setLoadError("This link is incomplete.");
    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
      const body = (await res.json()) as { info?: PublicFeedbackInfo; error?: string };
      if (!res.ok || !body.info) throw new Error(body.error ?? "Not found");
      setInfo(body.info);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load this page");
    }
  }, [ref, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setState({ busy: false, error: "Tap a star to rate your trip" });
    setState({ busy: true });
    try {
      const res = await fetch(`/api/feedback/${encodeURIComponent(ref)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, comment, canPublish: canPublish && !!comment.trim() }),
      });
      const body = (await res.json()) as { googleReviewUrl?: string | null; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't send your feedback");
      setState({ busy: false, done: true, reviewUrl: body.googleReviewUrl });
    } catch (err) {
      setState({ busy: false, error: err instanceof Error ? err.message : "Couldn't send your feedback" });
    }
  }

  const box = "mx-auto max-w-xl rounded-[1.75rem] border border-line bg-white p-6 text-center shadow-xl shadow-black/5 sm:p-8";

  if (loadError) {
    return (
      <div className={box}>
        <CircleAlert className="mx-auto size-10 text-brand" aria-hidden />
        <p className="mt-3 text-sm text-muted">{loadError} Please use the link from your email.</p>
      </div>
    );
  }
  if (!info) return <div className="mx-auto h-80 max-w-xl animate-pulse rounded-[1.75rem] bg-sand" aria-busy="true" />;

  if (state.done || info.submitted) {
    const reviewUrl = state.done ? state.reviewUrl : info.googleReviewUrl;
    return (
      <div className={box}>
        <Heart className="mx-auto size-10 text-brand" fill="currentColor" aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold">JazakAllah Khair, {info.name.split(" ")[0]}</h2>
        {reviewUrl ? (
          <>
            <p className="mt-2 text-muted">We&apos;re so glad you enjoyed it. Would you share a few words on Google? It helps other families find a travel partner they can trust.</p>
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6">
              <Star className="size-4" fill="currentColor" aria-hidden /> Write a Google review
            </a>
          </>
        ) : (
          <p className="mt-2 text-muted">Thank you for your honest feedback. Our team will read it carefully{state.done && rating <= 3 ? " and get in touch with you personally" : ""}.</p>
        )}
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className={box}>
      <p className="text-sm text-muted">{info.packageTitle} · {info.reference}</p>
      <h2 className="mt-1 text-2xl font-semibold">Assalamu Alaikum {info.name.split(" ")[0]}, how was your trip?</h2>
      <fieldset className="mt-6">
        <legend className="sr-only">Your rating</legend>
        <div className="flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" />
              <Star className={`size-10 transition-colors ${n <= shown ? "text-amber" : "text-line"}`} fill="currentColor" aria-hidden />
              <span className="sr-only">{n} star{n === 1 ? "" : "s"}: {labels[n]}</span>
            </label>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-medium">{labels[shown]}</p>
      </fieldset>
      <label htmlFor="fb-comment" className="label mt-4 text-left">{rating && rating <= 3 ? "What could we have done better?" : "Anything you'd like to share?"} <span className="font-normal text-muted">(optional)</span></label>
      <textarea id="fb-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={4} maxLength={2000} className="field resize-none" placeholder="Hotels, guide, food, flights…" />
      {comment.trim() && (
        <label className="mt-3 flex items-start gap-2 text-left text-sm text-muted">
          <input type="checkbox" checked={canPublish} onChange={(e) => setCanPublish(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand)]" />
          You may show my review on your website (with my first name and last initial).
        </label>
      )}
      <button type="submit" disabled={state.busy} className="btn btn-primary mt-5 w-full disabled:opacity-70">
        {state.busy && <Loader2 className="size-4 animate-spin" aria-hidden />} Send feedback
      </button>
      {state.error && <p role="alert" className="mt-3 text-sm font-medium text-brand">{state.error}</p>}
    </form>
  );
}
