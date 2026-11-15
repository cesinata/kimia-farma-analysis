#!/usr/bin/env python3
"""Rebuild the Kimia Farma sale-line table from the three source CSVs.

The SQL files in sql/ are the transformation. This script loads the CSVs
into SQLite, runs those queries, and writes:

- dashboard/data.js          data for the portfolio dashboard
- looker/kimia_farma_sales.csv   UTF-8 file for a free Data Studio upload

Run from anywhere: python3 scripts/rebuild_sales.py
"""

import csv
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "sql"

# Column names follow Data Studio file-upload rules: letters, digits,
# underscores, and they must start with a letter.
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


def load_csv(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return [row for row in csv.DictReader(handle) if any(row.values())]


def read_sql(name):
    text = (SQL / name).read_text(encoding="utf-8").strip()
    if text.endswith(";"):
        text = text[:-1].rstrip()
    return text


def connect():
    penjualan = load_csv(ROOT / "data_penjualan.csv")
    pelanggan = load_csv(ROOT / "data_pelanggan.csv")
    barang = load_csv(ROOT / "data_barang.csv")

    con = sqlite3.connect(":memory:")
    con.row_factory = sqlite3.Row
    con.execute(
        """
        CREATE TABLE penjualan (
            id_invoice TEXT,
            tanggal TEXT,
            id_customer TEXT,
            id_barang TEXT,
            jumlah_barang INTEGER,
            unit TEXT,
            harga INTEGER,
            mata_uang TEXT
        )
        """
    )
    con.execute(
        """
        CREATE TABLE pelanggan (
            id_customer TEXT PRIMARY KEY,
            level TEXT,
            nama TEXT,
            id_cabang_sales TEXT,
            cabang_sales TEXT,
            id_group TEXT,
            "group" TEXT
        )
        """
    )
    con.execute(
        """
        CREATE TABLE barang (
            kode_barang TEXT PRIMARY KEY,
            sektor TEXT,
            nama_barang TEXT,
            tipe TEXT,
            nama_tipe TEXT,
            kode_lini TEXT,
            lini TEXT,
            kemasan TEXT
        )
        """
    )
    con.executemany(
        """
        INSERT INTO penjualan VALUES
        (:id_invoice, :tanggal, :id_customer, :id_barang,
         :jumlah_barang, :unit, :harga, :mata_uang)
        """,
        penjualan,
    )
    con.executemany(
        """
        INSERT INTO pelanggan VALUES
        (:id_customer, :level, :nama, :id_cabang_sales, :cabang_sales,
         :id_group, :group)
        """,
        pelanggan,
    )
    con.executemany(
        """
        INSERT INTO barang VALUES
        (:kode_barang, :sektor, :nama_barang, :tipe, :nama_tipe,
         :kode_lini, :lini, :kemasan)
        """,
        barang,
    )
    con.execute(f"CREATE VIEW sale_lines AS {read_sql('01_sale_lines.sql')}")
    return con


def rows_as_dicts(con, sql):
    return [dict(row) for row in con.execute(sql)]


def assert_pipeline(con, lines):
    revenue = sum(row["subtotal"] for row in lines)
    quantity = sum(row["jumlah_barang"] for row in lines)
    invoices = {row["id_invoice"] for row in lines}
    names = {row["nama_customer"] for row in lines}
    if len(lines) != 132 or revenue != 90637700 or quantity != 2237:
        raise SystemExit(
            f"Unexpected totals: lines={len(lines)} revenue={revenue} qty={quantity}"
        )
    if len(invoices) != 28 or len(names) != 8:
        raise SystemExit("Unexpected invoice or outlet count")
    if any(row["nama_barang"] is None or row["nama_customer"] is None for row in lines):
        raise SystemExit("A sale line lost its product or customer in the join")
    if any(row["tanggal"] < "2022-01-20" or row["tanggal"] > "2022-02-02" for row in lines):
        raise SystemExit("A date fell outside 20 Jan 2022 – 2 Feb 2022")

    customers = rows_as_dicts(con, read_sql("03_customer_totals.sql"))
    with (ROOT / "Result_Aggregate_3.csv").open(newline="", encoding="utf-8") as handle:
        original = list(csv.DictReader(handle))
    rebuilt = [(row["nama_customer"], row["grand_total"], row["cabang"]) for row in customers]
    expected = [
        (row["nama_customer"], int(row["grand_total"]), row["cabang"]) for row in original
    ]
    if rebuilt != expected:
        raise SystemExit(f"Customer totals drifted from Result_Aggregate_3.csv:\n{rebuilt}")

    invoices_now = rows_as_dicts(con, read_sql("02_invoice_totals.sql"))
    if len(invoices_now) != 28:
        raise SystemExit("Invoice query should keep all 28 invoices")
    old_having = rows_as_dicts(
        con,
        """
        SELECT id_invoice, SUM(jumlah_barang) AS jumlah_barang, SUM(subtotal) AS total
        FROM sale_lines
        GROUP BY id_invoice
        HAVING COUNT(*) > 1
        """,
    )
    with (ROOT / "Result_Aggregate_2.csv").open(newline="", encoding="utf-8") as handle:
        original_invoices = {
            row["id_invoice"]: (int(row["all_jumlah_barang"]), int(row["total"]))
            for row in csv.DictReader(handle)
        }
    rebuilt_invoices = {
        row["id_invoice"]: (row["jumlah_barang"], row["total"]) for row in old_having
    }
    if rebuilt_invoices != original_invoices:
        raise SystemExit("Old HAVING query no longer matches Result_Aggregate_2.csv")
    dropped = sorted(invoices - set(original_invoices))
    if dropped != ["IN6089", "IN6190", "IN6245"]:
        raise SystemExit(f"Unexpected dropped invoices: {dropped}")


def to_looker(row):
    return {
        "sale_id": row["id_penjualan"],
        "invoice_id": row["id_invoice"],
        "date": row["tanggal"],
        "product_id": row["id_barang"],
        "product_name": row["nama_barang"],
        "product_line": row["lini"],
        "unit": row["unit"],
        "master_packaging": row["kemasan_master"],
        "quantity": row["jumlah_barang"],
        "unit_price": row["harga"],
        "line_total": row["subtotal"],
        "customer_id": row["id_customer"],
        "customer_name": row["nama_customer"],
        "branch": row["cabang_sales"],
        "channel": row["group_category"],
    }


def main():
    con = connect()
    lines = rows_as_dicts(con, "SELECT * FROM sale_lines ORDER BY tanggal, id_invoice, id_barang")
    assert_pipeline(con, lines)
    records = [to_looker(row) for row in lines]

    looker_dir = ROOT / "looker"
    looker_dir.mkdir(exist_ok=True)
    looker_path = looker_dir / "kimia_farma_sales.csv"
    with looker_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=LOOKER_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(records)

    dashboard_dir = ROOT / "dashboard"
    dashboard_dir.mkdir(exist_ok=True)
    payload = {
        "rows": records,
        "currency": "IDR",
        "dateStart": min(row["date"] for row in records),
        "dateEnd": max(row["date"] for row in records),
    }
    data_js = dashboard_dir / "data.js"
    data_js.write_text(
        "window.KIMIA = " + json.dumps(payload, ensure_ascii=True, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {looker_path.relative_to(ROOT)} ({len(records)} rows)")
    print(f"Wrote {data_js.relative_to(ROOT)}")
    print(
        "Revenue Rp {:,} · {} invoices · {} units".format(
            sum(row["line_total"] for row in records),
            len({row["invoice_id"] for row in records}),
            sum(row["quantity"] for row in records),
        ).replace(",", ".")
    )


if __name__ == "__main__":
    main()
