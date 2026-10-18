export type ReviewFocus = { runId: string; area: string };

let pending: ReviewFocus | null = null;

export function focusReview(f: ReviewFocus) {
  pending = f;
  window.dispatchEvent(new CustomEvent('designview:review-focus'));
  window.dispatchEvent(new CustomEvent('designview:command', { detail: { id: 'page:review' } }));
}

export function takeReviewFocus() {
  const f = pending;
  pending = null;
  return f;
}
