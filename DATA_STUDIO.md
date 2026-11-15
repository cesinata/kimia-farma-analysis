# Data Studio build notes

Reference notes for rebuilding the same report in Google Data Studio (formerly Looker Studio). The portfolio page in `dashboard/` is the delivered version.

Upload [`looker/kimia_farma_sales.csv`](looker/kimia_farma_sales.csv): one row per sale line, ISO dates. Do not upload the older aggregate extracts in `source/`; those dropped three invoices.

```bash
python3 scripts/rebuild_sales.py
```

## Data source

1. Sign in at [datastudio.google.com](https://datastudio.google.com/)
2. Create → Data source → CSV file upload
3. Upload `looker/kimia_farma_sales.csv` and Connect
4. Confirm `date` is Date (`YYYY-MM-DD`)

If CSV upload is missing, put the file in Google Sheets and connect the sheet instead.

## Charts

| Chart | Dimension | Metric |
| --- | --- | --- |
| Scorecard | | `SUM(line_total)` → 90,637,700 |
| Scorecard | | `COUNT_DISTINCT(invoice_id)` → 28 |
| Scorecard | | `SUM(quantity)` → 2,237 |
| Scorecard | | `COUNT(sale_id)` → 132 |
| Column chart | `date` | `SUM(line_total)` |
| Bar chart | `customer_name` | `SUM(line_total)` |
| Bar chart | `product_name` | `SUM(line_total)` |
| Pie chart | `unit` | `SUM(line_total)` or `COUNT(sale_id)` |
| Table | `invoice_id`, `customer_name`, `branch`, `date` | `SUM(quantity)`, `SUM(line_total)` |
| Table | `customer_name`, `branch`, `channel` | `SUM(line_total)` |

Colors: navy `#1C4173`, orange `#EB6001`.

## Checks

- Revenue: Rp 90.637.700
- Top outlet: Merdeka Pharmacy, Bandung
- Top product: Acyclovir Box
- Largest invoice by units: IN6028 (386 units)
- Strongest day: 1 Feb 2022
