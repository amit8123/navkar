# Navkar City – Google Ads Launch Kit

Is folder me Google Ads Search campaign ke liye ready files hain. Website par tracking, sitemap aur SEO tags bhi add ho chuke hain.

## Files

| File | Kya hai |
|---|---|
| `1-keywords.csv` | 5 ad groups, 45 keywords (har ek Phrase + Exact = 90 rows) – Google Ads Editor me import |
| `2-negative-keywords.csv` | Campaign-level negative keywords (rent, resale, job, plot, etc.) |
| `3-responsive-search-ads.csv` | Har ad group ka RSA: 15 headlines (≤30 char) + 4 descriptions (≤90 char) |
| `4-ad-extensions.csv` | 5 sitelinks, 5 callouts, 2 structured snippets, call asset |
| `campaign-plan.md` | Ye file – setup, targeting, budget, KPI |

**Import kaise kare:** Google Ads Editor → Account → Import → "From file" → CSV. Pehle `1`, phir `2`, `3`, `4`.

**Zaruri:** CSV me `https://navkarcityofficial.com` hai. Import se pehle Find & Replace se apne asli domain se badal do. Usi tarah `sitemap.xml` aur `robots.txt` me bhi.

## 1. Campaign setup

| Setting | Value |
|---|---|
| Type | Search (Display network OFF, Search partners OFF) |
| Goal | Leads |
| Conversion | `generate_lead` (form) + phone click + WhatsApp click |
| Bidding | Start: Maximize clicks (max CPC cap) → 30 conversions ke baad Maximize conversions → phir Target CPA |
| Budget | Shuru me ₹1,000–1,500/day. 2 hafte data aane do, phir badhao |
| Schedule | 9 AM – 9 PM (calls tabhi uthao jab team available ho), Sat-Sun full |
| Language | English + Hindi + Marathi |
| Devices | All (80% traffic mobile hoga – bid adjustment mat lagao pehle) |

## 2. Location targeting

Include (Presence – "People in or regularly in"):
- Vasai-Virar, Naigaon, Nalasopara East, Bhayandar, Mira Road
- Borivali, Dahisar, Kandivali, Malad (Western line commuters)
- Thane, Mumbai (optional – 2nd phase)

Radius option: Naigaon East se 15–20 km.

Exclude: Presence-or-interest **OFF** (sirf "Presence"), taaki door ke log na aaye.

## 3. Structure

```
Navkar City - Search - Naigaon
├── Naigaon East Flats   (intent: area)
├── BHK Naigaon          (intent: config)
├── Vasai Virar Flats    (intent: wide area)
├── Near Station         (intent: commute)
└── Brand                (navkar city…) – alag budget, low CPC
```

Har ad group ka final URL alag landing section par bhej sakte ho:
`/#plans` (BHK), `/#location` (Near Station), `/#amenities`.

## 4. Landing page – pehle se ready

- Brochure popup (lead capture) – 1.6 sec baad khulta hai, form submit par brochure download
- Enquiry form + success popup, call/WhatsApp buttons (header dock)
- Mobile, tablet, desktop – same design
- MahaRERA numbers footer me (Google real-estate policy ke liye zaruri)

## 5. Tracking setup (5 minute)

1. [analytics.google.com](https://analytics.google.com) → GA4 property → Measurement ID (`G-XXXXXXXXXX`).
2. Google Ads → Goals → Conversions → New → Website → 2 conversions banao:
   - **Lead form** – category "Submit lead form" – label copy karo
   - **Phone/WhatsApp click** – category "Contact"
3. `assets/js/track.js` ke upar `CONFIG` me daalo:
   ```js
   GA4_ID: 'G-XXXXXXXXXX',
   ADS_ID: 'AW-1234567890',
   ADS_LEAD_LABEL: 'AbC-D_efG-h12345',
   ADS_CALL_LABEL: 'XyZ-1234567890',
   ```
4. Google Tag Assistant se test: form submit karo → `generate_lead` + conversion fire dikhna chahiye.
5. Search Console me domain verify karo, `sitemap.xml` submit karo.
6. GA4 aur Google Ads link karo.

Events jo ab auto-track hote hain: `generate_lead` (popup + enquiry form, `lead_source` ke saath), `phone_click`, `whatsapp_click`, `brochure_click`.

Lead ke saath UTM/gclid `leads.page_url` column me save hota hai (referrer se) – isse pata chalega kaunsa keyword se lead aaya.

## 6. Ad policy – dhyan rakho

- Real-estate ad me **MahaRERA number** landing page par dikhna chahiye (hai). Ad copy me bhi "MahaRERA Registered" likha hai.
- Price, discount, "lowest", "guaranteed returns", "#1" jaise claim tabhi likho jab proof ho.
- Images "artist's impression" hain – ad images me bhi yahi disclaimer.
- Phone number ads aur site par same rakho (+91 77589 70439).

## 7. Pehle 30 din ka routine

| Din | Kaam |
|---|---|
| 1–3 | Roz Search Terms report: bekaar term → negative keyword |
| 4–7 | Kam CTR wale headlines replace, "Pinned" mat karo |
| 8–14 | Keywords ka Quality Score dekho (<5 ko pause ya ad copy fix) |
| 15–30 | Device/time/location report; best segment par bid +10–20% |
| Mahine ke end | Lead → site visit → booking ka sales team se feedback; offline conversion import |

## 8. KPI targets (andaaza – local market ke hisaab se badlenge)

| Metric | Healthy range |
|---|---|
| CTR | 4–8% |
| Conversion rate (landing) | 4–10% |
| CPL | market par depend; 3 hafte baad apna benchmark banao |
| Quality Score | 6+ |

## 9. Aage ke campaigns

1. **Remarketing** – site visitors (30/60 din) → Display + YouTube
2. **Performance Max** – lead gen, final URL = site, audience signal = site visitors + in-market real estate
3. **YouTube/Demand Gen** – 6 reels (`assets/reels/`) ads me use kar sakte ho
4. **Google Business Profile** – Navkar City ka listing + photos, local pack ke liye