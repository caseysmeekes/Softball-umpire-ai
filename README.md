# Softball Umpire Allocation Tool

Rules-first tournament scheduling for softball umpires.

## MVP

- Tournament dashboard with chronological game schedule
- Umpire workload view
- Automatic allocation engine
- Maximum 3 games per day
- Back-to-back rule: Base → Plate
- Mandatory game off after Plate
- Live validation and manual overrides
- Unallocated game/position reporting
- Print / export via browser print
- Responsive desktop, tablet and mobile UI

## Allocation priority

**Valid allocation → Fair allocation → Balanced workload**

The rules are isolated in `lib/rules.ts` so additional tournament rules can be added without rewriting the dashboard.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel

This is a standard Next.js application and includes `vercel.json` for Vercel framework detection. Connect the `caseysmeekes/Softball-umpire-ai` GitHub repository to a Vercel project to enable automatic deployments from `main`.
