/**
 * States / provinces / regions by country for address pickers.
 * Keys MUST match the country labels used in the branch/country dropdowns
 * (see app/(dashboard)/settings/branches/page.tsx COUNTRIES).
 * Lists are representative, not exhaustive. Countries absent from this map
 * fall back to free-text entry on the form.
 */

import { INDIA_STATES_UTS } from "@/lib/data/india-locations";

const UNITED_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia",
  "Washington", "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia",
] as const;

const UNITED_KINGDOM = [
  "England", "Scotland", "Wales", "Northern Ireland",
] as const;

const CANADA = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
  "Yukon",
] as const;

const AUSTRALIA = [
  "Australian Capital Territory", "New South Wales", "Northern Territory",
  "Queensland", "South Australia", "Tasmania", "Victoria",
  "Western Australia",
] as const;

const UAE = [
  "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah",
  "Umm Al Quwain",
] as const;

const SINGAPORE = [
  "Central Region", "East Region", "North Region", "North-East Region",
  "West Region",
] as const;

const GERMANY = [
  "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
  "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland", "Saxony",
  "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia",
] as const;

const NEW_ZEALAND = [
  "Auckland", "Bay of Plenty", "Canterbury", "Gisborne", "Hawke's Bay",
  "Manawatū-Whanganui", "Marlborough", "Nelson", "Northland", "Otago",
  "Southland", "Taranaki", "Tasman", "Waikato", "Wellington", "West Coast",
] as const;

const MALAYSIA = [
  "Johor", "Kedah", "Kelantan", "Kuala Lumpur", "Labuan", "Malacca",
  "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Putrajaya",
  "Sabah", "Sarawak", "Selangor", "Terengganu",
] as const;

const PAKISTAN = [
  "Azad Jammu and Kashmir", "Balochistan", "Gilgit-Baltistan",
  "Islamabad Capital Territory", "Khyber Pakhtunkhwa", "Punjab", "Sindh",
] as const;

const SOUTH_AFRICA = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
] as const;

const NIGERIA = [
  "Abia", "Abuja (FCT)", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi",
  "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

/**
 * Country label → list of states/provinces/regions.
 * Country values come from the form's country dropdown; any country not present
 * here renders the State field as free text.
 */
export const STATES_BY_COUNTRY: Record<string, readonly string[]> = {
  "India": INDIA_STATES_UTS,
  "United States": UNITED_STATES,
  "United Kingdom": UNITED_KINGDOM,
  "Canada": CANADA,
  "Australia": AUSTRALIA,
  "UAE": UAE,
  "Singapore": SINGAPORE,
  "Germany": GERMANY,
  "New Zealand": NEW_ZEALAND,
  "Malaysia": MALAYSIA,
  "Pakistan": PAKISTAN,
  "South Africa": SOUTH_AFRICA,
  "Nigeria": NIGERIA,
};

/** Returns the known states for a country, or an empty array when unlisted. */
export function getStatesForCountry(country: string): readonly string[] {
  if (!country) return [];
  return STATES_BY_COUNTRY[country] ?? [];
}

/** Whether a country has a curated state/region list (vs. free-text entry). */
export function hasStatesForCountry(country: string): boolean {
  return getStatesForCountry(country).length > 0;
}
