import { ListingType } from "@/lib/enums";
import { ListingsSearchView } from "@/features/listings/components/listings-search-view";

export const metadata = { title: "Flatmates" };

export default async function FlatmatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ListingsSearchView
      listingType={ListingType.Pg}
      eyebrow="Flatmates"
      heading="Flatmates & flatshares"
      subtitle="Find a room or a flatmate that fits your lifestyle and budget."
      searchParams={searchParams}
    />
  );
}
