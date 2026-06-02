'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  listingsApi,
  metadataApi,
  blobsApi,
  ListingVM,
  ListingBlobRef,
  ManagedTypeVM,
  PropertyDef,
} from '@repo/api';
import {
  ArrowLeft,
  Loader2,
  Star,
  CheckCircle2,
  XCircle,
  Pencil,
  Tag,
  Play,
  FileText,
  Download,
} from 'lucide-react';
import { Button, Badge } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { ICON_REGISTRY } from '@/components/common/iconRegistry';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isImageBlob(blob: ListingBlobRef) {
  return (blob.mediaType ?? '').startsWith('image/');
}

function isVideoBlob(blob: ListingBlobRef) {
  return (blob.mediaType ?? '').startsWith('video/');
}

function isDocBlob(blob: ListingBlobRef) {
  return !isImageBlob(blob) && !isVideoBlob(blob);
}

function getThumbnail(blobs: ListingBlobRef[]): ListingBlobRef | undefined {
  const images = blobs.filter(isImageBlob);
  return images.find((b) => b.metadata?.['thumbnail'] === 'true') ?? images[0];
}

function findPropDef(defs: PropertyDef[], name: string): PropertyDef | undefined {
  for (const d of defs) {
    if (d.name === name) return d;
    if (d.value) {
      const found = findPropDef(d.value, name);
      if (found) return found;
    }
  }
}

interface EmbeddedProp {
  type?: string;
  name?: string;
  label?: string;
  value?: unknown;
}

function resolveLabel(raw: string, options?: string): string {
  if (!options) return raw;
  for (const opt of options.split(',')) {
    const [label, val] = opt.trim().split(':');
    if ((val?.trim() ?? label?.trim()) === raw) return label?.trim() ?? raw;
  }
  return raw;
}

// ── Property value renderer ───────────────────────────────────────────────────

function PropValue({ prop, def }: { prop: EmbeddedProp; def?: PropertyDef }) {
  const val = prop.value;
  const attrs = def?.attributes ?? {};
  const uiDisplay = attrs['ui:display'];
  const uiComponent = attrs['ui:component'];
  const colorOptionsRaw = attrs['style:color-options'];
  const optionsRaw = attrs['style:options'];
  const metaType = def?.metaType;

  if (val === undefined || val === null || val === '') {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const strVal = String(val);

  // COMPOSITE — nested table (used when composite is inside another composite)
  if (prop.type === 'COMPOSITE_PROPERTY' && Array.isArray(val)) {
    const children = val as EmbeddedProp[];
    return (
      <div className="rounded-lg border border-border/60 overflow-hidden">
        {children.map((child, i) => {
          const childDef = def?.value ? findPropDef(def.value, child.name ?? '') : undefined;
          return (
            <div
              key={child.name}
              className={`flex items-start gap-4 px-3 py-2 ${i % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'}`}
            >
              <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">
                {child.label ?? child.name}
              </span>
              <PropValue prop={child} def={childDef} />
            </div>
          );
        })}
      </div>
    );
  }

  if ((prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') && Array.isArray(val)) {
    return (
      <div className="flex flex-wrap gap-1">
        {(val as unknown[]).map((item, i) => (
          <span key={i} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  // BOOLEAN
  if (metaType === 'BOOLEAN' || strVal === 'true' || strVal === 'false') {
    const isTrue = strVal === 'true';
    if (uiDisplay === 'badge' || uiComponent === 'toggle' || uiComponent === 'checkbox') {
      return isTrue ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
          <XCircle className="h-4 w-4" /> No
        </span>
      );
    }
  }

  // ui:display = badge
  if (uiDisplay === 'badge') {
    return (
      <Badge variant="secondary" className="text-xs">
        {resolveLabel(strVal, optionsRaw)}
      </Badge>
    );
  }

  // ui:display = color-swatch or style:color-options — show all swatches, highlight selected
  if (uiDisplay === 'color-swatch' || colorOptionsRaw) {
    if (colorOptionsRaw) {
      const colors = colorOptionsRaw
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      return (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => {
            const selected = strVal === color;
            return (
              <div
                key={color}
                title={color}
                className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all select-none ${
                  selected ? 'border-primary scale-105' : 'border-transparent opacity-60'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full border border-border/40 block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-muted-foreground capitalize leading-none">
                  {color}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-5 h-5 rounded-full border border-border inline-block"
          style={{ backgroundColor: strVal }}
        />
        <span className="text-sm capitalize">{strVal}</span>
      </div>
    );
  }

  // ui:display = icon
  if (uiDisplay === 'icon') {
    const IconComp = ICON_REGISTRY[strVal] ?? null;
    return IconComp ? (
      <IconComp className="h-5 w-5 text-foreground" />
    ) : (
      <span className="text-sm">{strVal}</span>
    );
  }

  // ui:component = rating → stars
  if (uiComponent === 'rating') {
    const num = parseInt(strVal, 10) || 0;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < num ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40'}`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{num}/5</span>
      </div>
    );
  }

  // option-pills / style:options → show all options, highlight selected (Amazon-style)
  if ((uiComponent === 'option-pills' || optionsRaw) && optionsRaw) {
    const options = optionsRaw.split(',').map((o) => {
      const [label, val] = o.trim().split(':');
      return { label: label?.trim() ?? '', value: val?.trim() ?? label?.trim() ?? '' };
    });
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = strVal === opt.value;
          return (
            <span
              key={opt.value}
              className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors select-none ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-foreground'
              }`}
            >
              {opt.label}
            </span>
          );
        })}
      </div>
    );
  }

  // tag-input → comma-separated chips
  if (uiComponent === 'tag-input') {
    const tags = strVal
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">
            {t}
          </span>
        ))}
      </div>
    );
  }

  // multiline text
  if (attrs['ui:multiline'] === 'true') {
    return <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{strVal}</p>;
  }

  // metaType-specific rendering for structured values
  if (metaType === 'COORDINATES' && typeof val === 'object' && val !== null) {
    const c = val as Record<string, unknown>;
    const lat = c['latitude'] != null ? String(c['latitude']) : '—';
    const lng = c['longitude'] != null ? String(c['longitude']) : '—';
    return (
      <span className="text-sm font-mono text-foreground">
        {lat}, {lng}
      </span>
    );
  }

  if (metaType === 'ADDRESS' && typeof val === 'object' && val !== null) {
    const a = val as Record<string, unknown>;
    const parts = [
      a['addressLine1'],
      a['addressLine2'],
      a['area'],
      a['city'],
      a['state'],
      a['country'],
      a['pinCode'],
    ].filter(Boolean);
    return <span className="text-sm text-foreground">{parts.join(', ') || '—'}</span>;
  }

  if (metaType === 'DURATION' && typeof strVal === 'string') {
    const m = strVal.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
    if (m) {
      const parts: string[] = [];
      if (m[1]) parts.push(`${m[1]}h`);
      if (m[2]) parts.push(`${m[2]}m`);
      if (m[3]) parts.push(`${Math.floor(Number(m[3]))}s`);
      return <span className="text-sm text-foreground">{parts.join(' ') || '0s'}</span>;
    }
  }

  if (metaType === 'PERIOD' && typeof strVal === 'string') {
    const m = strVal.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?$/);
    if (m) {
      const parts: string[] = [];
      if (m[1]) parts.push(`${m[1]}y`);
      if (m[2]) parts.push(`${m[2]}mo`);
      if (m[3]) parts.push(`${m[3]}d`);
      return <span className="text-sm text-foreground">{parts.join(' ') || '0d'}</span>;
    }
  }

  return <span className="text-sm text-foreground">{strVal}</span>;
}

// ── Media Gallery ─────────────────────────────────────────────────────────────

function MediaGallery({ blobs }: { blobs: ListingBlobRef[] }) {
  const images = blobs.filter(isImageBlob);
  const videos = blobs.filter(isVideoBlob);
  const mediaItems = [...images, ...videos];

  const [activeId, setActiveId] = useState<string>(
    () => getThumbnail(blobs)?.id ?? mediaItems[0]?.id ?? '',
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Collect unique colors from blob metadata (images only)
  const colorMap: Record<string, string[]> = {};
  images.forEach((b) => {
    const c = b.metadata?.['color'];
    if (c) {
      if (!colorMap[c]) colorMap[c] = [];
      colorMap[c].push(b.id);
    }
  });
  const colors = Object.keys(colorMap);
  const hasColors = colors.length > 0;

  // Color filter applies to images; videos always show
  const visibleMedia = selectedColor
    ? [...images.filter((b) => b.metadata?.['color'] === selectedColor), ...videos]
    : mediaItems;

  const effectiveActiveId = visibleMedia.find((b) => b.id === activeId)
    ? activeId
    : (visibleMedia[0]?.id ?? '');

  const activeBlob = mediaItems.find((b) => b.id === effectiveActiveId) ?? visibleMedia[0];
  const isActiveVideo = activeBlob ? isVideoBlob(activeBlob) : false;

  if (!mediaItems.length) {
    return (
      <div className="w-full aspect-square rounded-2xl bg-muted flex items-center justify-center">
        <span className="text-muted-foreground text-sm">No images</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Color swatches */}
      {hasColors && (
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => setSelectedColor(selectedColor === color ? null : color)}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                selectedColor === color
                  ? 'border-primary scale-105'
                  : 'border-transparent hover:border-border'
              }`}
            >
              <span
                className="w-6 h-6 rounded-full border border-border/40 block"
                style={{ backgroundColor: color }}
              />
              <span className="text-[10px] text-muted-foreground capitalize leading-none">
                {color}
              </span>
            </button>
          ))}
          {selectedColor && (
            <button
              type="button"
              onClick={() => setSelectedColor(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Main display */}
      {activeBlob && (
        <div className="relative rounded-2xl overflow-hidden border border-border bg-muted aspect-square">
          {isActiveVideo ? (
            <video
              key={activeBlob.id}
              src={blobsApi.getDownloadUrl(activeBlob.id)}
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobsApi.getDownloadUrl(activeBlob.id)}
              alt={activeBlob.fileName ?? 'image'}
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}

      {/* Thumbnail strip — scrollable */}
      {visibleMedia.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleMedia.map((blob) => {
            const isVideo = isVideoBlob(blob);
            return (
              <button
                key={blob.id}
                type="button"
                onClick={() => setActiveId(blob.id)}
                className={`shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all relative ${
                  blob.id === effectiveActiveId
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                {isVideo ? (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground fill-muted-foreground" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blobsApi.getDownloadUrl(blob.id)}
                    alt={blob.fileName ?? ''}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Document Attachments ──────────────────────────────────────────────────────

function DocAttachments({ blobs }: { blobs: ListingBlobRef[] }) {
  const docs = blobs.filter(isDocBlob);
  if (!docs.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Documents</h2>
      <div className="space-y-1.5">
        {docs.map((blob) => (
          <div
            key={blob.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate">{blob.fileName ?? blob.id}</span>
            </div>
            <a
              href={blobsApi.getDownloadUrl(blob.id)}
              download={blob.fileName ?? true}
              className="shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              <Download className="h-3 w-3" />
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ListingViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState<ListingVM | null>(null);
  const [managedType, setManagedType] = useState<ManagedTypeVM | null>(null);

  useEffect(() => {
    listingsApi
      .getListingById(id)
      .then(async (l) => {
        setListing(l);
        const embedded = l.embedded as Record<string, unknown> | undefined;
        if (embedded?.typeId) {
          try {
            setManagedType(await metadataApi.getManagedTypeById(String(embedded.typeId)));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">Listing not found.</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
          Back to listings
        </Button>
      </div>
    );
  }

  const blobs = listing.blobs ?? [];
  const embedded = listing.embedded as Record<string, unknown> | undefined;
  const embeddedProps = Array.isArray(embedded?.properties)
    ? (embedded!.properties as EmbeddedProp[])
    : [];
  const propDefs = managedType?.properties ?? [];

  const subCat = listing.subCategory;
  const subCatName =
    typeof subCat === 'object' && subCat !== null
      ? (subCat as { name?: string }).name
      : (subCat as string | undefined);

  const cat = listing.category;
  const CatIcon = cat?.icon ? (ICON_REGISTRY[cat.icon] ?? null) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={listing.name}
        description={subCatName ?? 'Listing details'}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/listings')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button size="sm" onClick={() => router.push(`/admin/listings/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left — media gallery + documents */}
        <div className="lg:col-span-2 space-y-4">
          <MediaGallery blobs={blobs} />
          <DocAttachments blobs={blobs} />
        </div>

        {/* Right — details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Title & meta */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight">{listing.name}</h1>

            {/* Category breadcrumb */}
            {(cat || subCatName) && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {CatIcon && <CatIcon className="h-3.5 w-3.5" />}
                {cat && <span>{cat.name}</span>}
                {cat && subCatName && <span>›</span>}
                {subCatName && <span>{subCatName}</span>}
              </div>
            )}

            {/* Availability */}
            <div className="flex items-center gap-2">
              {listing.available === true ? (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  In Stock
                  {listing.quantity?.available != null &&
                    ` — ${listing.quantity.available} available`}
                </Badge>
              ) : listing.available === false ? (
                <Badge
                  variant="destructive"
                  className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30"
                >
                  Out of Stock
                </Badge>
              ) : null}
              {listing.status && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {listing.status}
                </Badge>
              )}
            </div>

            {/* Tags */}
            {listing.tags && listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {listing.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" />
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{listing.description}</p>
            )}
          </div>

          {/* Embedded catalog properties */}
          {embeddedProps.length > 0 &&
            (() => {
              const scalarProps = embeddedProps.filter(
                (p) => !(p.type === 'COMPOSITE_PROPERTY' && Array.isArray(p.value)),
              );
              const compositeProps = embeddedProps.filter(
                (p) => p.type === 'COMPOSITE_PROPERTY' && Array.isArray(p.value),
              );
              return (
                <div className="space-y-4">
                  {/* Scalar fields card */}
                  {scalarProps.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                      {managedType && (
                        <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">
                          {managedType.name}
                        </h2>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        {scalarProps.map((prop) => {
                          if (!prop.name) return null;
                          const def = findPropDef(propDefs, prop.name);
                          const labelText = prop.label ?? def?.label ?? prop.name;
                          return (
                            <div key={prop.name}>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                {labelText}
                              </p>
                              <PropValue prop={prop} def={def} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Composite spec cards */}
                  {compositeProps.map((prop) => {
                    if (!prop.name) return null;
                    const def = findPropDef(propDefs, prop.name);
                    const labelText = prop.label ?? def?.label ?? prop.name;
                    const children = prop.value as EmbeddedProp[];
                    return (
                      <div
                        key={prop.name}
                        className="rounded-xl border border-border bg-card overflow-hidden"
                      >
                        {/* Card header */}
                        <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{labelText}</span>
                          <span className="text-xs text-muted-foreground">
                            ·{' '}
                            {
                              children.filter(
                                (c) => c.value !== undefined && c.value !== null && c.value !== '',
                              ).length
                            }{' '}
                            fields
                          </span>
                        </div>
                        {/* Spec table */}
                        <div className="divide-y divide-border/50">
                          {children.map((child) => {
                            if (!child.name) return null;
                            const childDef = def?.value
                              ? findPropDef(def.value, child.name)
                              : undefined;
                            const childLabel = child.label ?? childDef?.label ?? child.name;
                            const isEmpty =
                              child.value === undefined ||
                              child.value === null ||
                              child.value === '';
                            return (
                              <div
                                key={child.name}
                                className="flex items-start gap-4 px-5 py-2.5 hover:bg-muted/20 transition-colors"
                              >
                                <span className="text-xs font-medium text-muted-foreground w-32 shrink-0 pt-0.5">
                                  {childLabel}
                                </span>
                                {isEmpty ? (
                                  <span className="text-xs text-muted-foreground/50">—</span>
                                ) : (
                                  <PropValue prop={child} def={childDef} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
        </div>
      </div>
    </div>
  );
}
