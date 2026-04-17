'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  listingsApi,
  masterApi,
  metadataApi,
  CategoryVM,
  ManagedTypeVM,
  ManagedTypeListItem,
} from '@repo/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';
import { useAuthStore } from '@/store/authStore';
import { StepIndicator } from '../_components/StepIndicator';
import { Step1Details, ListingDetails } from '../_components/Step1Details';
import { Step2Media } from '../_components/Step2Media';
import { Step3Catalog } from '../_components/Step3Catalog';

export default function NewListingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const username = user?.username ?? 'unknown';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [listingId, setListingId] = useState('');
  const origRef = useRef<ListingDetails | null>(null);

  // Step 1 state
  const [details, setDetails] = useState<ListingDetails>({
    name: '',
    description: '',
    categoryId: '',
    subCategory: '',
    tags: [],
  });
  const [categories, setCategories] = useState<CategoryVM[]>([]);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1Saving, setStep1Saving] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 state
  const [uploads, setUploads] = useState<Parameters<typeof Step2Media>[0]['uploads']>([]);

  // Step 3 state
  const [typeListItems, setTypeListItems] = useState<ManagedTypeListItem[]>([]);
  const [managedTypeId, setManagedTypeId] = useState('');
  const [selectedManagedType, setSelectedManagedType] = useState<ManagedTypeVM | null>(null);
  const [loadingType, setLoadingType] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [step3Saving, setStep3Saving] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const hasChanges = () => {
    const orig = origRef.current;
    if (!orig) return true; // if no orig, need to save
    if (details.name.trim() !== orig.name) return true;
    if ((details.description.trim() || '') !== (orig.description || '')) return true;
    if (details.tags.length !== orig.tags.length || details.tags.some((t, i) => t !== orig.tags[i]))
      return true;
    if (details.subCategory !== orig.subCategory) return true;
    return false;
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  useEffect(() => {
    Promise.all([masterApi.getCategories(true), metadataApi.getManagedTypeListItems()])
      .then(([cats, items]) => {
        setCategories(cats);
        setTypeListItems(items);
      })
      .catch(() => {});
  }, []);

  // ── Step 1: create listing, get ID ────────────────────────────────────────
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!details.name.trim()) errs.name = 'Name is required.';
    if (!details.subCategory) errs.subCategory = 'Sub-category is required.';
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep1Error(null);
    setStep1Saving(true);
    try {
      if (listingId) {
        // Update existing
        const orig = origRef.current;
        const patch: {
          name?: string;
          description?: string;
          tags?: string[];
          subCategory?: string;
        } = {};
        if (!orig || details.name.trim() !== orig.name) patch.name = details.name.trim();
        if (!orig || (details.description.trim() || '') !== (orig.description || ''))
          patch.description = details.description.trim() || undefined;
        const tagsChanged =
          !orig ||
          details.tags.length !== orig.tags.length ||
          details.tags.some((t, i) => t !== orig.tags[i]);
        if (tagsChanged) patch.tags = details.tags;
        if (!orig || details.subCategory !== orig.subCategory)
          patch.subCategory = details.subCategory;
        if (Object.keys(patch).length > 0) {
          await listingsApi.updateListing(listingId, patch);
        }
        origRef.current = { ...details };
      } else {
        // Create new
        const res = await listingsApi.createListing({
          name: details.name.trim(),
          description: details.description.trim() || undefined,
          tags: details.tags.length ? details.tags : undefined,
          subCategory: details.subCategory,
        });
        setListingId(res);
        origRef.current = { ...details };
      }
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1Error(parsed.general ?? 'Failed to save listing.');
    } finally {
      setStep1Saving(false);
    }
  };

  // ── Step 3: patch listing with embedded struct ────────────────────────────
  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3Error(null);
    if (!managedTypeId) {
      setStep3Error('Please select a type definition.');
      return;
    }
    setStep3Saving(true);
    try {
      await listingsApi.updateListing(listingId, {
        subCategory: details.subCategory,
        embedded: { typeId: managedTypeId, pathWiseState: fieldValues },
      });
      router.push('/admin/listings');
    } catch (err) {
      const parsed = parseApiError(err);
      setStep3Error(parsed.general ?? 'Failed to update listing.');
    } finally {
      setStep3Saving(false);
    }
  };

  const handleTypeChange = async (id: string) => {
    setManagedTypeId(id);
    setFieldValues({});
    if (!id) {
      setSelectedManagedType(null);
      return;
    }
    setLoadingType(true);
    try {
      setSelectedManagedType(await metadataApi.getManagedTypeById(id));
    } catch {
      setSelectedManagedType(null);
    } finally {
      setLoadingType(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New listing"
        description="Create a new auction listing"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <>
          {step1Error && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {step1Error}
            </div>
          )}
          <Step1Details
            values={details}
            onChange={(patch) => setDetails((p) => ({ ...p, ...patch }))}
            categories={categories}
            fieldErrors={step1Errors}
            onNext={handleStep1}
            onCancel={() => router.push('/admin/listings')}
            nextLabel={listingId ? 'Continue' : 'Save & Continue'}
          />
        </>
      )}

      {step === 2 && (
        <Step2Media
          listingId={listingId}
          username={username}
          uploads={uploads}
          onUploadsChange={setUploads}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
          onCancel={() => router.push('/admin/listings')}
        />
      )}

      {step === 3 && (
        <Step3Catalog
          typeListItems={typeListItems}
          managedTypeId={managedTypeId}
          selectedManagedType={selectedManagedType}
          loadingType={loadingType}
          fieldValues={fieldValues}
          onTypeChange={handleTypeChange}
          onFieldChange={(name, value) => setFieldValues((p) => ({ ...p, [name]: value }))}
          onSubmit={handleStep3}
          onBack={() => setStep(2)}
          onCancel={() => router.push('/admin/listings')}
          saving={step3Saving}
          error={step3Error}
        />
      )}
    </div>
  );
}
