-- Units and revenue per invoice.
--
-- The 2023 query kept `HAVING COUNT(*) > 1`, which dropped the three
-- one-line invoices (IN6089, IN6190, IN6245). Those invoices are real
-- sales: 83 units and Rp 4.755.500. This version keeps every invoice.

SELECT
    id_invoice,
    MIN(tanggal) AS tanggal,
    MIN(nama_customer) AS nama_customer,
    MIN(cabang_sales) AS cabang_sales,
    COUNT(*) AS jumlah_baris,
    SUM(jumlah_barang) AS jumlah_barang,
    SUM(subtotal) AS total
FROM sale_lines
GROUP BY id_invoice
ORDER BY jumlah_barang DESC, total DESC;
