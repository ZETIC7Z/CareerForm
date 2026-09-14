'use client';

import React from 'react';
import { GROUPS } from '@/lib/groups';

interface PdsPageNavigationProps {
  groupIndex: number;
  stepIndex: number;
  onJump: (group: number, step?: number) => void;
  finished?: boolean;
}

const STEP_WIDTHS: Record<string, number> = {
  // Page 1
  personal: 142,
  family: 136,
  education: 88,
  skills: 72,
  // Page 2
  eligibility: 114,
  work: 130,
  // Page 3
  voluntary: 118,
  training: 116,
  // Page 4
  declarations: 108,
  signing: 116,
};

function getPuzzlePath(type: 'start' | 'middle' | 'end', width: number): string {
  const H = 32;
  const arrow = 10;
  const R = 16;
  if (type === 'start') {
    // Left curve (radius 16), right chevron arrow (depth 10)
    return `M ${R} 0 L ${width - arrow} 0 L ${width} ${H / 2} L ${width - arrow} ${H} L ${R} ${H} A ${R} ${R} 0 0 1 ${R} 0 Z`;
  }
  if (type === 'middle') {
    // Left chevron notch (depth 10), right chevron arrow (depth 10)
    return `M 0 0 L ${width - arrow} 0 L ${width} ${H / 2} L ${width - arrow} ${H} L 0 ${H} L ${arrow} ${H / 2} Z`;
  }
  // 'end': Left chevron notch (depth 10), right curve (radius 16, same curve as C1!)
  return `M 0 0 L ${width - R} 0 A ${R} ${R} 0 0 1 ${width - R} ${H} L 0 ${H} L ${arrow} ${H / 2} Z`;
}

export default function PdsPageNavigation({
  groupIndex,
  stepIndex,
  onJump,
  finished = false,
}: PdsPageNavigationProps) {
  const activeStepRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [groupIndex, stepIndex]);

  return (
    <nav className="pds-top-nav-bar" role="tablist" aria-label="PDS Pages C1-C4">
      <div className="pds-nav-sequence">
        {GROUPS.map((group, gIdx) => {
          const isActiveGroup = gIdx === groupIndex && !finished;

          if (isActiveGroup) {
            const pageBtnWidth = 48;
            const startPath = getPuzzlePath('start', pageBtnWidth);

            return (
              <div key={group.id} className="pds-nav-ribbon" role="presentation">
                {/* Active Page Pill (Curve Left, Arrow Right matching puzzle) */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={true}
                  className="pds-puzzle-step pds-puzzle-page-btn"
                  style={{
                    width: `${pageBtnWidth}px`,
                    height: '32px',
                    marginLeft: 0,
                    zIndex: 25,
                  }}
                  onClick={() => onJump(gIdx, 0)}
                  title={`PDS C${gIdx + 1}: ${group.label}`}
                >
                  <svg
                    width={pageBtnWidth}
                    height={32}
                    viewBox={`0 0 ${pageBtnWidth} 32`}
                    className="pds-puzzle-svg"
                    aria-hidden="true"
                  >
                    <path d={startPath} className="pds-puzzle-path" />
                  </svg>
                  <span className="pds-puzzle-text">C{gIdx + 1}</span>
                </button>

                {/* Sub-steps Chain Interlocking Seamlessly Like a Puzzle */}
                <div
                  className="pds-ribbon-steps"
                  role="tablist"
                  aria-label={`PDS C${gIdx + 1} sections`}
                >
                  {group.steps.map((st, sIdx) => {
                    const isStepActive = stepIndex === sIdx;
                    const isLast = sIdx === group.steps.length - 1;
                    const type: 'middle' | 'end' = isLast ? 'end' : 'middle';
                    const width = STEP_WIDTHS[st.id] || Math.max(76, st.short.length * 7 + 28);
                    const pathD = getPuzzlePath(type, width);
                    const zIndex = isStepActive ? 22 : 18 - sIdx;

                    return (
                      <button
                        key={st.id}
                        ref={isStepActive ? activeStepRef : null}
                        type="button"
                        role="tab"
                        aria-selected={isStepActive}
                        className={`pds-puzzle-step ${isStepActive ? 'active' : ''}`}
                        style={{
                          width: `${width}px`,
                          height: '32px',
                          marginLeft: '-9px',
                          zIndex,
                        }}
                        onClick={() => onJump(gIdx, sIdx)}
                        title={st.label}
                      >
                        <svg
                          width={width}
                          height={32}
                          viewBox={`0 0 ${width} 32`}
                          className="pds-puzzle-svg"
                          aria-hidden="true"
                        >
                          <path d={pathD} className="pds-puzzle-path" />
                        </svg>
                        <span className="pds-puzzle-text">{st.short}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Compact Inactive Page Box (smaller 30px x 26px with matching sans font)
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={false}
              className="pds-page-box"
              onClick={() => onJump(gIdx, 0)}
              title={`Switch to PDS C${gIdx + 1}: ${group.label}`}
            >
              <span className="pds-box-text">C{gIdx + 1}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
