# Publish this dashboard free in Data Studio

Google Data Studio is the free tool this project used in 2023. It was renamed Looker Studio, then named **Data Studio** again in April 2026. The free plan still covers a personal report.

This is not Google Lookout and not Looker (the paid enterprise product). A free Google account is enough.

Upload [`looker/kimia_farma_sales.csv`](looker/kimia_farma_sales.csv) — one row per sale line, English headers, ISO dates. Do not upload the older Indonesian aggregate extracts in `source/`; those dropped three invoices.

Regenerate with:

```bash
python3 scripts/rebuild_sales.py
```

## Create the data source

1. Sign in at [datastudio.google.com](https://datastudio.google.com/).
2. **Create** → **Data source**.
3. Choose **CSV file upload**.
4. Upload `looker/kimia_farma_sales.csv` and **Connect**.
5. Confirm `date` is type **Date** (`YYYY-MM-DD`).

CSV upload is free. If the connector is not in your account yet, import the same file into Google Sheets and connect that sheet.

## Suggested charts

| Chart | Dimension | Metric |
| --- | --- | --- |
| Scorecard | — | `SUM(line_total)` → 90,637,700 |
| Scorecard | — | `COUNT_DISTINCT(invoice_id)` → 28 |
| Scorecard | — | `SUM(quantity)` → 2,237 |
| Scorecard | — | `COUNT(sale_id)` → 132 |
| Column chart | `date` | `SUM(line_total)` |
| Bar chart | `customer_name` | `SUM(line_total)` |
| Bar chart | `product_name` | `SUM(line_total)` |
| Pie chart | `unit` | `SUM(line_total)` or `COUNT(sale_id)` |
| Table | `invoice_id`, `customer_name`, `branch`, `date` | `SUM(quantity)`, `SUM(line_total)` |
| Table | `customer_name`, `branch`, `channel` | `SUM(line_total)` |

Brand Classic colors for charts: navy `#1C4173`, orange `#EB6001`.

## Check before sharing

- Revenue: Rp 90.637.700
- Top outlet: Merdeka Pharmacy, Bandung
- Top product: Acyclovir Box
- Largest invoice by units: IN6028 (386 units)
- Strongest day: 1 Feb 2022
