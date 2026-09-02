# Akiyar / Ekusi Lore — Drive inventory, 2026-09-02

TWO copies exist:
  A) My Drive > Brian Claude > Senator Polls   id 1WiXW9JzRxjzUEgnLZ3EtF_ASKWmHbaRI  (28 Aug, stalled 19:58)
  B) My Drive > Senator Polls                  id 1O_Ctid_OJq3Yjiv5qDEttgDz6ZhkXpGF  (31 Aug, stalled 11:15)
B is far more complete. Both stalled mid-upload; folder shells created, leaf files missing.

## PRESENT in B
root: README.md DESIGN.md PRODUCT.md CLAUDE.md AGENTS.md package.json package-lock.json
      tsconfig.json next.config.ts next-env.d.ts eslint.config.mjs postcss.config.mjs
      .gitignore .env.example .env.local(!) tsconfig.tsbuildinfo + 2 campaign photos
src/proxy.ts
src/app/: layout.tsx globals.css(12.7K) campaign.css(53.6K) manifest.ts sitemap.ts robots.ts
          error.tsx global-error.tsx not-found.tsx loading.tsx icon.png apple-icon.png
          opengraph-image.jpg
src/lib/ (14): integrity.ts validation.ts sms.ts auth.ts audit.ts geography.ts dashboard.ts
          content.ts demo.ts demoContent.ts demoData.json demo-flag.ts gallery.ts
          galleryManifest.json
src/components/: ui.tsx EkusiMark.tsx SetupNotice.tsx
src/content/campaign.ts (17K)
supabase/migrations/: 0001..0010 ALL TEN
supabase/seed/0001_geography_turkana.sql (43K)
supabase/bundle/: schema.sql (53K) seed.sql (43K)
scripts/: check-contrast.mjs check-integrity.mjs register-shim.mjs server-only-shim.mjs
          db/{bundle,verify-migrations,verify-rls}.mjs  lib/contrast.mjs  brand/build-mark.mjs
docs/: supabase-setup.md manifesto-content.md deployment-truehost-{vps,cpanel}.md
       truehost-sms-enquiry.md africas-talking-setup.md

## ONLY in A (copy over)
docs/iebc-turkana/: turkana-wards.csv turkana-polling-stations.csv README.md
updated Images/Ekusi Logo.jpeg

## STILL MISSING (empty folder shells in both)
src/app/(site)/page.tsx + about/ contact/ gallery/ get-involved/ manifesto/ privacy/
src/app/actions/{admin,content,geography,register}.ts
src/app/admin/page.tsx, admin/content/page.tsx, admin/export/route.ts
src/app/join/page.tsx
src/app/login/page.tsx
src/app/fonts/
src/components/{register,admin,site}/
src/lib/supabase/
public/{campaign,brand,candidate}/
docs/akiyar-prototype.html

## Derived from .next build manifests (Aug 28 17:38 build) — the spec for what's missing
routes: / /about /contact /gallery /get-involved /manifesto /privacy /join /login
        /admin /admin/content /admin/export(route) + icon.png apple-icon.png
        opengraph-image.jpg manifest.webmanifest robots.txt sitemap.xml
server actions:
  src/app/actions/admin.ts     -> eraseSupporter, resolveFlag
  src/app/actions/content.ts   -> savePost, deletePost, saveEvent, deleteEvent
  src/app/actions/geography.ts -> fetchWards, fetchStations
  src/app/actions/register.ts  -> submitRegistration, verifyOtp, resendOtp
from check-integrity.mjs:
  src/lib/validation.ts -> normalizeKenyanPhone, generateReferralCode
  src/lib/integrity.ts  -> signRegistrationTicket, verifyRegistrationTicket,
                           generateOtpCode, hashOtpCode, safeEqualHex
  src/app/admin/export/route.ts -> csvCell
  referral alphabet ACDEFGHJKMNPQRTUVWXY2346789, format LORE-XXXXXX
from check-contrast.mjs: reads src/app/globals.css custom properties
  --screen --type --type-mid --type-low --ink-700 --ink-600 --signal --signal-deep
  --signal-fill --verified --alarm --field-line
  NOTE: --signal is a DARKENED ODM orange; --signal-fill is raw party orange, surface only.
