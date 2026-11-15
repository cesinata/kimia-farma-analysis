CREATE TABLE customers (
    customer_id VARCHAR(9) PRIMARY KEY NOT NULL,
    level VARCHAR(10),
    customer_name TEXT,
    branch_id VARCHAR(5),
    branch VARCHAR(15),
    channel_id VARCHAR(3),
    channel VARCHAR(10)
);
