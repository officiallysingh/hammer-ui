'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionCreationRQ, AuctionUnitType, PolicyItemRQ } from '@repo/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { SelectOption } from '../_components/AuctionShared';
import { AuctionStepIndicator } from '../_components/AuctionStepIndicator';
import { AuctionStep1Details, Step1State, initialStep1 } from '../_components/AuctionStep1Details';
import { AuctionStep2Units, Step2State, initialStep2 } from '../_components/AuctionStep2Units';
import {
  AuctionStep3Policies,
  Step3State,
  initialStep3,
} from '../_components/AuctionStep3Policies';

function deriveAuctionType(priceProgression: string, unitType: string): string {
  const isAtomic = unitType === 'SINGLE_UNIT' || unitType === 'BUNDLE';
  if (priceProgression === 'STEP_BASED' && isAtomic) {
    return 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION';
  }
  return '';
}

export default function NewAuctionPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);

  // Step 1
  const [step1, setStep1] = useState<Step1State>(initialStep1);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2
  const [step2, setStep2] = useState<Step2State>(initialStep2);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);
  const [createdAuctionType, setCreatedAuctionType] = useState('');
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
  }, []);

  // ── Step 1 submit ──────────────────────────────────────────────────────────

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep(2);
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────

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
      const auctionType = deriveAuctionType(step1.priceProgression, step2.unitType);
      if (!auctionType) {
        setStep2GeneralError(
          'This price progression and unit type combination is not yet supported.',
        );
        setSavingStep2(false);
        return;
      }
      let auctionId = createdAuctionId;
      if (!auctionId) {
        const payload: AuctionCreationRQ = {
          type: auctionType,
          format: step1.format,
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
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: {
            type: step2.unitType as AuctionUnitType,
            openingPrice: parseFloat(step2.openingPrice),
            ...(isSingle ? { item: step2.item } : { items: step2.items }),
          },
        };
        auctionId = await auctionsApi.createAuction(payload);
        setCreatedAuctionId(auctionId);
        setCreatedAuctionType(auctionType);
      } else {
        await auctionsApi.setAuctionUnits(auctionId, {
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: {
            type: step2.unitType as AuctionUnitType,
            openingPrice: parseFloat(step2.openingPrice),
            ...(isSingle ? { item: step2.item } : { items: step2.items }),
          },
        });
      }
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to create auction.');
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 submit ──────────────────────────────────────────────────────────

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
    if (!createdAuctionId) {
      setStep3GeneralError('Auction ID is missing. Please go back and try again.');
      return;
    }
    setSavingStep3(true);
    try {
      const policies = buildPolicies();
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicyGroups(createdAuctionId, { policies });
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

  const handleSkip = () => router.push('/admin/auctions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="New auction"
        description="Create a new auction"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <AuctionStepIndicator current={step} onStepClick={(s) => s < step && setStep(s)} />

      {step === 1 && (
        <AuctionStep1Details
          form={step1}
          onChange={(u) => setStep1((prev) => ({ ...prev, ...u }))}
          fieldErrors={step1Errors}
          formats={formats}
          accessibilityTypes={accessibilityTypes}
          directionTypes={directionTypes}
          dimensionTypes={dimensionTypes}
          participantVisibilityTypes={participantVisibilityTypes}
          offerVisibilityTypes={offerVisibilityTypes}
          roundingModes={roundingModes}
          loadingOptions={loadingOptions}
          onSubmit={handleStep1Submit}
          onCancel={() => router.push('/admin/auctions')}
        />
      )}

      {step === 2 && (
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
          onSkip={JSON.stringify(step2) === JSON.stringify(initialStep2) ? handleSkip : undefined}
          submitLabel="Save & Finish"
        />
      )}

      {step === 3 && (
        <AuctionStep3Policies
          form={step3}
          onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
          auctionType={createdAuctionType}
          priceProgression={step1.priceProgression}
          openingPrice={parseFloat(step2.openingPrice) || 0}
          precision={parseInt(step1.precision, 10) || 0}
          currencyUnit={step1.currencyUnit || 'INR'}
          fieldErrors={step3Errors}
          generalError={step3GeneralError}
          saving={savingStep3}
          onSubmit={handleStep3Submit}
          onBack={() => setStep(2)}
          onSkip={JSON.stringify(step3) === JSON.stringify(initialStep3) ? handleSkip : undefined}
        />
      )}
    </div>
  );
}
