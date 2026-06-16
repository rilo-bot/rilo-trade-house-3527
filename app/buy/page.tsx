import { ListingType } from "@/lib/enums";
import { ListingsSearchView } from "@/features/listings/components/listings-search-view";

export const metadata = { title: "Buy" };

export default async function BuyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ListingsSearchView
      listingType={ListingType.Sale}
      eyebrow="Buy"
      heading="Properties for sale"
      subtitle="Browse verified homes for sale across New Zealand — filter by location, price, and features."
      searchParams={searchParams}
    />
  );
}
