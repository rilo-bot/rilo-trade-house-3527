# Demo data seeder

Populates the app with realistic — but **entirely fictional** — New Zealand
property listings so `/buy`, `/rent`, `/flatmates`, the home page, search,
filters and insights all have real-looking data to work with.

Nothing here is scraped. The dataset was authored to look like genuine NZ market
data (real suburbs/regions/4-digit postcodes, weekly rents, NZ sale methods like
auction/tender/deadline) while containing no real addresses, people, phone
numbers or copyrighted text or photos.

## Run it

```bash
npm run seed        # replace any previous seed data, then insert ~84 listings
npm run seed:keep   # append without clearing previously-seeded data
npm run seed:dry    # build + validate the full mapping, write nothing (no DB needed)
```

Requires `MONGODB_URI` and `MONGODB_DB_NAME` (read from `.env.local`), and a
running MongoDB. The seeder uses only the installed `mongodb` driver + Node
built-ins — no extra dependencies.

## What it does

1. Reads the generated dataset in [`seed-data/nz-listings.json`](seed-data/nz-listings.json).
2. Creates demo **owner/agent accounts** in the `user` collection (so every
   listing has a valid `ownerId` and the contact/owner UI works).
3. Maps each record into the exact `ListingDoc` shape from
   [`features/listings/listings.repository.ts`](../features/listings/listings.repository.ts):
   price (sale total vs. weekly rent), config (beds/baths/parking), location
   (suburb → district/region/postcode/geo), Unsplash photos, open homes,
   `pgDetails` for flatmates, NZ rateable value + title type for sales.
4. Inserts most as `status: "active"` so they appear in public search.

## Owner-dashboard portfolios

A slice of the dataset is attached to the real owner accounts listed in
`PORTFOLIO_OWNERS` (in `seed-listings.mjs`) with a realistic spread of lifecycle
states — `active`, `pending_review`, `draft`, `rented_sold`, `expired` — so the
**"Your properties"** manager and its status filters have real history to show,
not just active listings. Log in as one of those accounts to see it. These
listings are also tagged `seedSource: "nz-seed"`, so re-seeding replaces them
cleanly. Edit `PORTFOLIO_OWNERS` to target different accounts.

## Seller spotlight listings (featured)

A separate, additive seeder adds genuine listings for specific real seller
accounts and puts them in the home **Featured** row:

```bash
node scripts/seed-seller-listings.mjs            # replace this batch, then insert
node scripts/seed-seller-listings.mjs --dry-run  # validate offline (image-uniqueness check)
```

It reads [`seed-data/seller-listings.json`](seed-data/seller-listings.json) (each
record names its owner `account` email), gives every listing a **unique** photo
set (no image repeats across the batch; covers are all distinct "fresh" photos),
and dates them just now so they're the newest active listings — which is exactly
what the home Featured section shows (`/api/listings?limit=6`, newest first).
It's tagged `seedSource: "nz-seed-sellers"`, completely separate from the main
`nz-seed` dataset, so the two never clear each other.

## Safe to re-run

Everything written is tagged `seedSource: "nz-seed"`. The default `npm run seed`
deletes only those tagged docs before re-inserting — it **never** touches real
users or listings you create through the app.

## Regenerating / extending the dataset

`seed-data/nz-listings.json` is a plain JSON array — edit it by hand to add,
remove or tweak listings, then re-run `npm run seed`. Each record only needs a
`suburb` from the canonical table in `seed-listings.mjs`; the seeder fills in the
district, postcode and geo automatically.
