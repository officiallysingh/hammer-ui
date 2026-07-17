'use client';

import { Landmark } from 'lucide-react';
import PageHeader from '@/components/common/admin/PageHeader';

export default function BanksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Banks" description="Manage bank accounts" />

      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 rounded-lg border border-border bg-card">
        <Landmark className="h-10 w-10 opacity-30" />
        <p className="text-sm">Bank management is coming soon.</p>
      </div>
    </div>
  );
}
