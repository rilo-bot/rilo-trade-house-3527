import { ListingType } from "@/lib/enums";
import { ListingsSearchView } from "@/features/listings/components/listings-search-view";

export const metadata = { title: "Rent" };

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ListingsSearchView
      listingType={ListingType.Rent}
      eyebrow="Rent"
      heading="Properties for rent"
      subtitle="Find your next rental — apartments, houses, and townhouses available across New Zealand."
      searchParams={searchParams}
    />
  );
}
