'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@repo/ui';
import { ATTRIBUTE_PROTOCOL, ATTR_PROTOCOL_MAP, ATTR_GROUPS } from './attribute-protocol';

interface AttributeEditorProps {
  attrKey: string;
  attrValue: string;
  onKeyChange: (newKey: string) => void;
  onValueChange: (newValue: string) => void;
  onRemove: () => void;
}

export function AttributeEditor({
  attrKey,
  attrValue,
  onKeyChange,
  onValueChange,
  onRemove,
}: AttributeEditorProps) {
  const def = attrKey ? ATTR_PROTOCOL_MAP[attrKey] : undefined;
  const isCustom = attrKey !== '' && !ATTR_PROTOCOL_MAP[attrKey];

  const selectCls =
    'h-7 flex-1 min-w-0 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="flex items-center gap-2">
      {/* Key — grouped dropdown with protocol keys + custom fallback */}
      <select value={attrKey} onChange={(e) => onKeyChange(e.target.value)} className={selectCls}>
        <option value="">Select key…</option>
        {ATTR_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {ATTRIBUTE_PROTOCOL.filter((d) => d.group === group).map((d) => (
              <option key={d.key} value={d.key}>
                {d.key}
              </option>
            ))}
          </optgroup>
        ))}
        {isCustom && <option value={attrKey}>{attrKey} (custom)</option>}
      </select>

      <span className="text-muted-foreground text-xs shrink-0">→</span>

      {/* Value — context-aware based on protocol definition */}
      {!def || def.valueType === 'text' ? (
        <Input
          value={attrValue}
          placeholder={def?.description ?? 'value'}
          onChange={(e) => onValueChange(e.target.value)}
          className="h-7 text-xs flex-1 min-w-0"
        />
      ) : def.valueType === 'number' ? (
        <Input
          type="number"
          value={attrValue}
          placeholder="0"
          onChange={(e) => onValueChange(e.target.value)}
          className="h-7 text-xs flex-1 min-w-0"
        />
      ) : def.valueType === 'select' ? (
        <select
          value={attrValue}
          onChange={(e) => onValueChange(e.target.value)}
          className={selectCls}
        >
          <option value="">Select…</option>
          {def.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        /* tags — comma-separated free text */
        <Input
          value={attrValue}
          placeholder="val1,val2,val3"
          onChange={(e) => onValueChange(e.target.value)}
          className="h-7 text-xs flex-1 min-w-0"
          title={def.description}
        />
      )}

      {/* Info hint for known keys */}
      {def && (
        <span
          title={def.description}
          className="text-muted-foreground/50 text-xs shrink-0 cursor-help select-none"
        >
          ⓘ
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
