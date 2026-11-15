# Publish this dashboard free in Data Studio

Google Data Studio is the free tool this project used in 2023. It was renamed Looker Studio, then renamed **Data Studio** again in April 2026. The free plan still covers a personal report. The old report link in the README is a specific file from that internship, and it is no longer available. The product is.

This is not Google Lookout (an Android accessibility app) and it is not Looker, the paid enterprise product. A free Google account is enough.

The file to upload is [`looker/kimia_farma_sales.csv`](looker/kimia_farma_sales.csv). It is one row per sale line, with dates as `YYYY-MM-DD`. Upload that file, not the older `Result_Aggregate_*.csv` extracts. The invoice extract dropped three one-line invoices, so scorecards built from it will not match the customer totals.

Regenerate the file from the source CSVs with:

```bash
python3 scripts/rebuild_sales.py
```

## Create the data source

1. Sign in at [datastudio.google.com](https://datastudio.google.com/). `lookerstudio.google.com` redirects there.
2. Choose **Create**, then **Data source**.
3. Choose the **CSV file upload** connector.
4. Choose **Add data set** and upload `looker/kimia_farma_sales.csv`. You can also drop the file on the page.
5. Choose **Connect**.
6. Confirm `date` has type **Date**. If it arrives as text, change the type to Date (`YYYY-MM-DD`).

CSV upload is free. This file is far below the 100 MB limit. If the CSV connector is not in your account yet (Google has been releasing it gradually), import the same file into Google Sheets and connect that sheet instead. The charts below are the same.

Column names are letters, digits, and underscores, which is what the file-upload connector requires.

## Build the report

Create a report from that data source. Add a date-range control and drop-downs for `branch`, `channel`, `product_line`, and `unit`. Set each chart to use the report filters.

| Chart | Dimension | Metric | Note |
| --- | --- | --- | --- |
| Scorecard | — | `SUM(line_total)` | Total sales revenue. Should read 90,637,700. |
| Scorecard | — | `COUNT_DISTINCT(invoice_id)` | 28 invoices. |
| Scorecard | — | `SUM(quantity)` | 2,237 units. The old report showed 2,154 because three invoices were excluded. |
| Scorecard | — | `COUNT(sale_id)` | 132 purchases (sale lines). |
| Column chart | `date` | `SUM(line_total)` | Sales trend. The range is 20 Jan 2022 to 2 Feb 2022. |
| Bar chart | `customer_name` | `SUM(line_total)` | Sort descending. APOTEK MERDEKA is first at 30,030,900. |
| Bar chart | `product_name` | `SUM(line_total)` | Sort descending. ACYCLOVIR DUS is first. |
| Pie chart | `unit` | `SUM(line_total)` | Packaging on the invoice. |
| Pie chart | `master_packaging` | `SUM(line_total)` | Optional. Tramadol and tetracycline move to KAPSUL. |
| Table | `invoice_id`, `customer_name`, `branch`, `date` | `SUM(quantity)`, `SUM(line_total)`, `COUNT(sale_id)` | Sort by quantity descending. IN6028 is first, with 386 units. |
| Table | `customer_name`, `branch`, `channel` | `SUM(line_total)`, `SUM(quantity)`, `COUNT_DISTINCT(customer_id)`, `COUNT_DISTINCT(invoice_id)` | Same rollup as `sql/03_customer_totals.sql`. |
| Bar chart | `product_line` | `SUM(line_total)` | OGB & PH is the largest line. |

Share the report if it should be on a portfolio. The uploaded dataset itself stays private to the Google account. The shared object is the report (and, if you choose, the data source).

## Check the totals before sharing

With no filters applied, the scorecards should match the portfolio page in [`dashboard/index.html`](dashboard/index.html):

- Revenue: Rp 90.637.700
- Invoices: 28
- Units: 2.237
- Sale lines: 132
- Strongest day: 1 Feb 2022
- Top outlet: APOTEK MERDEKA, Bandung
- Top product: ACYCLOVIR DUS
- Largest invoice by units: IN6028

The working page in this repo is there so the portfolio does not depend on a Google login. Data Studio is the free hosted copy of the same file.
