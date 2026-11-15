#!/usr/bin/env python3
"""Build English sales datasets for the Kimia Farma portfolio dashboard.

Reads the original Indonesian CSVs in source/, writes:

- data/sales.csv, data/customers.csv, data/products.csv
- data/sale_lines.csv          grain for the dashboard / Data Studio
- data/invoice_totals.csv
- data/customer_totals.csv
- looker/kimia_farma_sales.csv
- dashboard/data.js

Outlet names keep the Indonesian proper noun and use an English type:
Merdeka Pharmacy, Sahabat Clinic, and so on.
"""

from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
DATA = ROOT / "data"
LOOKER = ROOT / "looker"
DASHBOARD = ROOT / "dashboard"
SQL = ROOT / "sql"

OUTLET_NAMES = {
    "APOTEK MERDEKA": "Merdeka Pharmacy",
    "APOTEK TAPAK": "Tapak Pharmacy",
    "APOTEK MAJA": "Maja Pharmacy",
    "APOTEK SINAR JAYA": "Sinar Jaya Pharmacy",
    "APOTEK SAHABAT": "Sahabat Pharmacy",
    "KLINIK SAHABAT": "Sahabat Clinic",
    "KLINIK GM": "GM Clinic",
    "KLINIK DR. ANDRI": "Dr. Andri Clinic",
}

CHANNEL_NAMES = {
    "Apotek": "Pharmacy",
    "Klinik": "Clinic",
}

UNIT_NAMES = {
    "DUS": "Box",
    "BOTOL": "Bottle",
    "TABLET": "Tablet",
    "KAPSUL": "Capsule",
}

PRODUCT_NAMES = {
    "ACYCLOVIR DUS": "Acyclovir Box",
    "ALERGINE TABLET SALUT": "Alerine Coated Tablet",
    "AMPICILLIN": "Ampicillin",
    "TRAMADOL KAPSUL 50 MG": "Tramadol Capsule 50 mg",
    "KLORPROMAZINA TABLET SALUT SELAPUT 100 MG": "Chlorpromazine Film-Coated Tablet 100 mg",
    "KETOCONAZOLE TABLET 200 MG": "Ketoconazole Tablet 200 mg",
    "ERGOTAMINE COFFEINE": "Ergotamine Caffeine",
    "TETRACYCLINE KAPSUL 250 MG": "Tetracycline Capsule 250 mg",
    "AMBROXOL HC": "Ambroxol HC",
    "PARACETAMOL": "Paracetamol",
}

PRODUCT_LINES = {
    "ETIKAL": "Ethical",
    "OGB & PH": "OGB & PH",
    "MARCKS": "Marcks",
    "VNS": "VNS",
    "SLCYL": "SLCYL",
}

TYPE_NAMES = {
    "Produk jadi": "Finished product",
}

LOOKER_FIELDS = [
    "sale_id",
    "invoice_id",
    "date",
    "product_id",
    "product_name",
    "product_line",
    "unit",
    "master_packaging",
    "quantity",
    "unit_price",
    "line_total",
    "customer_id",
    "customer_name",
    "branch",
    "channel",
]


def load_csv(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as handle:
        return [row for row in csv.DictReader(handle) if any((value or "").strip() for value in row.values())]


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def parse_date(value: str) -> str:
    day, month, year = value.split("/")
    return f"20{year}-{month}-{day}"


def english_customers(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        name = row["nama"].strip()
        if name not in OUTLET_NAMES:
            raise SystemExit(f"Unknown outlet name: {name!r}")
        channel = row["group"].strip()
        out.append(
            {
                "customer_id": row["id_customer"],
                "level": row["level"],
                "customer_name": OUTLET_NAMES[name],
                "branch_id": row["id_cabang_sales"],
                "branch": row["cabang_sales"],
                "channel_id": row["id_group"],
                "channel": CHANNEL_NAMES[channel],
            }
        )
    return out


def english_products(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        name = row["nama_barang"].strip()
        line = row["lini"].strip()
        pack = row["kemasan"].strip()
        type_name = row["nama_tipe"].strip()
        if name not in PRODUCT_NAMES:
            raise SystemExit(f"Unknown product name: {name!r}")
        out.append(
            {
                "product_id": row["kode_barang"],
                "sector": row["sektor"],
                "product_name": PRODUCT_NAMES[name],
                "type_code": row["tipe"],
                "type_name": TYPE_NAMES.get(type_name, type_name),
                "line_code": row["kode_lini"],
                "product_line": PRODUCT_LINES.get(line, line),
                "packaging": UNIT_NAMES[pack],
            }
        )
    return out


def english_sales(rows: list[dict]) -> list[dict]:
    out = []
    for row in rows:
        unit = row["unit"].strip()
        out.append(
            {
                "invoice_id": row["id_invoice"],
                "date": parse_date(row["tanggal"].strip()),
                "customer_id": row["id_customer"],
                "product_id": row["id_barang"],
                "quantity": int(row["jumlah_barang"]),
                "unit": UNIT_NAMES[unit],
                "unit_price": int(row["harga"]),
                "currency": row["mata_uang"],
            }
        )
    return out


def read_sql(name: str) -> str:
    text = (SQL / name).read_text(encoding="utf-8").strip()
    return text[:-1].rstrip() if text.endswith(";") else text


def connect(sales, customers, products) -> sqlite3.Connection:
    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        CREATE TABLE sales (
            invoice_id TEXT,
            date TEXT,
            customer_id TEXT,
            product_id TEXT,
            quantity INTEGER,
            unit TEXT,
            unit_price INTEGER,
            currency TEXT
        );
        CREATE TABLE customers (
            customer_id TEXT PRIMARY KEY,
            level TEXT,
            customer_name TEXT,
            branch_id TEXT,
            branch TEXT,
            channel_id TEXT,
            channel TEXT
        );
        CREATE TABLE products (
            product_id TEXT PRIMARY KEY,
            sector TEXT,
            product_name TEXT,
            type_code TEXT,
            type_name TEXT,
            line_code TEXT,
            product_line TEXT,
            packaging TEXT
        );
        """
    )
    con.executemany(
        """
        INSERT INTO sales VALUES
        (:invoice_id, :date, :customer_id, :product_id, :quantity, :unit, :unit_price, :currency)
        """,
        sales,
    )
    con.executemany(
        """
        INSERT INTO customers VALUES
        (:customer_id, :level, :customer_name, :branch_id, :branch, :channel_id, :channel)
        """,
        customers,
    )
    con.executemany(
        """
        INSERT INTO products VALUES
        (:product_id, :sector, :product_name, :type_code, :type_name, :line_code, :product_line, :packaging)
        """,
        products,
    )
    con.execute(f"CREATE VIEW sale_lines AS {read_sql('01_sale_lines.sql')}")
    return con


def rows_as_dicts(con: sqlite3.Connection, sql: str) -> list[dict]:
    return [dict(row) for row in con.execute(sql)]


def assert_pipeline(con: sqlite3.Connection, lines: list[dict]) -> None:
    revenue = sum(row["line_total"] for row in lines)
    quantity = sum(row["quantity"] for row in lines)
    invoices = {row["invoice_id"] for row in lines}
    names = {row["customer_name"] for row in lines}
    if len(lines) != 132 or revenue != 90637700 or quantity != 2237:
        raise SystemExit(f"Unexpected totals: lines={len(lines)} revenue={revenue} qty={quantity}")
    if len(invoices) != 28 or len(names) != 8:
        raise SystemExit("Unexpected invoice or outlet count")
    if any(row["date"] < "2022-01-20" or row["date"] > "2022-02-02" for row in lines):
        raise SystemExit("A date fell outside 20 Jan 2022 – 2 Feb 2022")
    if "Merdeka Pharmacy" not in names or "Sahabat Clinic" not in names:
        raise SystemExit("English outlet names missing")

    customers = rows_as_dicts(con, read_sql("03_customer_totals.sql"))
    expected = [
        ("Merdeka Pharmacy", 30030900, "Bandung"),
        ("Tapak Pharmacy", 18330100, "Aceh"),
        ("Sahabat Clinic", 10167000, "Tangerang"),
        ("GM Clinic", 9469900, "Jakarta"),
        ("Sinar Jaya Pharmacy", 9215300, "Bekasi"),
        ("Maja Pharmacy", 8853800, "Kuningan"),
        ("Dr. Andri Clinic", 2681200, "Lampung"),
        ("Sahabat Pharmacy", 1889500, "Padang"),
    ]
    rebuilt = [(row["customer_name"], row["grand_total"], row["branch"]) for row in customers]
    if rebuilt != expected:
        raise SystemExit(f"Customer totals drifted:\n{rebuilt}")

    invoices_now = rows_as_dicts(con, read_sql("02_invoice_totals.sql"))
    if len(invoices_now) != 28:
        raise SystemExit("Invoice query should keep all 28 invoices")


def main() -> None:
    sales = english_sales(load_csv(SOURCE / "sales_raw.csv"))
    customers = english_customers(load_csv(SOURCE / "customers_raw.csv"))
    products = english_products(load_csv(SOURCE / "products_raw.csv"))

    write_csv(
        DATA / "sales.csv",
        ["invoice_id", "date", "customer_id", "product_id", "quantity", "unit", "unit_price", "currency"],
        sales,
    )
    write_csv(
        DATA / "customers.csv",
        ["customer_id", "level", "customer_name", "branch_id", "branch", "channel_id", "channel"],
        customers,
    )
    write_csv(
        DATA / "products.csv",
        ["product_id", "sector", "product_name", "type_code", "type_name", "line_code", "product_line", "packaging"],
        products,
    )

    con = connect(sales, customers, products)
    lines = rows_as_dicts(
        con,
        "SELECT * FROM sale_lines ORDER BY date, invoice_id, product_id",
    )
    assert_pipeline(con, lines)

    invoices = rows_as_dicts(con, read_sql("02_invoice_totals.sql"))
    customer_totals = rows_as_dicts(con, read_sql("03_customer_totals.sql"))

    write_csv(DATA / "sale_lines.csv", LOOKER_FIELDS, lines)
    write_csv(
        DATA / "invoice_totals.csv",
        ["invoice_id", "date", "customer_name", "branch", "line_count", "quantity", "total"],
        invoices,
    )
    write_csv(
        DATA / "customer_totals.csv",
        ["customer_name", "grand_total", "branch", "channel", "customer_id_count", "invoice_count", "quantity"],
        customer_totals,
    )

    LOOKER.mkdir(exist_ok=True)
    write_csv(LOOKER / "kimia_farma_sales.csv", LOOKER_FIELDS, lines)

    DASHBOARD.mkdir(exist_ok=True)
    payload = {
        "rows": lines,
        "currency": "IDR",
        "dateStart": min(row["date"] for row in lines),
        "dateEnd": max(row["date"] for row in lines),
    }
    (DASHBOARD / "data.js").write_text(
        "window.KIMIA = " + json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )

    print(f"Wrote English tables under {DATA.relative_to(ROOT)}/")
    print(f"Wrote {LOOKER.relative_to(ROOT)}/kimia_farma_sales.csv ({len(lines)} rows)")
    print(f"Wrote {DASHBOARD.relative_to(ROOT)}/data.js")
    print(
        "Revenue Rp {:,} · {} invoices · {} units".format(
            sum(row["line_total"] for row in lines),
            len({row["invoice_id"] for row in lines}),
            sum(row["quantity"] for row in lines),
        ).replace(",", ".")
    )


if __name__ == "__main__":
    main()
