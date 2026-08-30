'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Mail, Phone, Send, UserPlus } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { auctionsApi } from '@repo/api';
import { DismissibleError, FieldError } from './AuctionShared';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { parseApiError } from '@/lib/api-errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

interface Props {
  auctionId: string;
  onBack: () => void;
  onFinish: () => void;
}

/**
 * Final, optional wizard step — invite specific people to a restricted-access
 * auction by email or phone number. Skippable at any time; invites can also
 * be sent later once the auction is scheduled/published.
 */
export function AuctionStep6Invitations({ auctionId, onBack, onFinish }: Props) {
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleEmailsChange = (values: string[]) => {
    const valid = values.filter((v) => EMAIL_RE.test(v.trim()));
    const invalid = values.filter((v) => !EMAIL_RE.test(v.trim()));
    setEmailError(invalid.length ? `Not a valid email: ${invalid.join(', ')}` : undefined);
    setEmails(valid);
  };

  const handlePhonesChange = (values: string[]) => {
    const normalize = (v: string) => v.replace(/[\s-]/g, '');
    const valid = values.filter((v) => PHONE_RE.test(normalize(v)));
    const invalid = values.filter((v) => !PHONE_RE.test(normalize(v)));
    setPhoneError(invalid.length ? `Not a valid phone number: ${invalid.join(', ')}` : undefined);
    setPhones(valid);
  };

  const hasInvitees = emails.length + phones.length > 0;

  const handleSend = async () => {
    setGeneralError(null);
    if (!hasInvitees) {
      onFinish();
      return;
    }
    setSending(true);
    try {
      await auctionsApi.inviteParticipants(auctionId, {
        emails: emails.length ? emails : undefined,
        phoneNumbers: phones.length ? phones : undefined,
      });
      onFinish();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to send invitations.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 shrink-0">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invite participants</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Optional — invite specific people to this auction by email or phone number. You can
              skip this and invite people later.
            </p>
          </div>
        </div>

        <DismissibleError message={generalError} />

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            Email addresses
          </Label>
          <PhrasesInput
            value={emails}
            onChange={handleEmailsChange}
            placeholder="Type an email and press Enter..."
          />
          <FieldError message={emailError} />
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            Phone numbers
          </Label>
          <PhrasesInput
            value={phones}
            onChange={handlePhonesChange}
            placeholder="Type a phone number and press Enter..."
          />
          <FieldError message={phoneError} />
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={sending}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onFinish} disabled={sending}>
            Skip
          </Button>
          <Button type="button" onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : hasInvitees ? (
              <>
                <Send className="h-4 w-4" />
                Send Invites & Finish
              </>
            ) : (
              <>
                Finish <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
