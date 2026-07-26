'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { auctionsApi, PolicyGroup, PolicyEvaluationMap, PolicyItemRQ } from '@repo/api';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { DismissibleError, SelectOption } from './AuctionShared';
import {
  POLICY_DEFAULTS,
  PAYMENT_POLICY_NAME_DEFAULTS,
  PAYMENT_HEAD_DEFAULT,
} from './PolicyShared';
import {
  mapSavedPolicies,
  buildPaymentPolicyItem,
  buildPreconditionItem,
  buildPriceProgressionWrapper,
  buildParticipationItem,
  buildExtensionItem,
  buildWinnerDeterminationItem,
  buildWinnerPriceDeterminationItem,
} from './AuctionStep3PolicyMapping';
import { PolicyPaymentSection, PaymentPolicyFields } from './PolicyPaymentSection';
import { PolicyParticipationSection } from './PolicyParticipationSection';
import { PolicyPreconditionsSection, PreconditionFields } from './PolicyPreconditionsSection';
import { PolicyPriceProgressionSection } from './PolicyPriceProgressionSection';
import { PolicyExtensionSection } from './PolicyExtensionSection';
import { PolicyWinnerSection } from './PolicyWinnerSection';
import { EvaluationList, PolicyItemCard } from './PolicyEvaluationDisplay';
import { parseApiError } from '@/lib/api-errors';

// Re-export types so pages can import from a single location
export type {
  PaymentPolicyItem,
  PolicyHeadItem,
  PreconditionItem,
  PriceChangeItem,
  Step3State,
} from './AuctionStep3Types';
export { initialStep3 } from './AuctionStep3Types';

import type { Step3State } from './AuctionStep3Types';

/** For mandatory groups: seed one empty item if the group exists but form is empty */
function seedMandatoryDefaults(current: Step3State, groups: PolicyGroup[]): Partial<Step3State> {
  const patch: Partial<Step3State> = {};
  const hasGroup = (name: string) => groups.some((g) => g.name === name);
  const firstOption = (name: string): string => {
    const g = groups.find((g) => g.name === name);
    if (!g?.types.length) return '';
    return Object.keys(g.types[0]!)[0] ?? '';
  };

  // Participation — auto-enable
  if (hasGroup('PARTICIPATION') && !current.participationEnabled) {
    const defaults = POLICY_DEFAULTS['PARTICIPATION_POLICY'];
    patch.participationEnabled = true;
    patch.participationName = defaults?.name ?? '';
    patch.participationDescription = defaults?.description ?? '';
    patch.participationValidationHours = '0';
    patch.participationValidationMinutes = '0';
  }

  // Payment — mandatory
  if (hasGroup('PAYMENT') && current.paymentPolicies.length === 0) {
    const paymentDefaults = PAYMENT_POLICY_NAME_DEFAULTS.AUCTION_START_TIME;
    patch.paymentPolicies = [
      {
        name: paymentDefaults.name,
        description: paymentDefaults.description,
        scheduleReference: 'AUCTION_START_TIME',
        offsetDays: '',
        offsetHours: '0',
        mode: 'ONLINE',
        heads: [
          {
            name: PAYMENT_HEAD_DEFAULT.name,
            description: PAYMENT_HEAD_DEFAULT.description,
            basis: '',
            value: '',
            refundable: false,
          },
        ],
      },
    ];
  }

  // Price Progression — mandatory
  if (hasGroup('PRICE_PROGRESSION') && current.priceChangePolicies.length === 0) {
    const firstType = firstOption('PRICE_PROGRESSION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.priceChangePolicies = [
      {
        type: firstType,
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
        windowHours: '0',
        windowMinutes: '0',
        steps: [],
        value: '',
      },
    ];
  }

  // Extension — display one by default
  const extensionGroupName = hasGroup('EXTENSION')
    ? 'EXTENSION'
    : hasGroup('AUCTION_EXTENSION')
      ? 'AUCTION_EXTENSION'
      : '';
  if (extensionGroupName && !current.extensionEnabled) {
    const firstType = firstOption(extensionGroupName);
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.extensionEnabled = true;
    patch.extensionType = firstType;
    patch.extensionName = defaults?.name ?? '';
    patch.extensionDescription = defaults?.description ?? '';
  }

  // Winner Determination — mandatory
  if (hasGroup('WINNER_DETERMINATION') && !current.winnerDeterminationType) {
    const firstType = firstOption('WINNER_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerDeterminationType = firstType;
    patch.winnerDeterminationName = defaults?.name ?? '';
    patch.winnerDeterminationDescription = defaults?.description ?? '';
  }

  // Winner Price Determination — mandatory
  if (hasGroup('WINNER_PRICE_DETERMINATION') && !current.winnerPriceDeterminationType) {
    const firstType = firstOption('WINNER_PRICE_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerPriceDeterminationType = firstType;
    patch.winnerPriceDeterminationName = defaults?.name ?? '';
    patch.winnerPriceDeterminationDescription = defaults?.description ?? '';
  }

  return patch;
}

// ── Review-before-save — evaluates every policy in one shot when Save is clicked ──

interface ReviewItem {
  label: string;
  evaluations: PolicyEvaluationMap | null;
}

interface ReviewData {
  payment: ReviewItem[];
  preconditions: ReviewItem[];
  priceProgression?: PolicyEvaluationMap;
  participation?: PolicyEvaluationMap;
  extension?: PolicyEvaluationMap;
  winnerDetermination?: PolicyEvaluationMap;
  winnerPriceDetermination?: PolicyEvaluationMap;
}

const EMPTY_REVIEW: ReviewData = { payment: [], preconditions: [] };

function ReviewSection({
  title,
  evaluations,
}: {
  title: string;
  evaluations: PolicyEvaluationMap;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      <EvaluationList evaluations={evaluations} />
    </div>
  );
}

// ── Inline save/cancel bar for editing a single already-saved policy ───────────

function SaveCancelBar({
  saving,
  error,
  onSave,
  onCancel,
}: {
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

interface AuctionStep3PoliciesProps {
  auctionId?: string;
  form: Step3State;
  onChange: (updates: Partial<Step3State>) => void;
  auctionType: string;
  direction: string;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  submitLabel?: string;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip?: () => void;
}

export function AuctionStep3Policies({
  auctionId,
  form,
  onChange,
  auctionType,
  direction,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  generalError,
  saving,
  submitLabel = 'Save & Finish',
  onSubmit,
  onBack,
  onSkip,
}: AuctionStep3PoliciesProps) {
  const [groups, setGroups] = useState<PolicyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [paymentModeOptions, setPaymentModeOptions] = useState<SelectOption[]>([]);
  // Track whether we've already seeded defaults so we only do it once
  const seededRef = useRef(false);

  // Evaluate-only view for already-saved policies — keyed by policy id.
  const [evaluationsByPolicyId, setEvaluationsByPolicyId] = useState<
    Record<string, PolicyEvaluationMap>
  >({});
  // Which saved policy (by a stable key, e.g. 'participation' or `payment-2`) is
  // currently showing its editable form instead of the read-only evaluate card.
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  /** Saves a single already-saved policy, refreshes its evaluation, and exits edit mode. */
  const runSave = async (policyId: string | undefined, item: PolicyItemRQ | null) => {
    if (!auctionId || !policyId || !item) return;
    setSavingItem(true);
    setItemError(null);
    try {
      await auctionsApi.updateAuctionPolicy(auctionId, policyId, item);
      const evals = await auctionsApi.evaluateAuctionPolicy(auctionId, policyId).catch(() => null);
      if (evals) setEvaluationsByPolicyId((m) => ({ ...m, [policyId]: evals }));
      setEditingKey(null);
    } catch (err) {
      setItemError(parseApiError(err).general ?? 'Failed to save policy.');
    } finally {
      setSavingItem(false);
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setItemError(null);
  };

  /** Saves Winner Determination + Winner Price Determination together — they're
   *  edited as one form (PolicyWinnerSection) even though each is its own saved policy. */
  const saveWinnerBoth = async () => {
    if (!auctionId) return;
    setSavingItem(true);
    setItemError(null);
    try {
      if (form.winnerDeterminationPolicyId) {
        const item = buildWinnerDeterminationItem(form);
        if (item) {
          await auctionsApi.updateAuctionPolicy(auctionId, form.winnerDeterminationPolicyId, item);
          const evals = await auctionsApi
            .evaluateAuctionPolicy(auctionId, form.winnerDeterminationPolicyId)
            .catch(() => null);
          if (evals) {
            setEvaluationsByPolicyId((m) => ({ ...m, [form.winnerDeterminationPolicyId!]: evals }));
          }
        }
      }
      if (form.winnerPriceDeterminationPolicyId) {
        const item = buildWinnerPriceDeterminationItem(form);
        if (item) {
          await auctionsApi.updateAuctionPolicy(
            auctionId,
            form.winnerPriceDeterminationPolicyId,
            item,
          );
          const evals = await auctionsApi
            .evaluateAuctionPolicy(auctionId, form.winnerPriceDeterminationPolicyId)
            .catch(() => null);
          if (evals) {
            setEvaluationsByPolicyId((m) => ({
              ...m,
              [form.winnerPriceDeterminationPolicyId!]: evals,
            }));
          }
        }
      }
      setEditingKey(null);
    } catch (err) {
      setItemError(parseApiError(err).general ?? 'Failed to save policy.');
    } finally {
      setSavingItem(false);
    }
  };

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData>(EMPTY_REVIEW);

  const runReview = async () => {
    if (!auctionId) {
      onSubmit({ preventDefault: () => {} } as React.FormEvent);
      return;
    }

    setReviewOpen(true);
    setReviewLoading(true);
    setReviewData(EMPTY_REVIEW);

    const preview = (item: ReturnType<typeof buildExtensionItem>) =>
      item
        ? auctionsApi.previewAuctionPolicy(auctionId, item).catch(() => null)
        : Promise.resolve(null);

    const paymentTasks = form.paymentPolicies.map((p, i) => ({
      label: p.name || `Payment Policy ${i + 1}`,
      item: buildPaymentPolicyItem(p, i + 1, currencyUnit),
    }));
    const preconditionTasks = form.preconditions.map((p, i) => ({
      label: p.name || `Precondition ${i + 1}`,
      item: buildPreconditionItem(p),
    }));

    const [
      paymentResults,
      preconditionResults,
      priceResult,
      participationResult,
      extensionResult,
      winnerDetResult,
      winnerPriceResult,
    ] = await Promise.all([
      Promise.all(
        paymentTasks.map(async (t) => ({ label: t.label, evaluations: await preview(t.item) })),
      ),
      Promise.all(
        preconditionTasks.map(async (t) => ({
          label: t.label,
          evaluations: await preview(t.item),
        })),
      ),
      preview(buildPriceProgressionWrapper(form.priceChangePolicies)),
      preview(buildParticipationItem(form)),
      preview(buildExtensionItem(form)),
      preview(buildWinnerDeterminationItem(form)),
      preview(buildWinnerPriceDeterminationItem(form)),
    ]);

    setReviewData({
      payment: paymentResults.filter((r) => r.evaluations),
      preconditions: preconditionResults.filter((r) => r.evaluations),
      priceProgression: priceResult ?? undefined,
      participation: participationResult ?? undefined,
      extension: extensionResult ?? undefined,
      winnerDetermination: winnerDetResult ?? undefined,
      winnerPriceDetermination: winnerPriceResult ?? undefined,
    });
    setReviewLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runReview();
  };

  const confirmAndSubmit = () => {
    setReviewOpen(false);
    onSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  const reviewHasContent =
    reviewData.payment.length > 0 ||
    reviewData.preconditions.length > 0 ||
    !!reviewData.priceProgression ||
    !!reviewData.participation ||
    !!reviewData.extension ||
    !!reviewData.winnerDetermination ||
    !!reviewData.winnerPriceDetermination;

  useEffect(() => {
    auctionsApi
      .getPaymentModes()
      .then(setPaymentModeOptions)
      .catch(() => setPaymentModeOptions([]));
  }, []);

  useEffect(() => {
    if (!auctionType) return;
    seededRef.current = false;

    Promise.all([
      auctionsApi.getPolicyGroups(auctionType),
      auctionId
        ? auctionsApi.getAuctionPolicies(auctionId).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([fetchedGroups, savedGroups]) => {
        setGroups(fetchedGroups);

        if (seededRef.current) return;
        seededRef.current = true;

        let patch: Partial<Step3State> = {};

        if (savedGroups && Object.keys(savedGroups).length > 0) {
          patch = mapSavedPolicies(savedGroups);

          // Evaluate every saved policy (top-level items across all groups) by id,
          // so the read-only card view can show real results instead of raw fields.
          const policyIds = Array.from(
            new Set(
              Object.values(savedGroups)
                .flat()
                .map((p) => p.id)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          if (auctionId && policyIds.length > 0) {
            Promise.all(
              policyIds.map((policyId) =>
                auctionsApi
                  .evaluateAuctionPolicy(auctionId, policyId)
                  .then((res) => [policyId, res] as const)
                  .catch(() => [policyId, null] as const),
              ),
            ).then((results) => {
              const map: Record<string, PolicyEvaluationMap> = {};
              for (const [policyId, res] of results) {
                if (res) map[policyId] = res;
              }
              setEvaluationsByPolicyId(map);
            });
          }
        }

        // Then seed any mandatory groups that are still empty after restore
        const merged: Step3State = { ...form, ...patch };
        const mandatoryPatch = seedMandatoryDefaults(merged, fetchedGroups);
        onChange({ ...patch, ...mandatoryPatch });
      })
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionType, auctionId]);

  const getGroupOptions = (groupName: string): SelectOption[] => {
    const group = groups.find((g) => g.name === groupName);
    if (!group) return [];
    return group.types.flatMap((t) =>
      Object.entries(t).map(([value, label]) => ({ value, label })),
    );
  };

  const getGroupDescription = (groupName: string): string =>
    groups.find((g) => g.name === groupName)?.description ?? '';

  const hasGroup = (groupName: string) => groups.some((g) => g.name === groupName);

  const extensionGroupName = hasGroup('EXTENSION') ? 'EXTENSION' : 'AUCTION_EXTENSION';
  const hasExtension = hasGroup('EXTENSION') || hasGroup('AUCTION_EXTENSION');

  const setField = (field: string, value: string) =>
    onChange({ [field]: value } as Partial<Step3State>);

  /** Renders one payment group (pre or post payment) — saved items as read-only
   *  evaluate cards (or an inline editor while being edited), drafts via the
   *  existing add-new-item form. */
  const renderPaymentGroup = (
    fixedScheduleReference: 'AUCTION_START_TIME' | 'AUCTION_END_TIME',
    title: string,
  ) => {
    const savedItems = form.paymentPolicies
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p }) => p.id && (p.scheduleReference || 'AUCTION_START_TIME') === fixedScheduleReference,
      );

    return (
      <div className="space-y-3">
        {savedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {savedItems.map(({ p, i }) =>
              editingKey === `payment-${i}` ? (
                <div key={p.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                  <PaymentPolicyFields
                    index={i}
                    policy={p}
                    onChange={(patch) =>
                      onChange({
                        paymentPolicies: form.paymentPolicies.map((pp, idx) =>
                          idx === i ? { ...pp, ...patch } : pp,
                        ),
                      })
                    }
                    openingPrice={openingPrice}
                    precision={precision}
                    currencyUnit={currencyUnit}
                    fieldErrors={fieldErrors}
                    fixedScheduleReference={fixedScheduleReference}
                    modeOptions={paymentModeOptions}
                  />
                  <SaveCancelBar
                    saving={savingItem}
                    error={itemError}
                    onSave={() =>
                      runSave(p.id, buildPaymentPolicyItem(p, p.priority ?? i + 1, currencyUnit))
                    }
                    onCancel={cancelEdit}
                  />
                </div>
              ) : (
                <PolicyItemCard
                  key={p.id}
                  auctionId={auctionId!}
                  policyId={p.id}
                  name={p.name || 'Payment Policy'}
                  type="PAYMENT_POLICY"
                  evaluations={p.id ? evaluationsByPolicyId[p.id] : undefined}
                  editable
                  onEdit={() => setEditingKey(`payment-${i}`)}
                  deletable
                  onDeleted={() =>
                    onChange({
                      paymentPolicies: form.paymentPolicies.filter((_, idx) => idx !== i),
                    })
                  }
                />
              ),
            )}
          </div>
        )}
        <PolicyPaymentSection
          policies={form.paymentPolicies}
          onChange={(v) => onChange({ paymentPolicies: v })}
          openingPrice={openingPrice}
          precision={precision}
          currencyUnit={currencyUnit}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('PAYMENT')}
          title={savedItems.length > 0 ? `Add another — ${title}` : title}
          fixedScheduleReference={fixedScheduleReference}
          modeOptions={paymentModeOptions}
        />
      </div>
    );
  };

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading policy options...</span>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <DismissibleError message={generalError} />

        {/* Participation */}
        {hasGroup('PARTICIPATION') &&
          (form.participationPolicyId && editingKey !== 'participation' ? (
            <PolicyItemCard
              auctionId={auctionId!}
              policyId={form.participationPolicyId}
              name={form.participationName || 'Participation Policy'}
              type="PARTICIPATION_POLICY"
              evaluations={evaluationsByPolicyId[form.participationPolicyId]}
              editable
              onEdit={() => setEditingKey('participation')}
              deletable
              onDeleted={() =>
                onChange({
                  participationEnabled: false,
                  participationPolicyId: undefined,
                  participationName: '',
                  participationDescription: '',
                  participationTypeId: '',
                  participationManualApproval: false,
                })
              }
            />
          ) : (
            <div className="space-y-2">
              <PolicyParticipationSection
                name={form.participationName}
                description={form.participationDescription}
                onNameChange={(v) => onChange({ participationName: v })}
                onDescriptionChange={(v) => onChange({ participationDescription: v })}
                typeId={form.participationTypeId}
                onTypeIdChange={(v) => onChange({ participationTypeId: v })}
                manualApproval={form.participationManualApproval}
                onManualApprovalToggle={(v) => onChange({ participationManualApproval: v })}
                validationHours={form.participationValidationHours}
                onValidationHoursChange={(v) => onChange({ participationValidationHours: v })}
                validationMinutes={form.participationValidationMinutes}
                onValidationMinutesChange={(v) => onChange({ participationValidationMinutes: v })}
                groupDescription={getGroupDescription('PARTICIPATION')}
              />
              {editingKey === 'participation' && (
                <SaveCancelBar
                  saving={savingItem}
                  error={itemError}
                  onSave={() => runSave(form.participationPolicyId, buildParticipationItem(form))}
                  onCancel={cancelEdit}
                />
              )}
            </div>
          ))}

        {/* Payment */}
        {hasGroup('PAYMENT') &&
          renderPaymentGroup(
            'AUCTION_START_TIME',
            'Pre Payment / Participation Eligibility Policy',
          )}

        {/* Preconditions */}
        {(hasGroup('PRECONDITION') || getGroupOptions('PRECONDITION').length > 0) &&
          (() => {
            const savedItems = form.preconditions.map((p, i) => ({ p, i })).filter(({ p }) => p.id);
            const usedTypes = form.preconditions.map((p) => p.type).filter(Boolean);
            return (
              <div className="space-y-3">
                {savedItems.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Preconditions</h3>
                    {savedItems.map(({ p, i }) =>
                      editingKey === `precondition-${i}` ? (
                        <div
                          key={p.id}
                          className="rounded-lg border border-border bg-card p-4 space-y-3"
                        >
                          <PreconditionFields
                            index={i}
                            precondition={p}
                            onChange={(patch) =>
                              onChange({
                                preconditions: form.preconditions.map((pp, idx) =>
                                  idx === i ? { ...pp, ...patch } : pp,
                                ),
                              })
                            }
                            options={getGroupOptions('PRECONDITION')}
                            usedTypes={usedTypes}
                            fieldErrors={fieldErrors}
                          />
                          <SaveCancelBar
                            saving={savingItem}
                            error={itemError}
                            onSave={() => runSave(p.id, buildPreconditionItem(p))}
                            onCancel={cancelEdit}
                          />
                        </div>
                      ) : (
                        <PolicyItemCard
                          key={p.id}
                          auctionId={auctionId!}
                          policyId={p.id}
                          name={p.name || 'Precondition'}
                          type={p.type}
                          evaluations={p.id ? evaluationsByPolicyId[p.id] : undefined}
                          editable
                          onEdit={() => setEditingKey(`precondition-${i}`)}
                          deletable
                          onDeleted={() =>
                            onChange({
                              preconditions: form.preconditions.filter((_, idx) => idx !== i),
                            })
                          }
                        />
                      ),
                    )}
                  </div>
                )}
                <PolicyPreconditionsSection
                  preconditions={form.preconditions}
                  onChange={(v) => onChange({ preconditions: v })}
                  options={getGroupOptions('PRECONDITION')}
                  fieldErrors={fieldErrors}
                  groupDescription={getGroupDescription('PRECONDITION')}
                />
              </div>
            );
          })()}

        {/* Price Progression */}
        {hasGroup('PRICE_PROGRESSION') &&
          (form.priceProgressionPolicyId && editingKey !== 'priceProgression' ? (
            <PolicyItemCard
              auctionId={auctionId!}
              policyId={form.priceProgressionPolicyId}
              name="Price Progression"
              type="PRICE_PROGRESSION_POLICY"
              evaluations={evaluationsByPolicyId[form.priceProgressionPolicyId]}
              editable
              onEdit={() => setEditingKey('priceProgression')}
              deletable
              onDeleted={() =>
                onChange({ priceProgressionPolicyId: undefined, priceChangePolicies: [] })
              }
            />
          ) : (
            <div className="space-y-2">
              <PolicyPriceProgressionSection
                priceChangePolicies={form.priceChangePolicies}
                onPoliciesChange={(v) => onChange({ priceChangePolicies: v })}
                options={getGroupOptions('PRICE_PROGRESSION')}
                fieldErrors={fieldErrors}
                groupDescription={getGroupDescription('PRICE_PROGRESSION')}
              />
              {editingKey === 'priceProgression' && (
                <SaveCancelBar
                  saving={savingItem}
                  error={itemError}
                  onSave={() =>
                    runSave(
                      form.priceProgressionPolicyId,
                      buildPriceProgressionWrapper(form.priceChangePolicies),
                    )
                  }
                  onCancel={cancelEdit}
                />
              )}
            </div>
          ))}

        {/* Extension */}
        {hasExtension &&
          (form.extensionPolicyId && editingKey !== 'extension' ? (
            <PolicyItemCard
              auctionId={auctionId!}
              policyId={form.extensionPolicyId}
              name={form.extensionName || 'Extension Policy'}
              type={form.extensionType}
              evaluations={evaluationsByPolicyId[form.extensionPolicyId]}
              editable
              onEdit={() => setEditingKey('extension')}
              deletable
              onDeleted={() =>
                onChange({
                  extensionEnabled: false,
                  extensionPolicyId: undefined,
                  extensionType: '',
                  extensionName: '',
                  extensionDescription: '',
                })
              }
            />
          ) : (
            <div className="space-y-2">
              <PolicyExtensionSection
                extensionEnabled={form.extensionEnabled}
                extensionType={form.extensionType}
                extensionName={form.extensionName}
                extensionDescription={form.extensionDescription}
                extensionReference={form.extensionReference}
                extensionDurationMinutes={form.extensionDurationMinutes}
                extensionLimit={form.extensionLimit}
                onAdd={() => {
                  const opts = getGroupOptions(extensionGroupName);
                  const first = opts[0];
                  const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                  onChange({
                    extensionEnabled: true,
                    extensionType: first?.value ?? '',
                    extensionName: defaults?.name ?? '',
                    extensionDescription: defaults?.description ?? '',
                  });
                }}
                onRemove={() =>
                  onChange({
                    extensionEnabled: false,
                    extensionType: '',
                    extensionName: '',
                    extensionDescription: '',
                  })
                }
                onFieldChange={setField}
                options={getGroupOptions(extensionGroupName)}
                fieldErrors={fieldErrors}
                groupDescription={getGroupDescription(extensionGroupName)}
              />
              {editingKey === 'extension' && (
                <SaveCancelBar
                  saving={savingItem}
                  error={itemError}
                  onSave={() => runSave(form.extensionPolicyId, buildExtensionItem(form))}
                  onCancel={cancelEdit}
                />
              )}
            </div>
          ))}

        {/* Winner Determination + Winner Price Determination */}
        {(hasGroup('WINNER_DETERMINATION') || hasGroup('WINNER_PRICE_DETERMINATION')) &&
          (() => {
            const winnerFullySaved =
              (!hasGroup('WINNER_DETERMINATION') || Boolean(form.winnerDeterminationPolicyId)) &&
              (!hasGroup('WINNER_PRICE_DETERMINATION') ||
                Boolean(form.winnerPriceDeterminationPolicyId));

            if (winnerFullySaved && editingKey !== 'winner') {
              return (
                <div className="space-y-3">
                  {form.winnerDeterminationPolicyId && (
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.winnerDeterminationPolicyId}
                      name={form.winnerDeterminationName || 'Winner Determination'}
                      type={form.winnerDeterminationType}
                      evaluations={evaluationsByPolicyId[form.winnerDeterminationPolicyId]}
                      editable
                      onEdit={() => setEditingKey('winner')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          winnerDeterminationPolicyId: undefined,
                          winnerDeterminationType: '',
                          winnerDeterminationName: '',
                          winnerDeterminationDescription: '',
                          winnerDeterminationKth: '1',
                        })
                      }
                    />
                  )}
                  {form.winnerPriceDeterminationPolicyId && (
                    <PolicyItemCard
                      auctionId={auctionId!}
                      policyId={form.winnerPriceDeterminationPolicyId}
                      name={form.winnerPriceDeterminationName || 'Winner Price Determination'}
                      type={form.winnerPriceDeterminationType}
                      evaluations={evaluationsByPolicyId[form.winnerPriceDeterminationPolicyId]}
                      editable
                      onEdit={() => setEditingKey('winner')}
                      deletable
                      onDeleted={() =>
                        onChange({
                          winnerPriceDeterminationPolicyId: undefined,
                          winnerPriceDeterminationType: '',
                          winnerPriceDeterminationName: '',
                          winnerPriceDeterminationDescription: '',
                          winnerPriceDeterminationKth: '1',
                        })
                      }
                    />
                  )}
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <PolicyWinnerSection
                  direction={direction}
                  winnerDeterminationType={form.winnerDeterminationType}
                  winnerDeterminationKth={form.winnerDeterminationKth}
                  winnerDeterminationName={form.winnerDeterminationName}
                  winnerDeterminationDescription={form.winnerDeterminationDescription}
                  winnerPriceDeterminationType={form.winnerPriceDeterminationType}
                  winnerPriceDeterminationKth={form.winnerPriceDeterminationKth}
                  winnerPriceDeterminationName={form.winnerPriceDeterminationName}
                  winnerPriceDeterminationDescription={form.winnerPriceDeterminationDescription}
                  onFieldChange={setField}
                  onWinnerAdd={() => {
                    const opts = getGroupOptions('WINNER_DETERMINATION');
                    const first = opts[0];
                    const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                    onChange({
                      winnerDeterminationType: first?.value ?? '',
                      winnerDeterminationName: defaults?.name ?? '',
                      winnerDeterminationDescription: defaults?.description ?? '',
                    });
                  }}
                  onWinnerRemove={() =>
                    onChange({
                      winnerDeterminationType: '',
                      winnerDeterminationName: '',
                      winnerDeterminationDescription: '',
                      winnerDeterminationKth: '1',
                    })
                  }
                  onWinnerPriceAdd={() => {
                    const opts = getGroupOptions('WINNER_PRICE_DETERMINATION');
                    const first = opts[0];
                    const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
                    onChange({
                      winnerPriceDeterminationType: first?.value ?? '',
                      winnerPriceDeterminationName: defaults?.name ?? '',
                      winnerPriceDeterminationDescription: defaults?.description ?? '',
                    });
                  }}
                  onWinnerPriceRemove={() =>
                    onChange({
                      winnerPriceDeterminationType: '',
                      winnerPriceDeterminationName: '',
                      winnerPriceDeterminationDescription: '',
                      winnerPriceDeterminationKth: '1',
                    })
                  }
                  winnerDeterminationOptions={getGroupOptions('WINNER_DETERMINATION')}
                  winnerPriceOptions={getGroupOptions('WINNER_PRICE_DETERMINATION')}
                  fieldErrors={fieldErrors}
                  winnerGroupInfo={getGroupDescription('WINNER_DETERMINATION')}
                  winnerPriceGroupInfo={getGroupDescription('WINNER_PRICE_DETERMINATION')}
                />
                {editingKey === 'winner' && (
                  <SaveCancelBar
                    saving={savingItem}
                    error={itemError}
                    onSave={saveWinnerBoth}
                    onCancel={cancelEdit}
                  />
                )}
              </div>
            );
          })()}

        {/* Post Payment */}
        {hasGroup('PAYMENT') &&
          renderPaymentGroup('AUCTION_END_TIME', 'Post Payment / Winning Amount Payment Policy')}

        <div className="flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          {onSkip ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onSkip}
              disabled={saving}
              className="gap-2"
            >
              Skip <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </div>
      </form>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review policy evaluation</DialogTitle>
          </DialogHeader>

          {reviewLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Evaluating policies...</span>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {reviewData.participation && (
                <ReviewSection title="Participation" evaluations={reviewData.participation} />
              )}
              {reviewData.payment.map((p, i) => (
                <ReviewSection key={`payment-${i}`} title={p.label} evaluations={p.evaluations!} />
              ))}
              {reviewData.preconditions.map((p, i) => (
                <ReviewSection
                  key={`precondition-${i}`}
                  title={p.label}
                  evaluations={p.evaluations!}
                />
              ))}
              {reviewData.priceProgression && (
                <ReviewSection
                  title="Price Progression"
                  evaluations={reviewData.priceProgression}
                />
              )}
              {reviewData.extension && (
                <ReviewSection title="Extension" evaluations={reviewData.extension} />
              )}
              {reviewData.winnerDetermination && (
                <ReviewSection
                  title="Winner Determination"
                  evaluations={reviewData.winnerDetermination}
                />
              )}
              {reviewData.winnerPriceDetermination && (
                <ReviewSection
                  title="Winner Price Determination"
                  evaluations={reviewData.winnerPriceDetermination}
                />
              )}
              {!reviewHasContent && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No policy evaluations available.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewOpen(false)}
              disabled={saving}
            >
              Back to edit
            </Button>
            <Button
              type="button"
              onClick={confirmAndSubmit}
              disabled={saving || reviewLoading}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
