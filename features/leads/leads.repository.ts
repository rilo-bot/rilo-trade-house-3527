import { Collection, ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { LeadKind, LeadStatus } from "@/lib/enums";

/**
 * Data access for leads (enquiries). Each lead stores a small listing snapshot
 * (title/locality/city) so the inbox renders without a join.
 */
export interface LeadDoc {
  _id: ObjectId;
  listingId: ObjectId;
  ownerId: ObjectId;
  seekerId: ObjectId | null;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  kind: LeadKind;
  // For viewing requests: the seeker's preferred time (ISO date-time string).
  preferredTime?: string;
  listingTitle: string;
  listingLocality: string;
  listingCity: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type Lead = Omit<
  LeadDoc,
  "_id" | "listingId" | "ownerId" | "seekerId" | "createdAt" | "updatedAt"
> & {
  id: string;
  listingId: string;
  ownerId: string;
  seekerId: string | null;
  createdAt: string;
  updatedAt: string;
};

async function collection(): Promise<Collection<LeadDoc>> {
  const db = await getDb();
  return db.collection<LeadDoc>("leads");
}

export function toLead(doc: LeadDoc): Lead {
  const { _id, listingId, ownerId, seekerId, createdAt, updatedAt, ...rest } =
    doc;
  return {
    ...rest,
    id: _id.toString(),
    listingId: listingId.toString(),
    ownerId: ownerId.toString(),
    seekerId: seekerId ? seekerId.toString() : null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

export interface NewLead {
  listingId: string;
  ownerId: string;
  seekerId: string | null;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  kind: LeadKind;
  preferredTime?: string;
  listingTitle: string;
  listingLocality: string;
  listingCity: string;
}

export async function insertLead(input: NewLead): Promise<Lead> {
  const col = await collection();
  const now = new Date();
  const doc: LeadDoc = {
    _id: new ObjectId(),
    listingId: new ObjectId(input.listingId),
    ownerId: new ObjectId(input.ownerId),
    seekerId: input.seekerId ? new ObjectId(input.seekerId) : null,
    name: input.name,
    phone: input.phone,
    email: input.email,
    message: input.message,
    kind: input.kind,
    preferredTime: input.preferredTime,
    listingTitle: input.listingTitle,
    listingLocality: input.listingLocality,
    listingCity: input.listingCity,
    status: LeadStatus.New,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return toLead(doc);
}

export async function findLeadById(id: string): Promise<Lead | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? toLead(doc) : null;
}

export async function findLeadsByOwner(ownerId: string): Promise<Lead[]> {
  const col = await collection();
  const docs = await col
    .find({ ownerId: new ObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toLead);
}

export async function findLeadsBySeeker(seekerId: string): Promise<Lead[]> {
  const col = await collection();
  const docs = await col
    .find({ seekerId: new ObjectId(seekerId) })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toLead);
}

/** Total number of leads platform-wide (admin overview). */
export async function countAllLeads(): Promise<number> {
  const col = await collection();
  return col.countDocuments({});
}

/** Map of listingId → lead count, for the given listing ids. */
export async function countLeadsByListings(
  listingIds: string[],
): Promise<Record<string, number>> {
  if (listingIds.length === 0) return {};
  const col = await collection();
  const objIds = listingIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const rows = await col
    .aggregate<{ _id: ObjectId; count: number }>([
      { $match: { listingId: { $in: objIds } } },
      { $group: { _id: "$listingId", count: { $sum: 1 } } },
    ])
    .toArray();
  const result: Record<string, number> = {};
  for (const r of rows) result[r._id.toString()] = r.count;
  return result;
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<Lead | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const doc = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? toLead(doc) : null;
}

/** Owner contact details for lead-notification emails. */
export async function getOwnerContact(
  ownerId: string,
): Promise<{ email: string; name: string } | null> {
  if (!ObjectId.isValid(ownerId)) return null;
  const db = await getDb();
  const user = await db
    .collection("user")
    .findOne(
      { _id: new ObjectId(ownerId) },
      { projection: { email: 1, name: 1 } },
    );
  if (!user?.email) return null;
  return { email: user.email as string, name: (user.name as string) ?? "" };
}
