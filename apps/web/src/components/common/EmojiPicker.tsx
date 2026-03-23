'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@repo/ui';
import { Search } from 'lucide-react';

// Curated emoji set grouped by category — relevant for an auction app
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Popular',
    emojis: [
      '⭐',
      '🔥',
      '💎',
      '🏆',
      '🎯',
      '✨',
      '💫',
      '🎁',
      '🛒',
      '💰',
      '💵',
      '🏷️',
      '📦',
      '🚀',
      '❤️',
      '👑',
    ],
  },
  {
    label: 'Electronics',
    emojis: [
      '💻',
      '🖥️',
      '📱',
      '⌨️',
      '🖱️',
      '🖨️',
      '📷',
      '📸',
      '🎥',
      '📹',
      '📺',
      '📻',
      '🎮',
      '🕹️',
      '🔋',
      '💡',
      '🔌',
      '📡',
      '🎧',
      '🎤',
      '📠',
      '⌚',
      '📟',
    ],
  },
  {
    label: 'Vehicles',
    emojis: [
      '🚗',
      '🚕',
      '🚙',
      '🚌',
      '🚎',
      '🏎️',
      '🚓',
      '🚑',
      '🚒',
      '🚐',
      '🛻',
      '🚚',
      '🚛',
      '🚜',
      '🏍️',
      '🛵',
      '🚲',
      '🛴',
      '✈️',
      '🚢',
      '🚁',
      '🛥️',
      '⛵',
      '🚤',
      '🛳️',
    ],
  },
  {
    label: 'Fashion',
    emojis: [
      '👗',
      '👔',
      '👕',
      '👖',
      '🧥',
      '🥼',
      '👘',
      '👙',
      '🩱',
      '🩲',
      '🩳',
      '👚',
      '👛',
      '👜',
      '👝',
      '🎒',
      '🧳',
      '👒',
      '🎩',
      '🧢',
      '👟',
      '👠',
      '👡',
      '👢',
      '🥿',
      '👞',
      '💍',
      '💎',
      '👓',
      '🕶️',
      '🧣',
      '🧤',
      '🧦',
    ],
  },
  {
    label: 'Home & Furniture',
    emojis: [
      '🏠',
      '🏡',
      '🛋️',
      '🪑',
      '🛏️',
      '🚿',
      '🛁',
      '🪴',
      '🖼️',
      '🪞',
      '🚪',
      '🪟',
      '💐',
      '🕯️',
      '🪔',
      '🧹',
      '🧺',
      '🧻',
      '🪣',
      '🧴',
      '🧷',
      '🔑',
      '🪝',
    ],
  },
  {
    label: 'Sports',
    emojis: [
      '⚽',
      '🏀',
      '🏈',
      '⚾',
      '🥎',
      '🎾',
      '🏐',
      '🏉',
      '🥏',
      '🎱',
      '🏓',
      '🏸',
      '🥊',
      '🥋',
      '🎽',
      '🛹',
      '🛷',
      '⛸️',
      '🏋️',
      '🤸',
      '⛷️',
      '🏊',
      '🚴',
      '🏇',
      '🎿',
      '🏹',
      '🎣',
      '🤿',
    ],
  },
  {
    label: 'Art & Collectibles',
    emojis: [
      '🎨',
      '🖌️',
      '🖼️',
      '🗿',
      '🏺',
      '🎭',
      '🎪',
      '🎬',
      '🎤',
      '🎵',
      '🎶',
      '🎸',
      '🎹',
      '🥁',
      '🎺',
      '🎻',
      '🪕',
      '📚',
      '📖',
      '📜',
      '🗺️',
      '🧩',
      '🪆',
      '🎠',
    ],
  },
  {
    label: 'Food & Kitchen',
    emojis: [
      '🍎',
      '🍊',
      '🍋',
      '🍇',
      '🍓',
      '🫐',
      '🍒',
      '🥑',
      '🥦',
      '🌽',
      '🍕',
      '🍔',
      '🍜',
      '🍣',
      '🍰',
      '☕',
      '🍵',
      '🥂',
      '🍷',
      '🍺',
      '🫖',
      '🍳',
      '🥘',
      '🫕',
      '🔪',
      '🥄',
      '🍽️',
    ],
  },
  {
    label: 'Tools & Industrial',
    emojis: [
      '🔧',
      '🔨',
      '⚒️',
      '🛠️',
      '⛏️',
      '🪛',
      '🔩',
      '🪤',
      '🧲',
      '🔭',
      '🔬',
      '⚗️',
      '🧪',
      '💊',
      '🩺',
      '🩻',
      '🪜',
      '🧰',
      '🪚',
      '🔦',
      '🕯️',
    ],
  },
  {
    label: 'Animals',
    emojis: [
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🐯',
      '🦁',
      '🐮',
      '🐷',
      '🐸',
      '🐵',
      '🐔',
      '🐧',
      '🐦',
      '🦆',
      '🦅',
      '🦉',
      '🦋',
      '🐝',
      '🐠',
      '🐬',
      '🐳',
    ],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

export default function EmojiPicker({
  value,
  onChange,
  placeholder = 'Pick an icon',
}: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState(EMOJI_GROUPS[0]?.label ?? '');

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return EMOJI_GROUPS;
    const all = EMOJI_GROUPS.flatMap((g) => g.emojis);
    return [{ label: 'Results', emojis: all }];
  }, [search]);

  const displayGroups = search.trim() ? filteredGroups : EMOJI_GROUPS;
  const currentGroup = displayGroups.find((g) => g.label === activeGroup) ??
    displayGroups[0] ?? { label: '', emojis: [] as string[] };

  return (
    <div className="space-y-2">
      {/* Selected preview + clear */}
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-lg border border-border bg-muted/30 flex items-center justify-center text-xl flex-shrink-0">
          {value ? <span>{value}</span> : <span className="text-muted-foreground text-xs">?</span>}
        </div>
        <div className="flex-1 text-sm text-muted-foreground">
          {value ? (
            <span>
              Selected: <span className="text-foreground font-medium">{value}</span>
              <button
                type="button"
                onClick={() => onChange('')}
                className="ml-2 text-xs text-destructive hover:underline"
              >
                clear
              </button>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveGroup(EMOJI_GROUPS[0]?.label ?? '');
          }}
          placeholder="Search emojis..."
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Group tabs */}
      {!search.trim() && (
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
          {EMOJI_GROUPS.map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => setActiveGroup(g.label)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeGroup === g.label
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="h-36 overflow-y-auto rounded-lg border border-border bg-muted/10 p-2">
        <div className="grid grid-cols-8 gap-0.5 min-w-0">
          {currentGroup.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`h-9 w-full rounded-md text-xl flex items-center justify-center transition-colors hover:bg-muted ${
                value === emoji ? 'bg-primary/20 ring-1 ring-primary' : ''
              }`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
