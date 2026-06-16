import { ListingsSearchView } from "@/features/listings/components/listings-search-view";

export const metadata = { title: "Properties" };

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ListingsSearchView
      eyebrow="Explore"
      heading="Find your next home"
      subtitle="Search every verified listing across New Zealand — to buy, rent, or share."
      searchParams={searchParams}
    />
  );
}
