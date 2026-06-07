'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auctionsApi, AuctionUpdationRQ, AuctionUnitType, PolicyItemRQ } from '@repo/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { SelectOption } from '../../_components/AuctionShared';
import { AuctionStepIndicator } from '../../_components/AuctionStepIndicator';
import { AuctionStep1Details, Step1State } from '../../_components/AuctionStep1Details';
import { AuctionStep2Units, Step2State } from '../../_components/AuctionStep2Units';
import {
  AuctionStep3Policies,
  Step3State,
  initialStep3,
} from '../../_components/AuctionStep3Policies';

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

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState(1);

  const [originalStep1, setOriginalStep1] = useState<Step1State | null>(null);
  const origStep2Ref = useRef<{
    unitType: string;
    openingPrice: string;
    item: string;
    items: string[];
  }>({
    unitType: '',
    openingPrice: '',
    item: '',
    items: [],
  });

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

  // Step 3
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
      .getAuctionById(id)
      .then((auction) => {
        const loaded: Step1State = {
          title: auction.title ?? '',
          description: auction.description ?? '',
          referenceId: auction.referenceId ?? '',
          format: resolveStr(auction.format),
          accessibility: resolveStr(auction.protocol?.accessibility),
          direction: resolveStr(auction.protocol?.direction),
          priceProgression: '',
          dimension: resolveStr(auction.protocol?.dimension),
          participantVisibility: resolveStr(auction.protocol?.participantVisibility),
          offerVisibility: resolveStr(auction.protocol?.offerVisibility),
          currencyUnit: resolveStr(auction.monetaryOptions?.currencyUnit),
          precision: String(auction.monetaryOptions?.precision ?? 2),
          roundingMode: resolveStr(auction.monetaryOptions?.roundingMode),
        };
        setStep1(loaded);
        setOriginalStep1(loaded);
        if (auction.type) setAuctionType(resolveStr(auction.type));

        if (auction.units?.length) {
          const u = auction.units[0]!;
          const isSingle = u.type === 'SINGLE_UNIT';
          const unitType = u.type;
          const openingPrice = String(u.openingPrice ?? '');
          const item = isSingle ? (u.item ?? '') : '';
          const items = isSingle ? [] : (u.items ?? []);
          setStep2({
            unitType,
            openingPrice,
            item,
            itemName: '',
            itemSummary: null,
            items,
            itemNames: isSingle ? [] : (u.items?.map(() => '') ?? []),
            itemSummaries: [],
            categories: [],
            subCategories: [],
            tags: [],
          });
          origStep2Ref.current = { unitType, openingPrice, item, items };
        }
      })
      .catch(() => setStep1GeneralError('Failed to load auction.'))
      .finally(() => setPageLoading(false));
  }, [id]);

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step1.title.trim()) errs.title = 'Title is required.';
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
        protocol: {
          accessibility: step1.accessibility,
          direction: step1.direction,
          dimension: step1.dimension,
          participantVisibility: step1.participantVisibility,
          offerVisibility: step1.offerVisibility,
        },
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

  const validateStep2 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step2.unitType) errs.unitType = 'Unit type is required.';
    if (!step2.openingPrice || isNaN(parseFloat(step2.openingPrice)))
      errs.openingPrice = 'Opening price is required.';
    if (step2.unitType === 'SINGLE_UNIT' && !step2.item) errs.item = 'A listing is required.';
    if (step2.unitType && step2.unitType !== 'SINGLE_UNIT' && step2.items.length === 0)
      errs.item = 'At least one listing is required.';
    return errs;
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2GeneralError(null);
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});
    setSavingStep2(true);
    try {
      const isSingle = step2.unitType === 'SINGLE_UNIT';

      await auctionsApi.setAuctionUnits(id, {
        tags: step2.tags.length ? step2.tags : undefined,
        subCategories: step2.subCategories.length ? step2.subCategories : undefined,
        unit: {
          type: step2.unitType as AuctionUnitType,
          openingPrice: parseFloat(step2.openingPrice),
          ...(isSingle ? { item: step2.item } : { items: step2.items }),
        },
      });

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
    if (step3.participationType === 'EMD_POLICY') {
      if (!step3.emdBasis) errs.emdBasis = 'Please add a participant fee.';
      if (
        step3.emdBasis &&
        (!step3.emdValue || isNaN(parseFloat(step3.emdValue)) || parseFloat(step3.emdValue) <= 0)
      )
        errs.emdValue = 'A positive EMD value is required.';
    }
    step3.preconditions.forEach((pc, i) => {
      if (!pc.type) {
        errs[`precondition_type_${i}`] = 'Please select a precondition type.';
      } else if (
        pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' &&
        (!pc.minimumCount || parseInt(pc.minimumCount, 10) < 1)
      ) {
        errs[`precondition_${i}`] = 'Minimum participants must be at least 1.';
      }
    });
    return errs;
  };

  const buildPolicies = (): PolicyItemRQ[] => {
    const policies: PolicyItemRQ[] = [];
    if (step3.participationType) {
      const p: PolicyItemRQ = { type: step3.participationType };
      if (step3.participationType === 'EMD_POLICY' && step3.emdBasis) {
        p.basis = step3.emdBasis as 'FIXED_AMOUNT' | 'PERCENTAGE';
        p.value = parseFloat(step3.emdValue);
      }
      policies.push(p);
    }
    for (const pc of step3.preconditions) {
      if (!pc.type) continue;
      const p: PolicyItemRQ = { type: pc.type };
      if (pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY')
        p.minimumCount = parseInt(pc.minimumCount, 10);
      policies.push(p);
    }
    if (step3.priceChangePolicyType) policies.push({ type: step3.priceChangePolicyType });
    if (step3.auctionExtensionType) policies.push({ type: step3.auctionExtensionType });
    if (step3.winnerDeterminationType) policies.push({ type: step3.winnerDeterminationType });
    if (step3.clearingType) policies.push({ type: step3.clearingType });
    if (step3.tieBreakingType) policies.push({ type: step3.tieBreakingType });
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
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicyGroups(id, { policies });
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
              onSkip={!hasStep2Changes ? () => router.push('/admin/auctions') : undefined}
              submitLabel="Next"
              submitWithArrow
            />
          );
        })()}

      {step === 3 &&
        (() => {
          const hasStep3Changes = JSON.stringify(step3) !== JSON.stringify(initialStep3);
          return (
            <AuctionStep3Policies
              form={step3}
              onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
              auctionType={auctionType}
              priceProgression={step1.priceProgression}
              openingPrice={parseFloat(step2.openingPrice) || 0}
              precision={parseInt(step1.precision, 10) || 0}
              currencyUnit={step1.currencyUnit || 'INR'}
              fieldErrors={step3Errors}
              generalError={step3GeneralError}
              saving={savingStep3}
              onSubmit={handleStep3Submit}
              onBack={() => setStep(2)}
              onSkip={!hasStep3Changes ? () => router.push('/admin/auctions') : undefined}
            />
          );
        })()}
    </div>
  );
}
