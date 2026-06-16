import { PropertyDetailView } from "@/features/listings/components/property-detail-view";

/**
 * Thin server shell. The listing data is fetched on the client from
 * `GET /api/listings/:id` (visible network call, with a skeleton while loading)
 * inside `PropertyDetailView`.
 */
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PropertyDetailView listingId={id} />;
}
