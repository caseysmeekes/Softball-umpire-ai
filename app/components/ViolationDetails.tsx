'use client'

import { useState } from 'react'
import { Violation } from '../../lib/types'

type Props = { umpireName: string; violations: Violation[] }

export default function ViolationDetails({ umpireName, violations }: Props) {
  const [open, setOpen] = useState(false)
  const hard = violations.some(v => v.severity === 'hard')
  if (!violations.length) return <span className="good">Valid</span>

  return <>
    <button className={hard ? 'violationButton hard' : 'violationButton soft'} onClick={() => setOpen(true)}>
      {hard ? '🔴 Rule violation' : '🟠 Soft warning'}
    </button>
    {open && <div className="violationOverlay" role="dialog" aria-modal="true" aria-label={`${umpireName} allocation warnings`} onClick={() => setOpen(false)}>
      <div className="violationModal" onClick={e => e.stopPropagation()}>
        <div className="violationModalHead">
          <div><div className="violationEyebrow">ALLOCATION CHECK</div><h3>{umpireName}</h3></div>
          <button className="closeViolation" onClick={() => setOpen(false)} aria-label="Close">×</button>
        </div>
        <div className="violationList">
          {violations.map((v, i) => <div key={`${v.rule}-${v.gameId || ''}-${i}`} className={`violationItem ${v.severity}`}>
            <div className="violationTitle">{v.severity === 'hard' ? 'Rule violation' : 'Soft warning'}</div>
            <div>{v.message}</div>
          </div>)}
        </div>
        <p className="violationHint">Review the allocation before committing. Hard violations break an enabled rule. Soft warnings are preferences the allocator tries to minimise.</p>
        <button className="violationDone" onClick={() => setOpen(false)}>Close</button>
      </div>
    </div>}
    <style jsx>{`
      .violationButton{border:0;background:transparent;padding:4px 6px;border-radius:5px;cursor:pointer;font:inherit;font-size:12px;font-weight:600}.violationButton:hover{text-decoration:underline}.violationButton.hard{color:#bd3e35}.violationButton.soft{color:#a56a15}.good{color:#23804b}.violationOverlay{position:fixed;inset:0;background:rgba(20,35,42,.38);display:grid;place-items:center;padding:20px;z-index:1000}.violationModal{width:min(520px,100%);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.22);padding:20px}.violationModalHead{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #e4eaed;padding-bottom:14px}.violationEyebrow{font-size:9px;letter-spacing:1.5px;color:#72848c;font-weight:700}.violationModal h3{margin:4px 0 0;font-size:21px}.closeViolation{border:0;background:#f1f4f5;border-radius:50%;width:30px;height:30px;font-size:22px;line-height:1;cursor:pointer;color:#536771}.violationList{display:grid;gap:10px;margin:16px 0}.violationItem{padding:12px;border-radius:7px;font-size:13px;line-height:1.45;border-left:4px solid}.violationItem.hard{background:#fff1ef;border-left-color:#bd3e35}.violationItem.soft{background:#fff8e8;border-left-color:#a56a15}.violationTitle{font-weight:700;margin-bottom:3px}.violationHint{font-size:11px;color:#6c7c83;line-height:1.5}.violationDone{width:100%;margin-top:5px;border:0;border-radius:7px;padding:10px;background:#17333f;color:#fff;font-weight:600;cursor:pointer}
    `}</style>
  </>
}
