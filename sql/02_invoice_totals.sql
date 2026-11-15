-- Units and revenue per invoice.
-- Keeps every invoice, including the three one-line invoices the 2023
-- query dropped with HAVING COUNT(*) > 1.

SELECT
    invoice_id,
    MIN(date) AS date,
    MIN(customer_name) AS customer_name,
    MIN(branch) AS branch,
    COUNT(*) AS line_count,
    SUM(quantity) AS quantity,
    SUM(line_total) AS total
FROM sale_lines
GROUP BY invoice_id
ORDER BY quantity DESC, total DESC;
