'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mail, Phone, RefreshCw, Search, Send, Trash2, UserPlus } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { participantsApi, usersApi, ParticipantVM, UserSummary } from '@repo/api';
import { PhrasesInput } from '@/components/common/admin/PhrasesInput';
import { UserAvatar } from '@/components/common/admin/UserAvatar';
import { parseApiError } from '@/lib/api-errors';
import { DismissibleError, FieldError } from './AuctionShared';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function invitationStatusLabel(p: ParticipantVM): string {
  const status = p.invitation?.status;
  if (!status) return 'NA';
  return typeof status === 'string' ? status : (Object.values(status)[0] as string) || 'NA';
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'ACCEPTED':
      return 'bg-emerald-500/10 text-emerald-600';
    case 'DECLINED':
    case 'EXPIRED':
      return 'bg-destructive/10 text-destructive';
    case 'PENDING':
    case 'INVITED':
      return 'bg-amber-500/10 text-amber-600';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

interface Props {
  auctionId: string;
}

export function AuctionParticipantsTab({ auctionId }: Props) {
  const [participants, setParticipants] = useState<ParticipantVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Invite by search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [invitingUser, setInvitingUser] = useState<string | null>(null);

  // Invite by email/phone
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const [generalError, setGeneralError] = useState<string | null>(null);

  const loadParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const data = await participantsApi.getAllParticipants(auctionId, { size: 50 });
      setParticipants(data.content ?? []);
    } catch {
      // Non-fatal
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  // ── Search users ────────────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-popover]')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const phrase = q.trim();
    if (!phrase) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await usersApi.getUserSummaries([phrase]);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    runSearch(q);
  };

  const handleInviteUser = async (user: UserSummary) => {
    setGeneralError(null);
    setInvitingUser(user.username);
    try {
      await participantsApi.inviteParticipant(auctionId, {
        emailId: user.emailId,
        mobileNo: user.mobileNo,
      });
      setOpen(false);
      setQuery('');
      setResults([]);
      await loadParticipants();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to invite user.');
    } finally {
      setInvitingUser(null);
    }
  };

  // ── Invite by email / phone ────────────────────────────────────────────────

  const handleEmailsChange = (values: string[]) => {
    const valid = values.filter((v) => EMAIL_RE.test(v.trim()));
    const invalid = values.filter((v) => !EMAIL_RE.test(v.trim()));
    setEmailError(invalid.length ? `Not a valid email: ${invalid.join(', ')}` : undefined);
    setEmails(valid);
  };

  const handlePhonesChange = (values: string[]) => {
    const valid = values.filter((v) => PHONE_RE.test(v.trim()));
    const invalid = values.filter((v) => !PHONE_RE.test(v.trim()));
    setPhoneError(invalid.length ? `Not a valid phone: ${invalid.join(', ')}` : undefined);
    setPhones(valid);
  };

  const handleSendInvites = async () => {
    if (emails.length === 0 && phones.length === 0) return;
    setSending(true);
    setGeneralError(null);
    try {
      await Promise.all([
        ...emails.map((emailId) => participantsApi.inviteParticipant(auctionId, { emailId })),
        ...phones.map((mobileNo) => participantsApi.inviteParticipant(auctionId, { mobileNo })),
      ]);
      setEmails([]);
      setPhones([]);
      setEmailError(undefined);
      setPhoneError(undefined);
      await loadParticipants();
    } catch (err) {
      setGeneralError(parseApiError(err).general ?? 'Failed to send invitations.');
    } finally {
      setSending(false);
    }
  };

  // ── Remove participant ─────────────────────────────────────────────────────

  const handleRemoveParticipant = async (id: string) => {
    setRemovingId(id);
    try {
      await participantsApi.deleteParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // Non-fatal
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <DismissibleError message={generalError} />

      {/* Invite by search */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          Search users
        </Label>
        <div className="relative" data-search-popover>
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.trim() && setOpen(true)}
            placeholder="Search by name, username, email or mobile..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {open && (query.trim() || searching) && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-64 overflow-y-auto">
              {searching ? (
                <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">No users found.</div>
              ) : (
                results.map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => handleInviteUser(user)}
                    disabled={invitingUser === user.username}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    <UserAvatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      username={user.username}
                      src={user.profilePicture}
                      size={28}
                      className="h-7 w-7 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.emailId} · @{user.username}
                      </p>
                    </div>
                    {invitingUser === user.username ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite by email */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          Invite by email
        </Label>
        <PhrasesInput
          value={emails}
          onChange={handleEmailsChange}
          placeholder="Type an email and press Enter..."
        />
        <FieldError message={emailError} />
      </div>

      {/* Invite by phone */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-1.5">
        <Label className="flex items-center gap-1.5 text-sm font-medium">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          Invite by phone
        </Label>
        <PhrasesInput
          value={phones}
          onChange={handlePhonesChange}
          placeholder="Type a phone number and press Enter..."
        />
        <FieldError message={phoneError} />
      </div>

      {(emails.length > 0 || phones.length > 0) && (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSendInvites}
            disabled={sending}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send {emails.length + phones.length} invitation
            {emails.length + phones.length !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {/* Participants list */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Invited participants {participants.length > 0 && `(${participants.length})`}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={loadParticipants}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading participants...
          </div>
        ) : participants.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No one has been invited yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {participants.map((p) => {
              const status = invitationStatusLabel(p);
              return (
                <li key={p.id} className="flex items-center gap-2.5 py-2">
                  <UserAvatar
                    firstName={p.name?.split(' ')[0]}
                    lastName={p.name?.split(' ').slice(1).join(' ')}
                    username={p.username || p.emailId}
                    src={p.profilePicture || p.avatar}
                    size={28}
                    className="h-7 w-7 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {p.name || p.username || p.emailId || p.mobileNo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {p.emailId || p.mobileNo}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${statusBadgeClass(status)}`}
                  >
                    {status}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(p.id)}
                    disabled={removingId === p.id}
                    className="shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-60"
                    title="Remove participant"
                  >
                    {removingId === p.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
