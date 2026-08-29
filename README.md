# Softball Umpire Allocation Tool

Rules-first tournament scheduling for softball umpire crews.

## MVP features

- Dashboard with game schedule and umpire workload
- Build games manually
- Import a CSV schedule
- Export the final allocation to CSV
- Four-umpire roster included by default
- Add, edit and remove umpires
- 2, 3 or 4 umpire game crews
- Automatic allocation engine
- Live validation and manual override warnings
- Browser local storage for initial tournament persistence

## Allocation rules

1. Maximum 3 games per umpire per day.
2. A back-to-back assignment must move Base → Plate.
3. An umpire working Plate must have the next scheduled game off.

The engine prioritises valid allocation first, then balanced workload and Plate distribution.

## Vercel

Connect `caseysmeekes/Softball-umpire-ai` to Vercel for automatic deployments from `main`.
