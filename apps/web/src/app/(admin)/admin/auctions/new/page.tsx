'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionCreationRQ, AuctionUnitType, PolicyItemRQ } from '@repo/api';

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
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1GeneralError(null);
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
        const updatePayload = {
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: {
            type: step2.unitType as AuctionUnitType,
            openingPrice: parseFloat(step2.openingPrice),
            ...(isSingle ? { item: step2.item } : { items: step2.items }),
          },
        };
        await auctionsApi.updateAuction(auctionId, updatePayload);
      }
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      const step1FieldNames = new Set([
        'title',
        'format',
        'accessibility',
        'direction',
        'dimension',
        'participantVisibility',
        'offerVisibility',
        'currencyUnit',
        'precision',
        'roundingMode',
      ]);
      const s1Errs: Record<string, string> = {};
      const s2Errs: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.fieldErrors)) {
        if (step1FieldNames.has(k)) s1Errs[k] = v;
        else s2Errs[k] = v;
      }
      if (Object.keys(s1Errs).length) {
        setStep1Errors(s1Errs);
        setStep1GeneralError('Please correct the highlighted fields.');
        setStep(1);
      } else if (Object.keys(s2Errs).length) {
        setStep2Errors(s2Errs);
      } else {
        setStep2GeneralError(parsed.general ?? 'Failed to create auction.');
      }
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 submit ──────────────────────────────────────────────────────────

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

    const isClockBased = createdAuctionType.includes('CLOCK_BASED');
    const isStepBased =
      createdAuctionType.includes('STEP_PRICED') || createdAuctionType.includes('STEP_BASED');

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
    if (!createdAuctionId) {
      setStep3GeneralError('Auction ID is missing. Please go back and try again.');
      return;
    }
    setSavingStep3(true);
    try {
      const policies = buildPolicies();
      if (Object.keys(policies).length > 0) {
        await auctionsApi.setAuctionPolicyGroups(createdAuctionId, policies);
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
          onChange={(u) => {
            setStep1((prev) => ({ ...prev, ...u }));
            const changed = Object.keys(u) as (keyof Step1State)[];
            if (changed.some((f) => step1Errors[f])) {
              setStep1Errors((prev) => {
                const next = { ...prev };
                changed.forEach((f) => delete next[f]);
                return next;
              });
            }
          }}
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
          onSubmit={handleStep1Submit}
          onCancel={() => router.push('/admin/auctions')}
        />
      )}

      {step === 2 && (
        <AuctionStep2Units
          form={step2}
          onChange={(u) => {
            setStep2((prev) => ({ ...prev, ...u }));
            const changed = Object.keys(u);
            if (changed.some((f) => step2Errors[f])) {
              setStep2Errors((prev) => {
                const next = { ...prev };
                changed.forEach((f) => delete next[f]);
                return next;
              });
            }
          }}
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
