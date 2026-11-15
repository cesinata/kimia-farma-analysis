CREATE TABLE products (
    product_id VARCHAR(7) PRIMARY KEY NOT NULL,
    sector VARCHAR(1),
    product_name TEXT,
    type_code VARCHAR(4),
    type_name TEXT,
    line_code VARCHAR(3),
    product_line TEXT,
    packaging VARCHAR(10)
);
