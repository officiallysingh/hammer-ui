'use client';

import { metadataApi } from '@repo/api';
import { MetadataForm, MetadataFormValues } from '../_components/MetadataForm';

export default function NewMetadataPage() {
  const handleSubmit = async (values: MetadataFormValues) => {
    await metadataApi.createManagedType({
      name: values.name.trim(),
      description: values.description.trim(),
      type: values.type as Parameters<typeof metadataApi.createManagedType>[0]['type'],
      classifier: values.classifier as Parameters<
        typeof metadataApi.createManagedType
      >[0]['classifier'],
      properties: values.properties,
      tags: values.tags.length ? values.tags : undefined,
    });
  };

  return (
    <MetadataForm
      title="New type"
      description="Create a new managed type definition"
      submitLabel="Create type"
      onSubmit={handleSubmit}
    />
  );
}
