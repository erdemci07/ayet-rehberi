import published from "./published.json";
import type { EsmaEntry } from "@/types/discovery";

// Only the reviewed publication set crosses the production boundary.
export const publishedEsma = (published as EsmaEntry[])
  .filter(
    entry =>
      entry.reviewStatus === "sourceChecked" &&
      Array.isArray(entry.sources) &&
      entry.sources.length > 0 &&
      Boolean(entry.name) &&
      Boolean(entry.shortMeaning),
  )
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
