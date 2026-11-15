-- Revenue per outlet name.
-- Several customer ids share one pharmacy name and one branch.
-- Grouping by nama_customer matches the original customer aggregate.

SELECT
    nama_customer,
    SUM(subtotal) AS grand_total,
    MIN(cabang_sales) AS cabang,
    MIN(group_category) AS group_category,
    COUNT(DISTINCT id_customer) AS jumlah_id_customer,
    COUNT(DISTINCT id_invoice) AS jumlah_invoice,
    SUM(jumlah_barang) AS jumlah_barang
FROM sale_lines
GROUP BY nama_customer
ORDER BY grand_total DESC;
