-- Revenue per outlet name.
-- Several customer ids share one pharmacy or clinic name and one branch.

SELECT
    customer_name,
    SUM(line_total) AS grand_total,
    MIN(branch) AS branch,
    MIN(channel) AS channel,
    COUNT(DISTINCT customer_id) AS customer_id_count,
    COUNT(DISTINCT invoice_id) AS invoice_count,
    SUM(quantity) AS quantity
FROM sale_lines
GROUP BY customer_name
ORDER BY grand_total DESC;
