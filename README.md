# Analyzing Kimia Farma Sales Trends with SQL and an Interactive Dashboard

Portfolio rebuild of a Big Data Analyst internship project: sales for Kimia Farma outlets over a short window, processed end to end from raw tables into SQL aggregates and a dashboard.

## Dashboard

Open [`dashboard/index.html`](dashboard/index.html).

Design direction: **Brand Classic** — Kimia Farma navy `#1C4173` and orange `#EB6001`, matching the 2023 report and the company brand.

To publish the same numbers on free Google Data Studio, see [`DATA_STUDIO.md`](DATA_STUDIO.md) and upload [`looker/kimia_farma_sales.csv`](looker/kimia_farma_sales.csv).

Rebuild English datasets from the original Indonesian source files:

```bash
python3 scripts/rebuild_sales.py
```

## Data model

Three tables:

- `sales` — invoices / sale lines
- `customers` — outlets
- `products` — medicines

English working copies live in [`data/`](data/). The original Indonesian internship files are preserved in [`source/`](source/).

SQL:

- [`sql/schema_sales.sql`](sql/schema_sales.sql), [`sql/schema_customers.sql`](sql/schema_customers.sql), [`sql/schema_products.sql`](sql/schema_products.sql)
- [`sql/01_sale_lines.sql`](sql/01_sale_lines.sql) — join for each sale line
- [`sql/02_invoice_totals.sql`](sql/02_invoice_totals.sql) — units and revenue per invoice
- [`sql/03_customer_totals.sql`](sql/03_customer_totals.sql) — revenue per outlet

![EER Diagram](EER%20Diagram.png)

## Corrections vs the 2023 report

- Dates in the raw sales file are day/month/year. `30/01/22` is 30 January 2022. The old report read it as 22 January 2030, so the trend ran from 2001 to 2031.
- The 2023 invoice query used `HAVING COUNT(*) > 1` and dropped invoices IN6089, IN6190, and IN6245 (83 units, Rp 4.755.500). The old “products sold” scorecard of 2.154 is that reduced total. This rebuild keeps every invoice: **Rp 90.637.700**, **2.237** units, **28** invoices.
- Labels, packaging, channels, and file names are English for an international CV. Outlet proper names stay as Merdeka Pharmacy, Tapak Pharmacy, Sahabat Clinic, and so on.

The previous public Data Studio link is no longer available. Data Studio (formerly Looker Studio) is still free for a personal report.

## English naming

| Indonesian source | English in this repo |
| --- | --- |
| APOTEK MERDEKA | Merdeka Pharmacy |
| APOTEK TAPAK | Tapak Pharmacy |
| KLINIK SAHABAT | Sahabat Clinic |
| DUS / BOTOL / KAPSUL | Box / Bottle / Capsule |
| Apotek / Klinik | Pharmacy / Clinic |
| data_penjualan.csv | data/sales.csv |
| Cabang | Branch |
