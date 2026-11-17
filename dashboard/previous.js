(function () {
  const DATA = window.KIMIA_ORIGINAL && window.KIMIA_ORIGINAL.rows;
  if (!DATA) {
    document.body.textContent = "Missing dashboard/previous-data.js. Run python3 scripts/rebuild_sales.py.";
    return;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const UNIT_COLORS = {
    TABLET: "#1c4173",
    BOTOL: "#6b86a8",
    DUS: "#b7c4d6",
  };

  const state = { brand: "" };
  const tip = document.getElementById("tip");

  function formatInt(value) {
    const sign = value < 0 ? "-" : "";
    const digits = Math.round(Math.abs(value)).toString();
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatRp(value) {
    return formatInt(value);
  }

  function formatPct(part, whole) {
    if (!whole) return "0%";
    return ((100 * part) / whole).toFixed(1) + "%";
  }

  function formatDay(iso) {
    const [year, month, day] = iso.split("-");
    return Number(day) + " " + MONTHS[Number(month) - 1] + " " + year;
  }

  function shortDay(iso) {
    const [year, month, day] = iso.split("-");
    return MONTHS[Number(month) - 1] + " " + year.slice(2) + " · " + Number(day);
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

  function sum(rows, pick) {
    return rows.reduce((total, row) => total + pick(row), 0);
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
          cabangs: new Set(),
          sample: row,
        });
      }
      const bucket = map.get(key);
      bucket.revenue += row.line_total;
      bucket.quantity += row.quantity;
      bucket.lines += 1;
      bucket.invoices.add(row.invoice_id);
      bucket.cabangs.add(row.cabang);
    });
    return [...map.values()];
  }

  function filtered() {
    if (!state.brand) return DATA.slice();
    return DATA.filter((row) => row.brand === state.brand);
  }

  function showTip(event, html) {
    tip.hidden = false;
    tip.innerHTML = html;
    const pad = 14;
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    tip.style.left = "0px";
    tip.style.top = "0px";
    const rect = tip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function hideTip() {
    tip.hidden = true;
  }

  function fillBrand() {
    const select = document.getElementById("brand");
    const brands = [...new Set(DATA.map((row) => row.brand))].sort((a, b) => a.localeCompare(b));
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = "All brands";
    select.append(all);
    brands.forEach((brand) => {
      const option = document.createElement("option");
      option.value = brand;
      option.textContent = brand;
      select.append(option);
    });
    select.value = state.brand;
    select.addEventListener("change", () => {
      state.brand = select.value;
      render();
    });
  }

  function renderKpis(rows) {
    document.getElementById("kpi-revenue").textContent = formatRp(sum(rows, (row) => row.line_total));
    document.getElementById("kpi-invoices").textContent = formatInt(new Set(rows.map((row) => row.invoice_id)).size);
    document.getElementById("kpi-lines").textContent = formatInt(rows.length);
    document.getElementById("kpi-units").textContent = formatInt(sum(rows, (row) => row.quantity));
  }

  function renderTrend(rows) {
    const root = document.getElementById("trend");
    root.replaceChildren();
    const start = window.KIMIA_ORIGINAL.dateStart;
    const end = window.KIMIA_ORIGINAL.dateEnd;
    const byDay = new Map(group(rows, (row) => row.date).map((bucket) => [bucket.key, bucket]));
    const days = daysFrom(start, end);
    const maxVal = Math.max(1, ...days.map((day) => (byDay.get(day) || { lines: 0 }).lines));

    days.forEach((day) => {
      const bucket = byDay.get(day) || { lines: 0, quantity: 0, revenue: 0, invoices: new Set() };
      const wrap = document.createElement("div");
      wrap.className = "bar-wrap";
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = Math.max(2, (100 * bucket.lines) / maxVal) + "%";
      bar.tabIndex = 0;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = shortDay(day);
      const tipHtml =
        "<strong>" +
        formatDay(day) +
        "</strong><br>Angka penjualan: " +
        formatInt(bucket.lines) +
        "<br>Units: " +
        formatInt(bucket.quantity) +
        "<br>Revenue: Rp " +
        formatRp(bucket.revenue) +
        "<br>Invoices: " +
        formatInt(bucket.invoices.size || 0);
      bar.addEventListener("mousemove", (event) => showTip(event, tipHtml));
      bar.addEventListener("mouseleave", hideTip);
      bar.addEventListener("focus", (event) => showTip(event, tipHtml));
      bar.addEventListener("blur", hideTip);
      wrap.append(bar, label);
      root.append(wrap);
    });
  }

  function renderHBars(id, buckets, labelFn) {
    const root = document.getElementById(id);
    root.replaceChildren();
    const maxVal = Math.max(1, ...buckets.map((bucket) => bucket.lines));
    buckets.forEach((bucket) => {
      const row = document.createElement("div");
      row.className = "hbar";
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = labelFn(bucket);
      name.title = labelFn(bucket);
      const track = document.createElement("div");
      track.className = "track";
      const fill = document.createElement("div");
      fill.className = "fill";
      fill.style.width = (100 * bucket.lines) / maxVal + "%";
      fill.tabIndex = 0;
      const tipHtml =
        "<strong>" +
        labelFn(bucket) +
        "</strong><br>Angka penjualan: " +
        formatInt(bucket.lines) +
        "<br>Units: " +
        formatInt(bucket.quantity) +
        "<br>Revenue: Rp " +
        formatRp(bucket.revenue);
      fill.addEventListener("mousemove", (event) => showTip(event, tipHtml));
      fill.addEventListener("mouseleave", hideTip);
      fill.addEventListener("focus", (event) => showTip(event, tipHtml));
      fill.addEventListener("blur", hideTip);
      track.append(fill);
      row.append(name, track);
      root.append(row);
    });
  }

  function renderInvoices(rows) {
    const buckets = group(rows, (row) => row.invoice_id)
      .map((bucket) => ({
        invoice_id: bucket.key,
        customer_name: bucket.sample.customer_name,
        quantity: bucket.quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity || a.invoice_id.localeCompare(b.invoice_id))
      .slice(0, 5);
    const maxQty = Math.max(1, ...buckets.map((bucket) => bucket.quantity));
    const wrap = document.getElementById("invoices");
    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>ID Invoice</th><th>Customer</th><th>Number of Products</th></tr></thead>";
    const body = document.createElement("tbody");
    buckets.forEach((bucket) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        bucket.invoice_id +
        "</td><td>" +
        bucket.customer_name +
        '</td><td><div class="mini-bar"><div class="track"><div class="fill" style="width:' +
        (100 * bucket.quantity) / maxQty +
        '%"></div></div><span>' +
        formatInt(bucket.quantity) +
        "</span></div></td>";
      body.append(tr);
    });
    table.append(body);
    wrap.replaceChildren(table);
    document.getElementById("invoice-pager").textContent =
      buckets.length ? "1 - " + buckets.length + " / " + buckets.length : "0 / 0";
  }

  function renderRevenue(rows) {
    const buckets = group(rows, (row) => row.customer_name)
      .map((bucket) => ({
        customer_name: bucket.key,
        cabang: [...bucket.cabangs][0] || "",
        revenue: bucket.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue || a.customer_name.localeCompare(b.customer_name));
    const wrap = document.getElementById("revenue");
    const table = document.createElement("table");
    table.innerHTML = "<thead><tr><th>Customer</th><th>Cabang</th><th>Grand Total</th></tr></thead>";
    const body = document.createElement("tbody");
    buckets.forEach((bucket) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        bucket.customer_name +
        "</td><td>" +
        bucket.cabang +
        "</td><td>" +
        formatRp(bucket.revenue) +
        "</td>";
      body.append(tr);
    });
    table.append(body);
    wrap.replaceChildren(table);
    document.getElementById("revenue-pager").textContent =
      buckets.length ? "1 - " + buckets.length + " / " + buckets.length : "0 / 0";
  }

  function renderDonut(rows) {
    const svg = document.getElementById("donut");
    const legend = document.getElementById("unit-legend");
    svg.replaceChildren();
    legend.replaceChildren();
    const buckets = group(rows, (row) => row.unit).sort((a, b) => b.quantity - a.quantity);
    const total = sum(buckets, (bucket) => bucket.quantity) || 1;
    const cx = 80;
    const cy = 80;
    const radius = 58;
    const inner = 34;
    let angle = -Math.PI / 2;

    function arc(start, end, r) {
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const large = end - start > Math.PI ? 1 : 0;
      return "M " + x1 + " " + y1 + " A " + r + " " + r + " 0 " + large + " 1 " + x2 + " " + y2;
    }

    buckets.forEach((bucket) => {
      const slice = (2 * Math.PI * bucket.quantity) / total;
      const end = angle + slice;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const mid = angle + slice / 2;
      const labelR = (radius + inner) / 2;
      const lx = cx + labelR * Math.cos(mid);
      const ly = cy + labelR * Math.sin(mid);
      path.setAttribute(
        "d",
        arc(angle, end, radius) +
          " L " +
          (cx + inner * Math.cos(end)) +
          " " +
          (cy + inner * Math.sin(end)) +
          " A " +
          inner +
          " " +
          inner +
          " 0 " +
          (slice > Math.PI ? 1 : 0) +
          " 0 " +
          (cx + inner * Math.cos(angle)) +
          " " +
          (cy + inner * Math.sin(angle)) +
          " Z"
      );
      path.setAttribute("fill", UNIT_COLORS[bucket.key] || "#8a9bb3");
      const tipHtml =
        "<strong>" +
        bucket.key +
        "</strong><br>" +
        formatPct(bucket.quantity, total) +
        "<br>Angka penjualan: " +
        formatInt(bucket.quantity);
      path.addEventListener("mousemove", (event) => showTip(event, tipHtml));
      path.addEventListener("mouseleave", hideTip);
      svg.append(path);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", lx);
      text.setAttribute("y", ly);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#fff");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-weight", "700");
      text.textContent = formatPct(bucket.quantity, total);
      svg.append(text);

      const li = document.createElement("li");
      li.innerHTML =
        '<span class="dot" style="background:' +
        (UNIT_COLORS[bucket.key] || "#8a9bb3") +
        '"></span><span>' +
        bucket.key +
        "</span>";
      legend.append(li);
      angle = end;
    });
  }

  function render() {
    const rows = filtered();
    renderKpis(rows);
    renderTrend(rows);
    renderHBars(
      "customers",
      group(rows, (row) => row.customer_name).sort((a, b) => b.lines - a.lines || a.key.localeCompare(b.key)),
      (bucket) => bucket.key
    );
    renderHBars(
      "products",
      group(rows, (row) => row.product_name).sort((a, b) => b.lines - a.lines || a.key.localeCompare(b.key)),
      (bucket) => bucket.key
    );
    renderInvoices(rows);
    renderRevenue(rows);
    renderDonut(rows);
    document.getElementById("status").textContent =
      (state.brand ? "Brand " + state.brand + " · " : "All brands · ") +
      formatInt(rows.length) +
      " purchases · " +
      formatInt(new Set(rows.map((row) => row.invoice_id)).size) +
      " invoices · " +
      formatInt(sum(rows, (row) => row.quantity)) +
      " units · Rp " +
      formatRp(sum(rows, (row) => row.line_total));
  }

  fillBrand();
  render();
})();
