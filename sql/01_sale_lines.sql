-- One row per sale line, with product and customer attached.
-- Dates in source/sales_raw.csv are day/month/year and are normalized
-- to ISO dates when the English sales table is built.

SELECT
    s.invoice_id || '_' || s.product_id AS sale_id,
    s.invoice_id,
    s.date,
    s.product_id,
    p.product_name,
    p.product_line,
    s.unit,
    p.packaging AS master_packaging,
    s.quantity,
    s.unit_price,
    s.quantity * s.unit_price AS line_total,
    s.customer_id,
    c.customer_name,
    c.branch,
    c.channel
FROM sales AS s
LEFT JOIN products AS p
    ON s.product_id = p.product_id
LEFT JOIN customers AS c
    ON s.customer_id = c.customer_id;
