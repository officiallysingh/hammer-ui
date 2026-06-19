'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auctionsApi, AuctionUpdationRQ, AuctionUnitType, PolicyItemRQ } from '@repo/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/authStore';
import { SelectOption } from '../../_components/AuctionShared';
import { AuctionStepIndicator } from '../../_components/AuctionStepIndicator';
import { AuctionStep1Details, Step1State } from '../../_components/AuctionStep1Details';
import { AuctionStep2Units, Step2State } from '../../_components/AuctionStep2Units';
import { AuctionStep3Media, AuctionUploadedFile } from '../../_components/AuctionStep3Media';
import { AuctionStep3Policies, initialStep3 } from '../../_components/AuctionStep3Policies';
import type { Step3State } from '../../_components/AuctionStep3Types';

function buildDurationFromDaysHours(days: string, hours: string): string {
  const d = parseInt(days, 10) || 0;
  const h = parseInt(hours, 10) || 0;
  return `PT${d * 24 + h}H`;
}

function buildWindowDuration(hours: string, minutes: string): string {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h > 0 && m > 0) return `PT${h}H${m}M`;
  if (h > 0) return `PT${h}H`;
  if (m > 0) return `PT${m}M`;
  return 'PT0S';
}

function parseDurationHours(duration: string): { days: string; hours: string } {
  const match = duration.match(/PT(\d+)H/);
  return { days: '0', hours: match ? match[1]! : '0' };
}

function parseDurationWindow(duration: string): { hours: string; minutes: string } {
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  return { hours: h ? h[1]! : '0', minutes: m ? m[1]! : '0' };
}

function parseDurationMinutes(duration: string): string {
  const m = duration.match(/(\d+)M/);
  return m ? m[1]! : '10';
}

function mapPoliciesToStep3(groups: Record<string, PolicyItemRQ[]>): Partial<Step3State> {
  const out: Partial<Step3State> = {};

  const participation = groups['PARTICIPATION_ELIGIBILITY'];
  if (participation?.length) {
    out.participationPolicies = participation.map((p) => {
      const { days, hours } = parseDurationHours(p.preStartDeadlineDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: p.type,
        basis: (p.basis ?? '') as 'FIXED_AMOUNT' | 'PERCENTAGE' | '',
        value: String(p.value ?? ''),
        deadlineDays: days,
        deadlineHours: hours,
      };
    });
  }

  const preconditions = groups['PRECONDITION'];
  if (preconditions?.length) {
    out.preconditions = preconditions.map((p) => {
      const { days, hours } = parseDurationHours(p.preStartValidationDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: p.type,
        count: String(p.count ?? ''),
        validationDays: days,
        validationHours: hours,
      };
    });
  }

  const offerBased = groups['OFFER_BASED_PRICE_CHANGE'];
  if (offerBased?.length) {
    out.priceChangePolicies = offerBased.map((p) => {
      const { hours, minutes } = parseDurationWindow(p.windowDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: p.type,
        windowHours: hours,
        windowMinutes: minutes,
        steps: p.steps ?? [],
        value: String(p.value ?? ''),
      };
    });
  }

  const clockBased = groups['CLOCK_BASED_PRICE_CHANGE'];
  if (clockBased?.length) {
    out.priceChangePolicyType = clockBased[0]!.type;
  }

  const extension = groups['EXTENSION'] ?? groups['AUCTION_EXTENSION'];
  if (extension?.length) {
    const ext = extension[0]!;
    out.extensionEnabled = true;
    out.extensionType = ext.type;
    out.extensionName = ext.name ?? '';
    out.extensionDescription = ext.description ?? '';
    out.extensionReference = ext.reference ?? 'FROM_LATEST_OFFER_TIME';
    out.extensionDurationMinutes = parseDurationMinutes(ext.duration ?? 'PT10M');
    out.extensionLimit = String(ext.limit ?? 0);
  }

  const winnerDet = groups['WINNER_DETERMINATION'];
  if (winnerDet?.length) {
    const w = winnerDet[0]!;
    out.winnerDeterminationType = w.type;
    out.winnerDeterminationKth = String(w.kth ?? 1);
    out.winnerDeterminationName = w.name ?? '';
    out.winnerDeterminationDescription = w.description ?? '';
  }

  const winnerPrice = groups['WINNER_PRICE_DETERMINATION'];
  if (winnerPrice?.length) {
    const w = winnerPrice[0]!;
    out.winnerPriceDeterminationType = w.type;
    out.winnerPriceDeterminationKth = String(w.kth ?? 1);
    out.winnerPriceDeterminationName = w.name ?? '';
    out.winnerPriceDeterminationDescription = w.description ?? '';
  }

  const clearing = groups['CLEARING'];
  if (clearing?.length) {
    const c = clearing[0]!;
    out.clearingType = c.type;
    out.clearingName = c.name ?? '';
    out.clearingDescription = c.description ?? '';
  }

  const tieBreaking = groups['TIE_BREAKING'];
  if (tieBreaking?.length) {
    const t = tieBreaking[0]!;
    out.tieBreakingType = t.type;
    out.tieBreakingName = t.name ?? '';
    out.tieBreakingDescription = t.description ?? '';
  }

  return out;
}

/** Normalises API fields that arrive as either a plain string or { KEY: "Label" } */
function resolveStr(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

/** Derives the UI priceProgression value from the stored auction type key */
function derivePriceProgression(auctionType: string): string {
  if (auctionType.includes('CLOCK_BASED')) return 'CLOCK_BASED';
  if (auctionType.includes('STEP_PRICED')) return 'STEP_BASED';
  if (auctionType.includes('FIXED_PERCENTAGE')) return 'FIXED_PERCENTAGE';
  if (auctionType.includes('PERCENTAGE_RANGE')) return 'PERCENTAGE_RANGE';
  return '';
}

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { user } = useAuthStore();
  const username = user?.username ?? 'unknown';

  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState(1);

  const [originalStep1, setOriginalStep1] = useState<Step1State | null>(null);
  const origStep2Ref = useRef({ unitType: '', openingPrice: '', item: '', items: [] as string[] });

  // Step 1
  const [step1, setStep1] = useState<Step1State>({
    title: '',
    description: '',
    referenceId: '',
    format: '',
    accessibility: '',
    direction: '',
    priceProgression: '',
    dimension: '',
    participantVisibility: '',
    offerVisibility: '',
    currencyUnit: '',
    precision: '2',
    roundingMode: '',
  });
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);
  const [savingStep1, setSavingStep1] = useState(false);

  // Auction type (loaded from API)
  const [auctionType, setAuctionType] = useState('');

  // Step 2
  const [step2, setStep2] = useState<Step2State>({
    unitType: '',
    openingPrice: '',
    item: '',
    itemName: '',
    itemSummary: null,
    items: [],
    itemNames: [],
    itemSummaries: [],
    categories: [],
    subCategories: [],
    tags: [],
  });
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3 – Media
  const [mediaUploads, setMediaUploads] = useState<AuctionUploadedFile[]>([]);

  // Step 4 – Policies
  const [step3, setStep3] = useState<Step3State>(initialStep3);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step3GeneralError, setStep3GeneralError] = useState<string | null>(null);
  const [savingStep3, setSavingStep3] = useState(false);
  // Model options
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [directionTypes, setDirectionTypes] = useState<SelectOption[]>([]);
  const [dimensionTypes, setDimensionTypes] = useState<SelectOption[]>([]);
  const [participantVisibilityTypes, setParticipantVisibilityTypes] = useState<SelectOption[]>([]);
  const [offerVisibilityTypes, setOfferVisibilityTypes] = useState<SelectOption[]>([]);
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      auctionsApi.getFormats(),
      auctionsApi.getAccessibilityTypes(),
      auctionsApi.getDirectionTypes(),
      auctionsApi.getDimensionTypes(),
      auctionsApi.getParticipantVisibilityTypes(),
      auctionsApi.getOfferVisibilityTypes(),
      auctionsApi.getRoundingModeTypes(),
    ]).then(([fmts, access, dirs, dims, partVis, offerVis, rounding]) => {
      if (fmts.status === 'fulfilled') setFormats(fmts.value);
      if (access.status === 'fulfilled') setAccessibilityTypes(access.value);
      if (dirs.status === 'fulfilled') setDirectionTypes(dirs.value);
      if (dims.status === 'fulfilled') setDimensionTypes(dims.value);
      if (partVis.status === 'fulfilled') setParticipantVisibilityTypes(partVis.value);
      if (offerVis.status === 'fulfilled') setOfferVisibilityTypes(offerVis.value);
      if (rounding.status === 'fulfilled') setRoundingModes(rounding.value);
      setLoadingOptions(false);
    });

    auctionsApi
      .getUnitTypes()
      .then((types) => setUnitTypes(types))
      .finally(() => setLoadingUnitTypes(false));

    auctionsApi
      .getAuctionById(id, ['policies'])
      .then((auction) => {
        const resolvedType = resolveStr(auction.type);
        const loaded: Step1State = {
          title: auction.title ?? '',
          description: auction.description ?? '',
          referenceId: auction.referenceId ?? '',
          format: resolveStr(auction.format),
          accessibility: resolveStr(auction.protocol?.accessibility),
          direction: resolveStr(auction.protocol?.direction),
          priceProgression: derivePriceProgression(resolvedType),
          dimension: resolveStr(auction.protocol?.dimension),
          participantVisibility: resolveStr(auction.protocol?.participantVisibility),
          offerVisibility: resolveStr(auction.protocol?.offerVisibility),
          currencyUnit: resolveStr(auction.monetaryOptions?.currencyUnit),
          precision: String(auction.monetaryOptions?.precision ?? 2),
          roundingMode: resolveStr(auction.monetaryOptions?.roundingMode),
        };
        setStep1(loaded);
        setOriginalStep1(loaded);
        if (resolvedType) setAuctionType(resolvedType);

        // API may return unit as a singular object or as units[] array
        const rawUnit = auction.unit ?? auction.units?.[0];
        if (rawUnit) {
          const unitType = resolveStr(rawUnit.type) as AuctionUnitType;
          const isAtomic = unitType === 'SINGLE_UNIT' || unitType === 'BUNDLE';
          const isSingle = unitType === 'SINGLE_UNIT';
          const openingPrice = String(rawUnit.openingPrice ?? '');

          // item(s) — API may return string ids or {id, ...} objects
          const rawItem = rawUnit.item;
          const item = isSingle
            ? typeof rawItem === 'object' && rawItem !== null
              ? (rawItem as { id: string }).id
              : ((rawItem as string | undefined) ?? '')
            : '';

          const rawItems = rawUnit.items ?? [];
          const itemIds = rawItems.map((it) =>
            typeof it === 'object' && it !== null ? (it as { id: string }).id : (it as string),
          );
          const itemQtys = rawItems.map((it) =>
            typeof it === 'object' && it !== null
              ? String((it as { quantity?: number }).quantity ?? 1)
              : '1',
          );

          if (isAtomic) {
            const atomicItems = isSingle ? [item] : itemIds;
            const atomicQtys = isSingle
              ? [String((rawUnit as { quantity?: number }).quantity ?? 1)]
              : itemQtys;
            setStep2({
              unitCategory: 'ATOMIC',
              unitType,
              openingPrice,
              item: atomicItems[0] ?? '',
              itemName: '',
              itemSummary: null,
              itemQuantity: atomicQtys[0] ?? '1',
              items: atomicItems,
              itemNames: atomicItems.map(() => ''),
              itemSummaries: [],
              itemQuantities: atomicQtys,
              multiItems: [],
              multiItemNames: [],
              multiItemSummaries: [],
              categories: [],
              subCategories: [],
              tags: [],
            });
            origStep2Ref.current = {
              unitType,
              openingPrice,
              item: atomicItems[0] ?? '',
              items: atomicItems,
            };
          } else {
            setStep2({
              unitCategory: unitType as 'MULTI_UNIT' | 'LOT',
              unitType,
              openingPrice,
              item: '',
              itemName: '',
              itemSummary: null,
              itemQuantity: '1',
              items: [],
              itemNames: [],
              itemSummaries: [],
              itemQuantities: [],
              multiItems: itemIds,
              multiItemNames: itemIds.map(() => ''),
              multiItemSummaries: [],
              categories: [],
              subCategories: [],
              tags: [],
            });
            origStep2Ref.current = { unitType, openingPrice, item: '', items: itemIds };
          }
        }

        // Populate Step 3 from expanded policies (may be under policyGroups or policies)
        const groups =
          auction.policyGroups ??
          (auction.policies && !('basePrice' in auction.policies)
            ? (auction.policies as unknown as Record<string, PolicyItemRQ[]>)
            : undefined);
        if (groups && Object.keys(groups).length > 0) {
          setStep3((prev) => ({ ...prev, ...mapPoliciesToStep3(groups) }));
        }
      })
      .catch(() => setStep1GeneralError('Failed to load auction.'))
      .finally(() => setPageLoading(false));
  }, [id]);

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step1.title.trim()) errs.title = 'Title is required.';
    else if (step1.title.trim().length < 5) errs.title = 'Title must be at least 5 characters.';
    else if (step1.title.trim().length > 100) errs.title = 'Title must be at most 100 characters.';
    if (!step1.format) errs.format = 'Format is required.';
    if (!step1.accessibility) errs.accessibility = 'Accessibility is required.';
    if (!step1.direction) errs.direction = 'Direction is required.';
    if (!step1.priceProgression) errs.priceProgression = 'Price progression is required.';
    if (!step1.dimension) errs.dimension = 'Dimension is required.';
    if (!step1.participantVisibility)
      errs.participantVisibility = 'Participant visibility is required.';
    if (!step1.offerVisibility) errs.offerVisibility = 'Offer visibility is required.';
    if (!step1.currencyUnit.trim()) errs.currencyUnit = 'Currency unit is required.';
    const prec = parseInt(step1.precision, 10);
    if (isNaN(prec) || prec < 0 || prec > 3) errs.precision = 'Precision must be between 0 and 3.';
    if (!step1.roundingMode) errs.roundingMode = 'Rounding mode is required.';
    return errs;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1GeneralError(null);
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});

    const hasChanged =
      !originalStep1 ||
      (Object.keys(step1) as (keyof Step1State)[]).some((k) => step1[k] !== originalStep1[k]);

    if (!hasChanged) {
      setStep(2);
      return;
    }

    setSavingStep1(true);
    try {
      const payload: AuctionUpdationRQ = {
        title: step1.title.trim(),
        description: step1.description.trim() || undefined,
        referenceId: step1.referenceId.trim() || undefined,
        accessibility: step1.accessibility,
        direction: step1.direction,
        participantVisibility: step1.participantVisibility,
        offerVisibility: step1.offerVisibility,
        monetaryOptions: {
          currencyUnit: step1.currencyUnit.trim().toUpperCase(),
          precision: parseInt(step1.precision, 10),
          roundingMode: step1.roundingMode,
        },
      };
      await auctionsApi.updateAuction(id, payload);
      setOriginalStep1(step1);
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1GeneralError(parsed.general ?? 'Failed to update auction.');
    } finally {
      setSavingStep1(false);
    }
  };

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  const buildUnitBodyEdit = () => {
    if (step2.unitCategory === 'ATOMIC') {
      if (step2.unitType === 'SINGLE_UNIT') {
        return {
          type: 'SINGLE_UNIT' as AuctionUnitType,
          openingPrice: parseFloat(step2.openingPrice),
          item: step2.item,
          quantity: parseInt(step2.itemQuantity || '1', 10),
        };
      }
      return {
        type: 'BUNDLE' as AuctionUnitType,
        openingPrice: parseFloat(step2.openingPrice),
        items: step2.items.map((itemId, i) => ({
          id: itemId,
          quantity: parseInt(step2.itemQuantities[i] || '1', 10),
        })),
      };
    }
    return {
      type: step2.unitType as AuctionUnitType,
      openingPrice: parseFloat(step2.openingPrice),
      items: step2.multiItems.map((itemId) => ({ id: itemId, quantity: 1 })),
    };
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2GeneralError(null);
    const errs: Record<string, string> = {};
    if (!step2.unitCategory) errs.unitType = 'Unit type is required.';
    if (!step2.openingPrice || isNaN(parseFloat(step2.openingPrice)))
      errs.openingPrice = 'Opening price is required.';
    if (step2.unitCategory === 'ATOMIC' && step2.items.length === 0)
      errs.item = 'At least one listing is required.';
    if (
      (step2.unitCategory === 'MULTI_UNIT' || step2.unitCategory === 'LOT') &&
      step2.multiItems.length === 0
    )
      errs.item = 'At least one listing is required.';
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});

    const orig = origStep2Ref.current;
    const unitChanged =
      step2.unitType !== orig.unitType ||
      step2.openingPrice !== orig.openingPrice ||
      (step2.unitCategory === 'ATOMIC'
        ? step2.item !== orig.item || step2.items.length !== orig.items.length
        : step2.multiItems.length !== orig.items.length);

    if (!unitChanged) {
      setStep(3);
      return;
    }

    setSavingStep2(true);
    try {
      await auctionsApi.updateAuction(id, { unit: buildUnitBodyEdit() });
      origStep2Ref.current = {
        unitType: step2.unitType,
        openingPrice: step2.openingPrice,
        item: step2.item,
        items: step2.items,
      };
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction unit.');
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const validateStep3 = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    step3.participationPolicies.forEach((p, i) => {
      if (!p.type) {
        errs[`participation_type_${i}`] = 'Please select a policy type.';
      } else if (!p.basis) {
        errs[`participation_basis_${i}`] = 'Please select a basis.';
      } else if (!p.value || isNaN(parseFloat(p.value)) || parseFloat(p.value) <= 0) {
        errs[`participation_value_${i}`] = 'A positive value is required.';
      }
    });

    step3.preconditions.forEach((pc, i) => {
      if (!pc.type) {
        errs[`precondition_type_${i}`] = 'Please select a precondition type.';
      } else if (
        pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' &&
        (!pc.count || parseInt(pc.count, 10) < 1)
      ) {
        errs[`precondition_count_${i}`] = 'Minimum participants must be at least 1.';
      }
    });

    step3.priceChangePolicies.forEach((p, i) => {
      if (!p.type) {
        errs[`priceChange_type_${i}`] = 'Please select a policy type.';
      } else if (!p.value || isNaN(parseFloat(p.value)) || parseFloat(p.value) <= 0) {
        errs[`priceChange_value_${i}`] = 'A positive step value is required.';
      }
    });

    return errs;
  };

  const buildPolicies = (): Record<string, PolicyItemRQ[]> => {
    const policies: Record<string, PolicyItemRQ[]> = {};

    const participationItems = step3.participationPolicies.filter(
      (p) => p.type && p.basis && p.value,
    );
    if (participationItems.length > 0) {
      policies['PARTICIPATION_ELIGIBILITY'] = participationItems.map((p, i, arr) => ({
        type: p.type,
        name: p.name || undefined,
        description: p.description || undefined,
        priority: i + 1,
        basis: p.basis as 'FIXED_AMOUNT' | 'PERCENTAGE',
        value: parseFloat(p.value),
        preStartDeadlineDuration:
          i === arr.length - 1
            ? 'PT0S'
            : buildDurationFromDaysHours(p.deadlineDays, p.deadlineHours),
      }));
    }

    const preconditionItems = step3.preconditions.filter((p) => p.type);
    if (preconditionItems.length > 0) {
      policies['PRECONDITION'] = preconditionItems.map((p) => {
        const item: PolicyItemRQ = {
          type: p.type,
          name: p.name || undefined,
          description: p.description || undefined,
        };
        if (p.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY') {
          item.count = parseInt(p.count, 10);
        }
        if (p.validationDays || p.validationHours) {
          item.preStartValidationDuration = buildDurationFromDaysHours(
            p.validationDays,
            p.validationHours,
          );
        }
        return item;
      });
    }

    const isClockBased = auctionType.includes('CLOCK_BASED');
    const isStepBased = auctionType.includes('STEP_PRICED') || auctionType.includes('STEP_BASED');

    if (isClockBased && step3.priceChangePolicyType) {
      policies['CLOCK_BASED_PRICE_CHANGE'] = [{ type: step3.priceChangePolicyType }];
    } else if (isStepBased && step3.priceChangePolicies.length > 0) {
      const items = step3.priceChangePolicies.filter((p) => p.type && p.value);
      if (items.length > 0) {
        policies['OFFER_BASED_PRICE_CHANGE'] = items.map((p, i, arr) => {
          const isLast = i === arr.length - 1;
          const item: PolicyItemRQ = {
            type: p.type,
            name: p.name || undefined,
            description: p.description || undefined,
            priority: i + 1,
            windowDuration: isLast ? 'PT0S' : buildWindowDuration(p.windowHours, p.windowMinutes),
            value: parseFloat(p.value),
          };
          if (p.steps.length > 0) {
            item.steps = p.steps;
          }
          return item;
        });
      }
    } else if (!isClockBased && !isStepBased && step3.priceChangePolicyType) {
      policies['OFFER_BASED_PRICE_CHANGE'] = [{ type: step3.priceChangePolicyType }];
    }

    if (step3.extensionEnabled && step3.extensionType) {
      policies['EXTENSION'] = [
        {
          type: step3.extensionType,
          name: step3.extensionName || undefined,
          description: step3.extensionDescription || undefined,
          reference: step3.extensionReference,
          duration: `PT${parseInt(step3.extensionDurationMinutes, 10) || 10}M`,
          limit: parseInt(step3.extensionLimit, 10) || 0,
        },
      ];
    }

    if (step3.winnerDeterminationType) {
      const item: PolicyItemRQ = {
        type: step3.winnerDeterminationType,
        name: step3.winnerDeterminationName || undefined,
        description: step3.winnerDeterminationDescription || undefined,
      };
      if (step3.winnerDeterminationKth) item.kth = parseInt(step3.winnerDeterminationKth, 10);
      policies['WINNER_DETERMINATION'] = [item];
    }

    if (step3.winnerPriceDeterminationType) {
      const item: PolicyItemRQ = {
        type: step3.winnerPriceDeterminationType,
        name: step3.winnerPriceDeterminationName || undefined,
        description: step3.winnerPriceDeterminationDescription || undefined,
      };
      if (step3.winnerPriceDeterminationKth)
        item.kth = parseInt(step3.winnerPriceDeterminationKth, 10);
      policies['WINNER_PRICE_DETERMINATION'] = [item];
    }

    if (step3.clearingType) {
      policies['CLEARING'] = [
        {
          type: step3.clearingType,
          name: step3.clearingName || undefined,
          description: step3.clearingDescription || undefined,
        },
      ];
    }

    if (step3.tieBreakingType) {
      policies['TIE_BREAKING'] = [
        {
          type: step3.tieBreakingType,
          name: step3.tieBreakingName || undefined,
          description: step3.tieBreakingDescription || undefined,
        },
      ];
    }

    return policies;
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3GeneralError(null);
    const errs = validateStep3();
    if (Object.keys(errs).length) {
      setStep3Errors(errs);
      return;
    }
    setStep3Errors({});
    setSavingStep3(true);
    try {
      const policies = buildPolicies();
      if (Object.keys(policies).length > 0) {
        await auctionsApi.setAuctionPolicyGroups(id, policies);
      }
      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep3Errors(parsed.fieldErrors);
      else setStep3GeneralError(parsed.general ?? 'Failed to save policies.');
    } finally {
      setSavingStep3(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading auction...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Auction"
        description="Update auction details"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <AuctionStepIndicator current={step} onStepClick={setStep} editMode />

      {step === 1 &&
        (() => {
          const hasStep1Changes =
            !originalStep1 ||
            (Object.keys(step1) as (keyof Step1State)[]).some((k) => step1[k] !== originalStep1[k]);
          return (
            <AuctionStep1Details
              form={step1}
              onChange={(u) => setStep1((prev) => ({ ...prev, ...u }))}
              fieldErrors={step1Errors}
              generalError={step1GeneralError}
              formats={formats}
              accessibilityTypes={accessibilityTypes}
              directionTypes={directionTypes}
              dimensionTypes={dimensionTypes}
              participantVisibilityTypes={participantVisibilityTypes}
              offerVisibilityTypes={offerVisibilityTypes}
              roundingModes={roundingModes}
              loadingOptions={loadingOptions}
              saving={savingStep1}
              onSubmit={handleStep1Submit}
              onCancel={() => router.push('/admin/auctions')}
              onSkip={!hasStep1Changes ? () => setStep(2) : undefined}
              submitLabel="Save & Next"
            />
          );
        })()}

      {step === 2 &&
        (() => {
          const o = origStep2Ref.current;
          const hasStep2Changes =
            step2.unitType !== o.unitType ||
            step2.openingPrice !== o.openingPrice ||
            step2.item !== o.item ||
            JSON.stringify(step2.items) !== JSON.stringify(o.items);
          return (
            <AuctionStep2Units
              form={step2}
              onChange={(u) => setStep2((prev) => ({ ...prev, ...u }))}
              fieldErrors={step2Errors}
              generalError={step2GeneralError}
              saving={savingStep2}
              unitTypes={unitTypes}
              loadingUnitTypes={loadingUnitTypes}
              precision={parseInt(step1.precision, 10) || 0}
              onSubmit={handleStep2Submit}
              onBack={() => setStep(1)}
              onSkip={!hasStep2Changes ? () => setStep(3) : undefined}
              submitLabel="Save & Continue"
              submitWithArrow
            />
          );
        })()}

      {step === 3 && (
        <AuctionStep3Media
          auctionId={id}
          username={username}
          uploads={mediaUploads}
          onUploadsChange={setMediaUploads}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 &&
        (() => {
          const hasStep3Changes = JSON.stringify(step3) !== JSON.stringify(initialStep3);
          return (
            <AuctionStep3Policies
              auctionId={id}
              form={step3}
              onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
              auctionType={auctionType}
              direction={step1.direction}
              priceProgression={step1.priceProgression}
              openingPrice={parseFloat(step2.openingPrice) || 0}
              precision={parseInt(step1.precision, 10) || 0}
              currencyUnit={step1.currencyUnit || 'INR'}
              fieldErrors={step3Errors}
              generalError={step3GeneralError}
              saving={savingStep3}
              onSubmit={handleStep3Submit}
              onBack={() => setStep(3)}
              onSkip={!hasStep3Changes ? () => router.push('/admin/auctions') : undefined}
            />
          );
        })()}
    </div>
  );
}
