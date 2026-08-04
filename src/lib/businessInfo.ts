// Single source of truth for NAP (Name/Address/Phone) data — used by both
// the visible Contact page and the LocalBusiness structured data in
// Layout.astro, so the two can never drift out of sync with each other.
export const BUSINESS = {
  name: "Orchid Insanity",
  streetAddress: "800 Vanesa Lane, Ste E",
  addressLocality: "Wylie",
  addressRegion: "TX",
  postalCode: "75098",
  addressCountry: "US",
  // PLACEHOLDER — replace with a real number before going live.
  phoneDisplay: "(972) 555-0100",
  phoneE164: "+19725550100",
  email: "orchidinsanity@gmail.com",
};
