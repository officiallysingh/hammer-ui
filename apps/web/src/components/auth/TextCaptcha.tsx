'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { Input, Label } from '@repo/ui';

// ─── Question pool ────────────────────────────────────────────────────────────
const CAPTCHA_POOL = [
  { q: 'What is 3 + 4?', a: '7' },
  { q: 'What is 8 - 2?', a: '6' },
  { q: 'What is 5 × 3?', a: '15' },
  { q: 'What is 12 ÷ 4?', a: '3' },
  { q: 'What is 9 + 6?', a: '15' },
  { q: 'What is 7 × 2?', a: '14' },
  { q: 'What is 20 - 8?', a: '12' },
  { q: 'What is 4 + 9?', a: '13' },
  { q: 'Spell the color of the sky (4 letters)', a: 'blue' },
  { q: 'How many days in a week?', a: '7' },
  { q: 'How many months in a year?', a: '12' },
  { q: 'What is 6 × 6?', a: '36' },
  { q: 'What is 100 - 37?', a: '63' },
  { q: 'What is 15 + 8?', a: '23' },
];

function randomCaptcha() {
  return CAPTCHA_POOL[Math.floor(Math.random() * CAPTCHA_POOL.length)]!;
}

// ─── Public API exposed via ref ───────────────────────────────────────────────
export interface TextCaptchaHandle {
  /** Returns true if the current answer is correct, sets error state if not */
  validate: () => boolean;
  /** Reset the answer input and pick a new question */
  reset: () => void;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TextCaptchaProps {
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const TextCaptcha = forwardRef<TextCaptchaHandle, TextCaptchaProps>(function TextCaptcha(
  { className },
  ref,
) {
  const [captcha, setCaptcha] = useState<{ q: string; a: string } | null>(() =>
    typeof window !== 'undefined' ? randomCaptcha() : null,
  );
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setCaptcha(randomCaptcha());
    setValue('');
    setError(null);
  };

  useImperativeHandle(ref, () => ({
    validate() {
      if (!captcha) return false;
      if (value.trim().toLowerCase() === captcha.a.toLowerCase()) {
        setError(null);
        return true;
      }
      setError('Incorrect answer. Please try again.');
      return false;
    },
    reset() {
      refresh();
    },
  }));

  if (!captcha) return null;

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className={error ? 'text-destructive' : ''}>
        Security check <span className="text-destructive">*</span>
      </Label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground flex-1 select-none font-mono tracking-wide">
          {captcha.q}
        </span>
        <button
          type="button"
          onClick={refresh}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="New question"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        placeholder="Your answer"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
        autoComplete="off"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
});
