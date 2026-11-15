# Analyzing Kimia Farma Sales Trend with SQL and Interactive Dashboard

## Update, November 2026

The 2023 report was a Google Data Studio file. That product was renamed Looker Studio, then named Data Studio again in April 2026, and the personal plan is still free. The old report link below is a specific file, and it is no longer online. Google Lookout is a different app and does not host dashboards.

The portfolio page is rebuilt from the three source CSVs:

- Open [`dashboard/index.html`](dashboard/index.html)
- Publish the same numbers for free in Data Studio with [`DATA_STUDIO.md`](DATA_STUDIO.md) and [`looker/kimia_farma_sales.csv`](looker/kimia_farma_sales.csv)

Two corrections are in the new SQL, and the page calls them out:

- Dates in `data_penjualan.csv` are day/month/year. `30/01/22` is 30 January 2022. The old report read it as 22 January 2030, so the trend ran from 2001 to 2031.
- `SQL Aggregate 2.sql` used `HAVING COUNT(*) > 1`, which dropped invoices IN6089, IN6190, and IN6245 (83 units, Rp 4.755.500). The old “products sold” scorecard of 2.154 is that reduced total. The rebuild keeps every invoice: Rp 90.637.700, 2.237 units, 28 invoices.

`python3 scripts/rebuild_sales.py` reloads the CSVs, runs `sql/01_sale_lines.sql`, `sql/02_invoice_totals.sql`, and `sql/03_customer_totals.sql`, and rewrites the dashboard data. Customer totals still match `Result_Aggregate_3.csv`.

---

As a Big Data Analyst Intern who already understands the sales data for each Brand at Kimia Farma, I was asked to make a dashboard of the sales data in one year from the raw data that has been provided. The data needs to be applied to data processing from start to finish. By applying this process, I hope I can understand the work of a Big Data Analyst at Kimia Farma.

There are three tables provided, including:
- penjualan (sales)
- pelanggan (customer)
- barang (goods/medicines)

First, I created the three tables with DDL by querying DDL_penjualan, DDL_pelanggan, and DDL_barang that I uploaded to this repository. Next for the EER diagram I made as shown below.

![EER Diagram](https://user-images.githubusercontent.com/70552539/214739450-54d1c5e6-d545-4d01-81f6-8b22f5817bd5.png)


Furthermore, so that we can find deeper insights from this sales data, I merged and aggregated the data. First, I merged all tables for each sale and create primary key for each sale. Second, I aggregated the number of items and the total per invoice transaction. Then third, I aggregated the total purchases of all transactions from each customer. 


Then I visualize the data through the Google Data Studio tool, which can be seen in the dashboard image below.

![image](https://user-images.githubusercontent.com/70552539/214751639-9a5ecbd4-0c4c-4b79-943d-dc12a9afc8a4.png)


The dashboard is publicy accessed at: https://datastudio.google.com/reporting/c662ce06-e4cc-4757-8adf-68cdce9b6e08 
