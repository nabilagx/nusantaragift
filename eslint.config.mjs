import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // These existing pages intentionally hydrate initial UI state from effects.
  // Keep the React rule visible as a warning there while preserving errors elsewhere.
  {
    files: [
      "src/app/admin/ads/page.tsx",
      "src/app/admin/dashboard/page.tsx",
      "src/app/admin/stories/page.tsx",
      "src/app/cart/page.tsx",
      "src/app/checkout/page.tsx",
      "src/app/favorites/page.tsx",
      "src/app/seller/ads/page.tsx",
      "src/app/seller/dashboard/page.tsx",
      "src/app/seller/orders/SellerOrdersPage.tsx",
      "src/app/seller/stories/page.tsx",
      "src/app/track-order/page.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
