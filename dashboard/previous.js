(function () {
  const DATA = window.KIMIA && window.KIMIA.rows;
  if (!DATA) {
    document.body.textContent = "Missing data.js";
    return;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const COLORS = { Tablet: "#1c4173", Bottle: "#4e6f9a", Box: "#a8b7cb", Capsule: "#eb6001" };

  function formatInt(value) {
    return Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatRp(value) {
    return "Rp " + formatInt(value);
  }

  function formatPct(part, whole) {
    return whole ? ((100 * part) / whole).toFixed(1) + "%" : "0%";
  }

  function formatDay(iso) {
    const [, month, day] = iso.split("-");
    return Number(day) + " " + MONTHS[Number(month) - 1];
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-");
    return Number(day) + " " + MONTHS[Number(month) - 1] + " " + year;
  }

  function daysFrom(start, end) {
    const [sy, sm, sd] = start.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const out = [];
    for (let t = Date.UTC(sy, sm - 1, sd), last = Date.UTC(ey, em - 1, ed); t <= last; t += 86400000) {
      const date = new Date(t);
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      out.push(date.getUTCFullYear() + "-" + month + "-" + day);
    }
    return out;
  }

  function group(rows, keyFn) {
    const map = new Map();
    rows.forEach((row) => {
      const key = keyFn(row);
      if (!map.has(key)) {
        map.set(key, {
          key: key,
          revenue: 0,
          quantity: 0,
          lines: 0,
          invoices: new Set(),
          branches: new Set(),
          names: new Set(),
          dates: new Set(),
          sample: row,
        });
      }
      const bucket = map.get(key);
      bucket.revenue += row.line_total;
      bucket.quantity += row.quantity;
      bucket.lines += 1;
      bucket.invoices.add(row.invoice_id);
      bucket.branches.add(row.branch);
      bucket.names.add(row.customer_name);
      bucket.dates.add(row.date);
    });
    return [...map.values()];
  }

  function only(set) {
    return [...set][0];
  }

  const revenue = DATA.reduce((sum, row) => sum + row.line_total, 0);
  const quantity = DATA.reduce((sum, row) => sum + row.quantity, 0);
  const invoices = new Set(DATA.map((row) => row.invoice_id));

  document.getElementById("kpi-revenue").textContent = formatRp(revenue);
  document.getElementById("kpi-invoices").textContent = formatInt(invoices.size);
  document.getElementById("kpi-lines").textContent = formatInt(DATA.length);
  document.getElementById("kpi-units").textContent = formatInt(quantity);

  const byDay = new Map(group(DATA, (row) => row.date).map((bucket) => [bucket.key, bucket]));
  const dates = [...byDay.keys()].sort();
  const span = daysFrom(dates[0], dates[dates.length - 1]);
  const maxDay = Math.max(...[...byDay.values()].map((bucket) => bucket.revenue));
  const peak = [...byDay.values()].sort((a, b) => b.revenue - a.revenue)[0].key;
  const trend = document.getElementById("trend");
  span.forEach((iso) => {
    const bucket = byDay.get(iso);
    const day = document.createElement("div");
    day.className = "day" + (bucket ? "" : " is-empty") + (iso === peak ? " is-peak" : "");
    const bar = document.createElement("span");
    bar.className = "day-bar";
    if (bucket) bar.style.height = Math.max(4, Math.round((150 * bucket.revenue) / maxDay)) + "px";
    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = formatDay(iso);
    day.append(bar, label);
    trend.append(day);
  });

  function renderBars(host, buckets) {
    const max = Math.max(...buckets.map((bucket) => bucket.revenue));
    buckets.forEach((bucket) => {
      const row = document.createElement("div");
      row.className = "row";
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = bucket.label;
      const value = document.createElement("span");
      value.className = "value";
      value.textContent = formatRp(bucket.revenue);
      const track = document.createElement("span");
      track.className = "track";
      const fill = document.createElement("span");
      fill.className = "fill";
      fill.style.width = (max ? (100 * bucket.revenue) / max : 0) + "%";
      track.append(fill);
      row.append(name, value, track);
      host.append(row);
    });
  }

  renderBars(
    document.getElementById("customers"),
    group(DATA, (row) => row.customer_name)
      .sort((a, b) => b.revenue - a.revenue)
      .map((bucket) => ({ label: bucket.key, revenue: bucket.revenue }))
  );

  renderBars(
    document.getElementById("products"),
    group(DATA, (row) => row.product_id)
      .sort((a, b) => b.revenue - a.revenue)
      .map((bucket) => ({ label: bucket.sample.product_name, revenue: bucket.revenue }))
  );

  const invoiceRows = group(DATA, (row) => row.invoice_id)
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 8);
  const invoiceTable = document.createElement("table");
  invoiceTable.innerHTML = "<thead><tr><th>Invoice</th><th>Customer</th><th class='num'>Units</th></tr></thead>";
  const invoiceBody = document.createElement("tbody");
  invoiceRows.forEach((bucket) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      bucket.key +
      "</td><td>" +
      only(bucket.names) +
      "</td><td class='num'>" +
      formatInt(bucket.quantity) +
      "</td>";
    invoiceBody.append(tr);
  });
  invoiceTable.append(invoiceBody);
  document.getElementById("invoices").append(invoiceTable);

  const customerRows = group(DATA, (row) => row.customer_name).sort((a, b) => b.revenue - a.revenue);
  const customerTable = document.createElement("table");
  customerTable.innerHTML = "<thead><tr><th>Customer</th><th>Branch</th><th class='num'>Grand total</th></tr></thead>";
  const customerBody = document.createElement("tbody");
  customerRows.forEach((bucket) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      "<td>" +
      bucket.key +
      "</td><td>" +
      only(bucket.branches) +
      "</td><td class='num'>" +
      formatRp(bucket.revenue) +
      "</td>";
    customerBody.append(tr);
  });
  customerTable.append(customerBody);
  document.getElementById("customers-table").append(customerTable);

  const unitBuckets = group(DATA, (row) => row.unit)
    .map((bucket) => ({ key: bucket.key, value: bucket.lines }))
    .sort((a, b) => b.value - a.value);
  const unitTotal = unitBuckets.reduce((sum, bucket) => sum + bucket.value, 0);
  const svg = document.getElementById("donut");
  const legend = document.getElementById("legend");
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const ns = "http://www.w3.org/2000/svg";
  unitBuckets.forEach((bucket) => {
    const len = Math.max((bucket.value / unitTotal) * circ - 1.4, 0);
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", "80");
    circle.setAttribute("cy", "80");
    circle.setAttribute("r", String(radius));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", COLORS[bucket.key] || "#60756b");
    circle.setAttribute("stroke-width", "18");
    circle.setAttribute("stroke-dasharray", len + " " + (circ - len));
    circle.setAttribute("stroke-dashoffset", String(-offset));
    circle.setAttribute("transform", "rotate(-90 80 80)");
    svg.append(circle);
    offset += len + 1.4;

    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = COLORS[bucket.key] || "#60756b";
    const name = document.createElement("span");
    name.textContent = bucket.key;
    const amount = document.createElement("b");
    amount.textContent = formatPct(bucket.value, unitTotal);
    item.append(swatch, name, amount);
    legend.append(item);
  });
})();
