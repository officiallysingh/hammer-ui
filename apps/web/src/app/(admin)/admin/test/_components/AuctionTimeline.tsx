// components/AuctionTimeline.tsx
'use client';

import { CheckCircle2, Users, TrendingUp, Trophy, AlertCircle } from 'lucide-react';

const timeline = [
  {
    id: '1',
    action: 'Register & Wait',
    datetime: '27 Aug 2026, 10:00 AM',
    subText: '24 hours before start',
    phaseLabel: 'Pre-start',
    type: 'prestart' as const,
    name: 'Minimum Participants Check',
    description: 'System checks if enough people have joined',
    details: [
      'At least 5 participants are required',
      'Validation window: 24 hours before start (PT24H)',
      'If less than 5 people → Auction will be cancelled',
    ],
    userTip: 'Make sure you and others register early',
    durationToNext: '24 hours',
  },
  {
    id: '2',
    action: 'Place Your Offers',
    datetime: '28 Aug 2026, 10:00 AM',
    subText: 'Auction starts',
    phaseLabel: 'During Auction',
    type: 'auction' as const,
    name: 'Auction is Running',
    description: 'You can place offers during this period',
    children: [
      {
        id: '2.1',
        time: '10:00 AM – 11:00 AM',
        name: 'Price Steps (First Hour)',
        description: 'How much you can increase your offer',
        details: ['Offers must increase in steps of ₹100', 'Valid only during the first 1 hour'],
      },
      {
        id: '2.2',
        time: 'After 11:00 AM',
        name: 'Price Steps (Later)',
        description: 'How much you can increase your offer',
        details: ['Offers must increase in steps of ₹200', 'Applies for the rest of the auction'],
      },
      {
        id: '2.3',
        time: 'Near End Time',
        name: 'Extra Time Protection',
        description: 'Auction can get extended',
        details: ['If someone offers near the end → +10 minutes', 'Can extend unlimited times'],
      },
    ],
    userTip: 'Watch the clock and increase carefully',
    durationToNext: '≈ 2 hours',
  },
  {
    id: '3',
    action: 'See the Result',
    datetime: '28 Aug 2026, 12:00 PM',
    subText: 'Auction ends (approx)',
    phaseLabel: 'Clearing',
    type: 'clearing' as const,
    name: 'Winner is Decided',
    description: 'System selects the winner and final price',
    children: [
      {
        id: '3.1',
        time: 'Immediately after end',
        name: 'Who Wins?',
        description: 'Highest offer becomes the winner',
        details: ['The person with the highest bid wins'],
      },
      {
        id: '3.2',
        time: 'Immediately after end',
        name: 'What do you pay?',
        description: 'Winner pays their own bid amount',
        details: ['You pay exactly what you offered (1st price)'],
      },
    ],
    userTip: 'Highest bid wins and pays their own price',
    durationToNext: null,
  },
];

const phaseConfig = {
  prestart: {
    color: 'border-amber-500 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    icon: <Users className="w-5 h-5 text-amber-600" />,
  },
  auction: {
    color: 'border-blue-500 bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    icon: <TrendingUp className="w-5 h-5 text-blue-600" />,
  },
  clearing: {
    color: 'border-emerald-500 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: <Trophy className="w-5 h-5 text-emerald-600" />,
  },
};

export default function AuctionTimeline() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Auction Timeline</h2>
        <p className="text-gray-500 mt-1">Exact schedule with date, time & duration</p>
      </div>

      <div className="relative">
        {/* Main vertical line - centered on icons */}
        <div className="absolute left-[198px] top-0 bottom-0 w-0.5 bg-gray-300" />

        <div className="space-y-0">
          {timeline.map((item, index) => {
            const config = phaseConfig[item.type];
            const isLast = index === timeline.length - 1;

            return (
              <div key={item.id}>
                {/* ===== NODE ===== */}
                <div className="flex items-start gap-6 relative z-10">
                  {/* LEFT - Date & Time */}
                  <div className="w-[150px] text-right pt-3 shrink-0">
                    <div className="text-sm font-bold text-gray-900 leading-tight">
                      {item.datetime}
                    </div>
                    <div className="text-xs font-medium text-blue-600 mt-1">{item.subText}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.action}</div>
                  </div>

                  {/* CENTER - Icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white shadow-sm ${config.color} shrink-0`}
                  >
                    {config.icon}
                  </div>

                  {/* RIGHT - Content */}
                  <div className="flex-1 pb-2">
                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${config.badge}`}
                        >
                          {item.phaseLabel}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>

                      {item.children ? (
                        <div className="mt-6 space-y-5">
                          {item.children.map((child) => (
                            <div key={child.id} className="flex gap-4">
                              <div className="w-28 text-right shrink-0 pt-1">
                                <div className="text-xs font-semibold text-blue-600 leading-tight">
                                  {child.time}
                                </div>
                              </div>

                              <div className="relative flex-1">
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
                                <div className="absolute -left-[5px] top-2 w-3 h-3 rounded-full bg-white border-2 border-blue-400" />

                                <div className="pl-5">
                                  <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-medium text-gray-900">{child.name}</h4>
                                    <p className="text-sm text-gray-500 mb-2">
                                      {child.description}
                                    </p>
                                    <ul className="space-y-1.5">
                                      {child.details.map((detail, i) => (
                                        <li
                                          key={i}
                                          className="flex items-start gap-2 text-sm text-gray-700"
                                        >
                                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                          <span>{detail}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="mt-4 space-y-2">
                          {item.details?.map((detail, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-4 flex items-start gap-2 text-sm bg-blue-50 text-blue-800 rounded-lg px-3 py-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{item.userTip}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== DURATION (perfectly centered between nodes) ===== */}
                {!isLast && item.durationToNext && (
                  <div className="flex items-center gap-6 my-6">
                    {/* empty left column to keep alignment */}
                    <div className="w-[150px] shrink-0" />

                    {/* duration pill centered on the line */}
                    <div className="w-12 flex justify-center shrink-0 relative z-20">
                      <div className="bg-white border border-gray-300 text-gray-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                        {item.durationToNext}
                      </div>
                    </div>

                    {/* empty right side */}
                    <div className="flex-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
