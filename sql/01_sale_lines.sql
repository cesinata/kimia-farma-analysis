-- One row per sale line, with product and customer attached.
-- This is the grain the dashboard should use. Aggregates are derived from it.
--
-- Source dates are DD/MM/YY (Indonesian day/month/year).
-- 30/01/22 is 30 January 2022, not 22 January 2030.
-- The 2023 Data Studio report read these strings as YY/MM/DD.

SELECT
    p.id_invoice || '_' || p.id_barang AS id_penjualan,
    p.id_invoice,
    date(
        printf(
            '20%s-%s-%s',
            substr(p.tanggal, 7, 2),
            substr(p.tanggal, 4, 2),
            substr(p.tanggal, 1, 2)
        )
    ) AS tanggal,
    p.id_barang,
    b.nama_barang,
    b.lini,
    p.unit,
    b.kemasan AS kemasan_master,
    p.jumlah_barang,
    p.harga,
    p.jumlah_barang * p.harga AS subtotal,
    p.id_customer,
    c.nama AS nama_customer,
    c.cabang_sales,
    c."group" AS group_category
FROM penjualan AS p
LEFT JOIN barang AS b
    ON p.id_barang = b.kode_barang
LEFT JOIN pelanggan AS c
    ON p.id_customer = c.id_customer
WHERE p.id_invoice IS NOT NULL
  AND p.id_invoice <> '';
