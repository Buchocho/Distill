/**
 * Group currencies.
 *
 * What it holds: the list of currencies a group can choose on the New group screen, and the
 * check that a code is on that list.
 *
 * Why it matters: Distill is meant for groups outside Portugal (for example the US, Canada and
 * Nigeria), so each group shows amounts in its own currency. The currency is display only:
 * nothing is converted and no exchange rate is used, and the currency is fixed once the
 * group is created (SPEC.md rule 2b).
 *
 * Why only these currencies: the app stores money as whole cents (two decimal places), and the
 * rounding in src/domain/money.ts depends on that. Every currency here shows two decimal places,
 * so the logic is unchanged. Currencies shown with no decimals (yen, won, CFA franc and others)
 * or three (Kuwaiti dinar and others) are left out on purpose. Withdrawn currencies (Croatian
 * kuna, old Zimbabwean dollar, Cuban convertible peso, Netherlands Antillean guilder) are left out.
 *
 * The list is fixed here rather than read from the browser, so the server and every browser
 * offer the same choices. Business rules: SPEC.md rule 2b. Pure code.
 * Tests: tests/unit/currencies.test.ts
 */

/** The currency a new group gets unless another is chosen. */
export const DEFAULT_CURRENCY = "EUR";

/** ISO 4217 code and English name of every currency a group can choose, sorted by name. */
export const CURRENCIES: readonly { code: string; name: string }[] = [
  { code: "DZD", name: "Algerian Dinar" },
  { code: "AOA", name: "Angolan Kwanza" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "AWG", name: "Aruban Florin" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "BZD", name: "Belize Dollar" },
  { code: "BMD", name: "Bermudan Dollar" },
  { code: "BTN", name: "Bhutanese Ngultrum" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BWP", name: "Botswanan Pula" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "GBP", name: "British Pound" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CVE", name: "Cape Verdean Escudo" },
  { code: "XCG", name: "Caribbean Guilder" },
  { code: "KYD", name: "Cayman Islands Dollar" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "CDF", name: "Congolese Franc" },
  { code: "CRC", name: "Costa Rican Colón" },
  { code: "CUP", name: "Cuban Peso" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DKK", name: "Danish Krone" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ERN", name: "Eritrean Nakfa" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "EUR", name: "Euro" },
  { code: "FKP", name: "Falkland Islands Pound" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "GMD", name: "Gambian Dalasi" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "GIP", name: "Gibraltar Pound" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "GYD", name: "Guyanaese Dollar" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "HNL", name: "Honduran Lempira" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "KGS", name: "Kyrgyz Som" },
  { code: "LSL", name: "Lesotho Loti" },
  { code: "LRD", name: "Liberian Dollar" },
  { code: "MOP", name: "Macanese Pataca" },
  { code: "MKD", name: "Macedonian Denar" },
  { code: "MWK", name: "Malawian Kwacha" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "MRU", name: "Mauritanian Ouguiya" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "MNT", name: "Mongolian Tugrik" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "MZN", name: "Mozambican Metical" },
  { code: "NAD", name: "Namibian Dollar" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "NIO", name: "Nicaraguan Córdoba" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "PAB", name: "Panamanian Balboa" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "QAR", name: "Qatari Riyal" },
  { code: "RON", name: "Romanian Leu" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "SHP", name: "St. Helena Pound" },
  { code: "WST", name: "Samoan Tala" },
  { code: "STN", name: "São Tomé & Príncipe Dobra" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "SCR", name: "Seychellois Rupee" },
  { code: "SLE", name: "Sierra Leonean Leone" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "SBD", name: "Solomon Islands Dollar" },
  { code: "ZAR", name: "South African Rand" },
  { code: "SSP", name: "South Sudanese Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "SDG", name: "Sudanese Pound" },
  { code: "SRD", name: "Surinamese Dollar" },
  { code: "SZL", name: "Swazi Lilangeni" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "THB", name: "Thai Baht" },
  { code: "TOP", name: "Tongan Paʻanga" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "AED", name: "United Arab Emirates Dirham" },
  { code: "USD", name: "US Dollar" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "VES", name: "Venezuelan Bolívar" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "ZWG", name: "Zimbabwean Gold" },
];

const CODES = new Set(CURRENCIES.map((c) => c.code));

/** True when a group may use this currency code. Used by the New group check (SPEC.md rule 2b). */
export function isSupportedCurrency(code: string): boolean {
  return CODES.has(code);
}
