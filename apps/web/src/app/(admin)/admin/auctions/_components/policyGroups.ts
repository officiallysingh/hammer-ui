import type { PolicyItemRQ } from '@repo/api';

/** Single source of truth for "is this a post-payment policy?".
 *  Prefers the explicit `postPayment: true` flag, but falls back to the
 *  legacy `schedule.reference === 'AUCTION_END_TIME'` signal so policies
 *  saved before the flag existed still classify correctly. */
export function isPostPayment(item: PolicyItemRQ): boolean {
  if (item.postPayment === true) return true;
  if (item.postPayment === false) return false;
  const ref = item.schedule?.reference;
  const refStr = typeof ref === 'string' ? ref : ref ? Object.keys(ref)[0] : '';
  return refStr === 'AUCTION_END_TIME';
}

/** Single source of truth for "is this a pre-payment policy?". Inverse of
 *  `isPostPayment` — a payment policy is either pre or post. */
export function isPrePayment(item: PolicyItemRQ): boolean {
  return !isPostPayment(item);
}

/** A grouped-and-split view of an `AuctionPoliciesGroupRQ`:
 *  - `prePayment`: payment items flagged as collected before the auction starts
 *  - `postPayment`: payment items flagged as collected after the auction ends
 *  - `others`: every other policy group, in original order
 *
 *  Used by both the auction detail view and the workflow page so the two
 *  pages never disagree about which card shows up where. */
export interface SplitPolicyGroups {
  prePayment: PolicyItemRQ[];
  postPayment: PolicyItemRQ[];
  others: [string, PolicyItemRQ[]][];
}

export function splitPolicyGroups(
  groups: Record<string, PolicyItemRQ[]> | null | undefined,
): SplitPolicyGroups {
  if (!groups) return { prePayment: [], postPayment: [], others: [] };

  const paymentKey = Object.keys(groups).find((k) => k.toUpperCase() === 'PAYMENT');
  const paymentItems = paymentKey ? (groups[paymentKey] ?? []) : [];
  const prePayment: PolicyItemRQ[] = [];
  const postPayment: PolicyItemRQ[] = [];
  for (const item of paymentItems) {
    if (isPostPayment(item)) postPayment.push(item);
    else prePayment.push(item);
  }

  const others: [string, PolicyItemRQ[]][] = Object.entries(groups)
    .filter(([k]) => k.toUpperCase() !== 'PAYMENT')
    .filter(([, items]) => items.length > 0);

  return { prePayment, postPayment, others };
}
