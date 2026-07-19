'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, authApi, bankDetailsApi, masterApi } from '@repo/api';
import type { UserInfo, BankDetailVM, BankVM } from '@repo/api';
import { IFSC_REGEX, ACCOUNT_NO_REGEX } from '@repo/api';
import { useAuthStore } from '@/store/authStore';
import {
  Loader2,
  User,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  Star,
  Building2,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@repo/ui';
import { parseApiError } from '@/lib/api-errors';
import { AvatarUpload } from '@/components/common/admin/AvatarUpload';
import { UserAvatar } from '@/components/common/admin/UserAvatar';

const PWD_RULES =
  '6–12 characters · at least 1 uppercase · 1 lowercase · 1 digit · allowed special: @$!%*?&^';

// ── Shared helpers ────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  tip,
  children,
}: {
  label: string;
  error?: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className={error ? 'text-destructive' : ''}>{label}</Label>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`pr-10 ${error ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ── Change Password Dialog ────────────────────────────────────────────────────

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setShowCurrent(false);
    setShowNext(false);
    setFieldErrors({});
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (next !== confirm) {
      setFieldErrors({ confirm: 'Passwords do not match.' });
      return;
    }
    const pwdRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d@$!%*?&^]{6,12}$/;
    if (!pwdRegex.test(next)) {
      setFieldErrors({
        newPassword: '6–12 chars, must include uppercase, lowercase and a number.',
      });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setSuccess(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 1500);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to change password. Check your current password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-6 flex flex-col items-center gap-2 text-emerald-500">
            <CheckCircle2 className="h-8 w-8" />
            <p className="text-sm font-medium">Password updated successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Current password" error={fieldErrors.currentPassword}>
              <PasswordInput
                id="cp-current"
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                onToggle={() => setShowCurrent((s) => !s)}
                placeholder="Enter current password"
                error={fieldErrors.currentPassword}
              />
            </Field>
            <Field label="New password" error={fieldErrors.newPassword} tip={PWD_RULES}>
              <PasswordInput
                id="cp-new"
                value={next}
                onChange={setNext}
                show={showNext}
                onToggle={() => setShowNext((s) => !s)}
                placeholder="6–12 chars, A-Z, a-z, 0-9"
                error={fieldErrors.newPassword}
              />
            </Field>
            <Field label="Confirm new password" error={fieldErrors.confirm}>
              <PasswordInput
                id="cp-confirm"
                value={confirm}
                onChange={setConfirm}
                show={showNext}
                onToggle={() => setShowNext((s) => !s)}
                placeholder="Repeat new password"
                error={fieldErrors.confirm}
              />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !current || !next || !confirm}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Update password
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Update Profile Tab ────────────────────────────────────────────────────────

function UpdateProfileTab({
  userInfo,
  setUserInfo,
}: {
  userInfo: UserInfo | null;
  setUserInfo: (info: UserInfo | null) => void;
}) {
  const [email, setEmail] = useState(userInfo?.emailId ?? '');
  const [firstName, setFirstName] = useState(userInfo?.firstName ?? '');
  const [lastName, setLastName] = useState(userInfo?.lastName ?? '');
  const [mobileNo, setMobileNo] = useState(userInfo?.mobileNo ?? '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setSaving(true);
    try {
      await usersApi.updateSelf({
        emailId: email.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        mobileNo: mobileNo.trim() || undefined,
      });
      if (userInfo) {
        setUserInfo({
          ...userInfo,
          emailId: email.trim() || userInfo.emailId,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          mobileNo: mobileNo.trim() || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length > 0) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label="Email" error={fieldErrors.emailId}>
        <Input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearErr('emailId');
          }}
          placeholder="abc@xyz.com"
          type="email"
          autoComplete="email"
          className={fieldErrors.emailId ? 'border-destructive focus-visible:ring-destructive' : ''}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" error={fieldErrors.firstName}>
          <Input
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              clearErr('firstName');
            }}
            placeholder="John"
            autoComplete="given-name"
            className={
              fieldErrors.firstName ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
        </Field>
        <Field label="Last name" error={fieldErrors.lastName}>
          <Input
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              clearErr('lastName');
            }}
            placeholder="Doe"
            autoComplete="family-name"
            className={
              fieldErrors.lastName ? 'border-destructive focus-visible:ring-destructive' : ''
            }
          />
        </Field>
      </div>
      <Field label="Mobile number" error={fieldErrors.mobileNo}>
        <Input
          value={mobileNo}
          onChange={(e) => {
            setMobileNo(e.target.value);
            clearErr('mobileNo');
          }}
          placeholder="+91 98765 43210"
          autoComplete="tel"
          type="tel"
          className={
            fieldErrors.mobileNo ? 'border-destructive focus-visible:ring-destructive' : ''
          }
        />
      </Field>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <User className="h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
        {success && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

// ── Bank Detail Form Dialog ───────────────────────────────────────────────────

interface BankFormState {
  bankId: string;
  ifscCode: string;
  accountNo: string;
  primary: boolean;
}

const EMPTY_BANK_FORM: BankFormState = { bankId: '', ifscCode: '', accountNo: '', primary: false };

interface BankDetailDialogProps {
  open: boolean;
  editing: BankDetailVM | null; // null = create
  banks: BankVM[];
  onClose: () => void;
  onSaved: () => void;
}

function BankDetailDialog({ open, editing, banks, onClose, onSaved }: BankDetailDialogProps) {
  const [form, setForm] = useState<BankFormState>(EMPTY_BANK_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          bankId: editing.bank.id,
          ifscCode: editing.ifscCode,
          accountNo: editing.accountNo,
          primary: editing.primary,
        });
      } else {
        setForm(EMPTY_BANK_FORM);
      }
      setFieldErrors({});
      setError(null);
    }
  }, [open, editing]);

  const setField = <K extends keyof BankFormState>(k: K, v: BankFormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const clearErr = (f: string) =>
    setFieldErrors((p) => {
      const n = { ...p };
      delete n[f];
      return n;
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.bankId) errs.bankId = 'Please select a bank.';
    if (!IFSC_REGEX.test(form.ifscCode.toUpperCase()))
      errs.ifscCode = 'Invalid IFSC code (e.g. ICIC0000733).';
    if (!ACCOUNT_NO_REGEX.test(form.accountNo))
      errs.accountNo = 'Account number must be 9–18 digits.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await bankDetailsApi.update(editing.id, {
          bankId: form.bankId !== editing.bank.id ? form.bankId : undefined,
          ifscCode: form.ifscCode.toUpperCase(),
          accountNo: form.accountNo,
          primary: form.primary,
        });
      } else {
        await bankDetailsApi.create({
          bankId: form.bankId,
          ifscCode: form.ifscCode.toUpperCase(),
          accountNo: form.accountNo,
          primary: form.primary,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors);
      else setError(parsed.general ?? 'Failed to save bank detail.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit bank account' : 'Add bank account'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bank select */}
          <div className="space-y-1.5">
            <Label className={fieldErrors.bankId ? 'text-destructive' : ''}>Bank</Label>
            <select
              value={form.bankId}
              onChange={(e) => {
                setField('bankId', e.target.value);
                clearErr('bankId');
              }}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
                fieldErrors.bankId ? 'border-destructive' : 'border-input'
              }`}
            >
              <option value="">Select a bank…</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {fieldErrors.bankId && <p className="text-xs text-destructive">{fieldErrors.bankId}</p>}
          </div>

          {/* IFSC */}
          <Field label="IFSC code" error={fieldErrors.ifscCode}>
            <Input
              value={form.ifscCode}
              onChange={(e) => {
                setField('ifscCode', e.target.value.toUpperCase());
                clearErr('ifscCode');
              }}
              placeholder="ICIC0000733"
              maxLength={11}
              className={
                fieldErrors.ifscCode ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
          </Field>

          {/* Account No */}
          <Field label="Account number" error={fieldErrors.accountNo}>
            <Input
              value={form.accountNo}
              onChange={(e) => {
                setField('accountNo', e.target.value);
                clearErr('accountNo');
              }}
              placeholder="9–18 digit account number"
              maxLength={18}
              className={
                fieldErrors.accountNo ? 'border-destructive focus-visible:ring-destructive' : ''
              }
            />
          </Field>

          {/* Primary toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none rounded-lg border border-border bg-muted/30 px-4 py-3">
            <input
              type="checkbox"
              checked={form.primary}
              onChange={(e) => setField('primary', e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Set as primary account</p>
              <p className="text-xs text-muted-foreground">Used as default for payouts</p>
            </div>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save account'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Bank Details Tab ──────────────────────────────────────────────────────────

function BankDetailsTab() {
  const [details, setDetails] = useState<BankDetailVM[]>([]);
  const [banks, setBanks] = useState<BankVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BankDetailVM | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, b] = await Promise.all([bankDetailsApi.getAll(), masterApi.getBanks()]);
      setDetails(d);
      setBanks(b);
    } catch {
      setError('Failed to load bank details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (d: BankDetailVM) => {
    setEditing(d);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await bankDetailsApi.delete(id);
      await load();
    } catch {
      setError('Failed to delete bank detail.');
    } finally {
      setDeleting(null);
    }
  };

  const handleSetPrimary = async (detail: BankDetailVM) => {
    if (detail.primary) return;
    setSettingPrimary(detail.id);
    try {
      await bankDetailsApi.update(detail.id, { primary: true });
      await load();
    } catch {
      setError('Failed to set primary account.');
    } finally {
      setSettingPrimary(null);
    }
  };

  // Auto-set primary when only one record and it's not primary
  useEffect(() => {
    if (details.length === 1 && !details[0].primary) {
      bankDetailsApi
        .update(details[0].id, { primary: true })
        .then(load)
        .catch(() => {});
    }
  }, [details, load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading bank details…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Bank accounts</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your linked bank accounts for payouts.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add account
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {details.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Building2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">No bank accounts linked yet.</p>
          <Button type="button" variant="outline" size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add your first account
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Bank</span>
            <span>Account No</span>
            <span>IFSC</span>
            <span className="text-right">Actions</span>
          </div>

          {details.map((d, idx) => (
            <div
              key={d.id}
              className={`flex flex-col sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 sm:gap-4 px-4 py-3.5 items-start sm:items-center transition-colors ${
                idx !== 0 ? 'border-t border-border' : ''
              } ${d.primary ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
            >
              {/* Bank name + primary badge */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{d.bank.name}</p>
                  {d.primary && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                      <Star className="h-2.5 w-2.5 fill-primary" />
                      Primary
                    </span>
                  )}
                </div>
              </div>

              {/* Account No */}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:hidden mb-0.5">Account No</p>
                <p className="text-sm font-mono text-foreground tracking-wide">
                  {'•'.repeat(Math.max(0, d.accountNo.length - 4))}
                  {d.accountNo.slice(-4)}
                </p>
              </div>

              {/* IFSC */}
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground sm:hidden mb-0.5">IFSC</p>
                <p className="text-sm font-mono text-foreground">{d.ifscCode}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 sm:justify-end">
                {!d.primary && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(d)}
                        disabled={settingPrimary === d.id}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        {settingPrimary === d.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Set as primary
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Edit
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      disabled={deleting === d.id}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      {deleting === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Delete
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      <BankDetailDialog
        open={dialogOpen}
        editing={editing}
        banks={banks}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, userInfo, setUserInfo } = useAuthStore();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [savingPic, setSavingPic] = useState(false);
  const [picError, setPicError] = useState<string | null>(null);

  if (!user?.authenticated) {
    router.replace('/login');
    return null;
  }

  const displayName = userInfo?.firstName
    ? `${userInfo.firstName}${userInfo.lastName ? ` ${userInfo.lastName}` : ''}`
    : user.username;

  const handleAvatarChange = async (dataUrl: string | undefined) => {
    setPicError(null);
    setSavingPic(true);
    try {
      await usersApi.updateSelf({ profilePicture: dataUrl ?? null });
      if (userInfo) setUserInfo({ ...userInfo, profilePicture: dataUrl ?? null });
    } catch {
      setPicError('Failed to update profile picture.');
    } finally {
      setSavingPic(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* ── Avatar + name header ── */}
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <AvatarUpload
              value={userInfo?.profilePicture}
              onChange={handleAvatarChange}
              fallbackText={displayName.charAt(0).toUpperCase()}
              label=""
            />
            {savingPic && (
              <div className="absolute inset-0 rounded-full bg-background/60 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold text-foreground truncate">{displayName}</h1>
            <p className="text-sm text-muted-foreground">{userInfo?.emailId ?? user.username}</p>
            {picError && <p className="text-xs text-destructive mt-1">{picError}</p>}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPwdOpen(true)}
            className="gap-2 shrink-0 hidden sm:flex"
          >
            <Lock className="h-3.5 w-3.5" />
            Change password
          </Button>
        </div>

        {/* Mobile change password button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPwdOpen(true)}
          className="gap-2 w-full sm:hidden"
        >
          <Lock className="h-3.5 w-3.5" />
          Change password
        </Button>

        {/* ── Tabs ── */}
        <Tabs defaultValue="profile">
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="banks" className="flex-1 gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <UpdateProfileTab userInfo={userInfo} setUserInfo={setUserInfo} />
          </TabsContent>

          <TabsContent value="banks">
            <BankDetailsTab />
          </TabsContent>
        </Tabs>
      </div>

      <ChangePasswordDialog open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
