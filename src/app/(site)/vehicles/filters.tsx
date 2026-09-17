import Link from "next/link";
import { config } from "@/lib/config";

/**
 * One-tap filters across the top of the inventory: body type first, then the
 * makes actually in the fleet. Each chip is a link, so it keeps working without
 * JavaScript and the resulting URL is shareable.
 */
export function FilterChips({
  makes,
  values,
}: {
  makes: string[];
  values: Record<string, string | undefined>;
}) {
  const carry = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...values, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return query ? `/vehicles?${query}` : "/vehicles";
  };

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-brand text-brand-ink"
        : "border border-line-strong bg-surface text-muted hover:border-brand hover:text-ink"
    }`;

  const categories = [
    ["", "All"],
    ["sedan", "Sedan"],
    ["suv", "SUV"],
    ["van", "Van"],
    ["luxury", "Luxury"],
    ["pickup", "Pickup"],
    ["bus", "Bus"],
  ] as const;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map(([value, text]) => (
          <Link
            key={value || "all"}
            href={carry({ category: value || undefined })}
            aria-current={(values.category ?? "") === value ? "true" : undefined}
            className={chip((values.category ?? "") === value)}
          >
            {text}
          </Link>
        ))}
      </div>

      {makes.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Link
            href={carry({ make: undefined })}
            className={chip(!values.make)}
            aria-current={!values.make ? "true" : undefined}
          >
            All makes
          </Link>
          {makes.map((make) => (
            <Link
              key={make}
              href={carry({ make })}
              aria-current={values.make === make ? "true" : undefined}
              className={chip(values.make === make)}
            >
              {make}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * A plain GET form: filtering works with JavaScript disabled and every result
 * set has a shareable URL.
 */
export function InventoryFilters({ values }: { values: Record<string, string | undefined> }) {
  return (
    <details className="card mb-8 p-4 [&[open]_summary_svg]:rotate-180">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold">
        More filters
        <svg
          className="h-4 w-4 text-muted transition-transform"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path d="M5.2 7.5 10 12.3l4.8-4.8 1.2 1.2-6 6-6-6 1.2-1.2Z" />
        </svg>
      </summary>

      <form method="get" action="/vehicles" className="mt-4">
        {/* Dates and quick chips live outside this form, so carry them through. */}
        {(["start", "end", "startHour", "endHour", "make"] as const).map((key) =>
          values[key] ? <input key={key} type="hidden" name={key} value={values[key]} /> : null,
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label" htmlFor="category">
            Type
          </label>
          <select id="category" name="category" className="input" defaultValue={values.category ?? ""}>
            <option value="">Any type</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="van">Van</option>
            <option value="luxury">Luxury</option>
            <option value="pickup">Pickup</option>
            <option value="bus">Bus</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="seats">
            Seats (minimum)
          </label>
          <input
            id="seats"
            name="seats"
            type="number"
            min={1}
            max={80}
            className="input"
            placeholder="Any"
            defaultValue={values.seats ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="transmission">
            Transmission
          </label>
          <select
            id="transmission"
            name="transmission"
            className="input"
            defaultValue={values.transmission ?? ""}
          >
            <option value="">Any</option>
            <option value="automatic">Automatic</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="maxPrice">
            Max per day ({config.currency})
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            min={0}
            step="1"
            className="input"
            placeholder="Any"
            defaultValue={values.maxPrice ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" className="input" defaultValue={values.sort ?? "price_asc"}>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="seats_desc">Most seats</option>
            <option value="newest">Newest</option>
          </select>
        </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn-primary w-full">
              Apply
            </button>
            <a href="/vehicles" className="btn-secondary">
              Reset
            </a>
          </div>
        </div>
      </form>
    </details>
  );
}
