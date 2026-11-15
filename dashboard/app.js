(function () {
  const DATA = window.KIMIA && window.KIMIA.rows;
  if (!DATA) {
    document.body.textContent = "Missing dashboard/data.js. Run python3 scripts/rebuild_sales.py.";
    return;
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const KEYS = ["branch", "channel", "line", "unit", "customer", "product", "day"];
  const COLORS = {
    Tablet: "#1c4173",
    Bottle: "#4e6f9a",
    Box: "#a8b7cb",
    Capsule: "#eb6001",
    Ethical: "#1c4173",
    "OGB & PH": "#eb6001",
    SLCYL: "#4e6f9a",
    VNS: "#c4881a",
    Marcks: "#8a5a44",
  };

  const state = {
    branch: "",
    channel: "",
    line: "",
    unit: "",
    customer: "",
    product: "",
    day: "",
  };
  const view = { measure: "revenue", packaging: "unit" };
  const invoiceSort = { key: "quantity", dir: -1 };
  const customerSort = { key: "revenue", dir: -1 };
  const productName = new Map(DATA.map((row) => [row.product_id, row.product_name]));

  function formatInt(value) {
    const sign = value < 0 ? "-" : "";
    const digits = Math.round(Math.abs(value)).toString();
    return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function formatRp(value) {
    return "Rp " + formatInt(value);
  }

  function formatPct(part, whole) {
    if (!whole) return "0%";
    return ((100 * part) / whole).toFixed(1) + "%";
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-");
    return Number(day) + " " + MONTHS[Number(month) - 1] + " " + year;
  }

  function formatDay(iso) {
    const [, month, day] = iso.split("-");
    return Number(day) + " " + MONTHS[Number(month) - 1];
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

  function slug(value) {
    return String(value).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function unique(rows, pick) {
    return [...new Set(rows.map(pick))];
  }

  function sum(rows, pick) {
    return rows.reduce((total, row) => total + pick(row), 0);
  }

  function rowsFor(except) {
    return DATA.filter((row) => {
      if (state.branch && row.branch !== state.branch) return false;
      if (except !== "channel" && state.channel && row.channel !== state.channel) return false;
      if (except !== "line" && state.line && row.product_line !== state.line) return false;
      if (except !== "unit" && state.unit && row.unit !== state.unit) return false;
      if (except !== "customer" && state.customer && row.customer_name !== state.customer) return false;
      if (except !== "product" && state.product && row.product_id !== state.product) return false;
      if (except !== "day" && state.day && row.date !== state.day) return false;
      return true;
    });
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
          customers: new Set(),
          names: new Set(),
          branches: new Set(),
          channels: new Set(),
          dates: new Set(),
          sample: row,
        });
      }
      const bucket = map.get(key);
      bucket.revenue += row.line_total;
      bucket.quantity += row.quantity;
      bucket.lines += 1;
      bucket.invoices.add(row.invoice_id);
      bucket.customers.add(row.customer_id);
      bucket.names.add(row.customer_name);
      bucket.branches.add(row.branch);
      bucket.channels.add(row.channel);
      bucket.dates.add(row.date);
    });
    return [...map.values()];
  }

  function only(set) {
    return set.size === 1 ? [...set][0] : [...set].sort().join(", ");
  }

  function fillSelect(id, values, placeholder) {
    const select = document.getElementById(id);
    const current = state[id];
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = placeholder;
    select.append(all);
    values.sort((a, b) => a.localeCompare(b)).forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
    select.value = values.includes(current) ? current : "";
    if (select.value !== current) state[id] = select.value;
  }

  function syncUrl() {
    const params = new URLSearchParams();
    KEYS.forEach((key) => {
      if (state[key]) params.set(key, state[key]);
    });
    if (view.measure !== "revenue") params.set("measure", view.measure);
    if (view.packaging !== "unit") params.set("pack", view.packaging);
    const query = params.toString();
    const next = query ? location.pathname + "?" + query : location.pathname;
    if (location.pathname + location.search !== next) history.replaceState(null, "", next);
  }

  function toggle(key, value) {
    state[key] = state[key] === value ? "" : value;
    draw();
  }

  function empty(text) {
    const note = document.createElement("p");
    note.className = "empty";
    note.textContent = text;
    return note;
  }

  function renderChips() {
    const host = document.getElementById("chips");
    host.replaceChildren();
    const items = [];
    if (state.customer) items.push(["customer", "Outlet", state.customer]);
    if (state.product) items.push(["product", "Product", productName.get(state.product) || state.product]);
    if (state.day) items.push(["day", "Day", formatDate(state.day)]);
    items.forEach(([key, label, value]) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.append(label + ": " + value);
      const button = document.createElement("button");
      button.type = "button";
      button.id = "chip-" + key;
      button.textContent = "×";
      button.setAttribute("aria-label", "Clear " + label.toLowerCase() + " filter");
      button.addEventListener("click", () => {
        state[key] = "";
        draw();
      });
      chip.append(button);
      host.append(chip);
    });
  }

  function renderBars(host, buckets, options) {
    host.replaceChildren();
    if (!buckets.length) {
      host.append(empty("Nothing to show in this filter."));
      return;
    }
    const max = Math.max(...buckets.map((bucket) => bucket[options.measure]));
    const list = document.createElement("div");
    list.className = "hlist";
    buckets.forEach((bucket) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hrow";
      button.id = options.id(bucket);
      const selected = options.selected(bucket);
      if (selected) button.classList.add("is-on");
      if (options.dim && options.dim() && !selected) button.classList.add("is-dim");
      button.setAttribute("aria-pressed", String(selected));
      const name = document.createElement("span");
      name.className = "hname";
      name.textContent = options.name(bucket);
      const value = document.createElement("span");
      value.className = "hvalue";
      value.textContent = options.value(bucket);
      const meta = document.createElement("span");
      meta.className = "hmeta";
      meta.textContent = options.meta(bucket);
      const track = document.createElement("span");
      track.className = "track";
      const fill = document.createElement("span");
      fill.className = "fill";
      fill.style.setProperty("--w", (max ? (100 * bucket[options.measure]) / max : 0) + "%");
      if (options.fill) fill.style.background = options.fill(bucket);
      track.append(fill);
      button.append(name, value, meta, track);
      button.addEventListener("click", () => options.onClick(bucket));
      list.append(button);
    });
    host.append(list);
  }

  function renderTrend(rows) {
    const host = document.getElementById("trend");
    host.replaceChildren();
    if (!rows.length) {
      host.classList.add("is-empty");
      host.append(empty("Nothing to show in this filter."));
      return;
    }
    host.classList.remove("is-empty");
    const byDay = new Map(group(rows, (row) => row.date).map((bucket) => [bucket.key, bucket]));
    const dates = [...byDay.keys()].sort();
    const span = daysFrom(dates[0], dates[dates.length - 1]);
    const max = Math.max(...[...byDay.values()].map((bucket) => bucket.revenue));
    const peak = [...byDay.values()].sort((a, b) => b.revenue - a.revenue)[0].key;
    span.forEach((iso) => {
      const bucket = byDay.get(iso);
      if (!bucket) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "day is-empty";
        emptyDay.title = formatDate(iso) + ", no invoices";
        emptyDay.append(Object.assign(document.createElement("span"), { className: "day-bar" }));
        const label = document.createElement("span");
        label.className = "day-label";
        label.textContent = formatDay(iso);
        emptyDay.append(label);
        host.append(emptyDay);
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "day";
      button.id = "day-" + iso;
      if (iso === peak) button.classList.add("is-peak");
      if (state.day === iso) button.classList.add("is-on");
      if (state.day && state.day !== iso) button.classList.add("is-dim");
      button.setAttribute("aria-pressed", String(state.day === iso));
      button.setAttribute("aria-label", formatDate(iso) + ", " + formatRp(bucket.revenue));
      const bar = document.createElement("span");
      bar.className = "day-bar";
      bar.style.height = Math.max(4, Math.round((188 * bucket.revenue) / max)) + "px";
      const label = document.createElement("span");
      label.className = "day-label";
      label.textContent = formatDay(iso);
      button.append(bar, label);
      button.addEventListener("click", () => toggle("day", iso));
      host.append(button);
    });
  }

  function renderChannel(rows) {
    const bar = document.getElementById("channel-bar");
    const legend = document.getElementById("channel-legend");
    bar.replaceChildren();
    legend.replaceChildren();
    const total = sum(rows, (row) => row.line_total);
    ["Pharmacy", "Clinic"].forEach((channel) => {
      const revenue = sum(rows.filter((row) => row.channel === channel), (row) => row.line_total);
      if (!revenue) return;
      const segment = document.createElement("span");
      segment.className = channel.toLowerCase();
      segment.style.width = (total ? (100 * revenue) / total : 0) + "%";
      segment.title = channel + " " + formatRp(revenue);
      bar.append(segment);
      const label = document.createElement("span");
      label.textContent = channel + " " + formatRp(revenue) + " · " + formatPct(revenue, total);
      legend.append(label);
    });
    if (!bar.childElementCount) legend.textContent = "No channel split in this filter.";
  }

  function renderDonut(rows) {
    const svg = document.getElementById("donut");
    const legend = document.getElementById("legend");
    svg.replaceChildren();
    legend.replaceChildren();
    const field = view.packaging === "master" ? "master_packaging" : "unit";
    const measure = view.measure;
    const buckets = group(rows, (row) => row[field])
      .map((bucket) => ({
        key: bucket.key,
        value: measure === "revenue" ? bucket.revenue : measure === "units" ? bucket.quantity : bucket.lines,
      }))
      .filter((bucket) => bucket.value > 0)
      .sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
    const total = buckets.reduce((summed, bucket) => summed + bucket.value, 0);
    const caption = measure === "revenue" ? "Revenue" : measure === "units" ? "Units" : "Lines";
    svg.setAttribute(
      "aria-label",
      total
        ? "Packaging mix by " + caption.toLowerCase() + ". " + buckets.map((bucket) => bucket.key + " " + formatPct(bucket.value, total)).join(", ")
        : "Packaging mix, no sales in this filter"
    );
    document.getElementById("donut-caption").textContent = total ? buckets[0].key : caption;
    document.getElementById("donut-value").textContent = total ? formatPct(buckets[0].value, total) : "–";
    document.getElementById("pack-hint").textContent =
      view.packaging === "master"
        ? "Master packaging moves tramadol and tetracycline into Capsule. The sales file recorded both as Tablet."
        : "Unit sold is the unit written on the invoice. The old pie’s 37.9% is Bottle’s share of sale lines.";

    if (!total) {
      legend.append(empty("Nothing to show in this filter."));
      return;
    }

    const radius = 58;
    const circ = 2 * Math.PI * radius;
    const gap = buckets.length > 1 ? 1.6 : 0;
    let offset = 0;
    const ns = "http://www.w3.org/2000/svg";
    buckets.forEach((bucket) => {
      const len = Math.max((bucket.value / total) * circ - gap, 0);
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
      offset += len + gap;

      const item = document.createElement("li");
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = COLORS[bucket.key] || "#60756b";
      const name = document.createElement("span");
      name.textContent = bucket.key + " · " + formatPct(bucket.value, total);
      const amount = document.createElement("b");
      amount.textContent = measure === "revenue" ? formatRp(bucket.value) : formatInt(bucket.value);
      item.append(swatch, name, amount);
      legend.append(item);
    });
  }

  function renderTable(host, columns, records, sort, rowId) {
    host.replaceChildren();
    if (!records.length) {
      host.append(empty("Nothing to show in this filter."));
      return;
    }
    const sorted = records.slice().sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number" && av !== bv) return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach((column) => {
      const th = document.createElement("th");
      if (column.numeric) th.className = "num";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = column.label + (sort.key === column.key ? (sort.dir < 0 ? " ↓" : " ↑") : "");
      button.addEventListener("click", () => {
        if (sort.key === column.key) sort.dir *= -1;
        else {
          sort.key = column.key;
          sort.dir = column.numeric ? -1 : 1;
        }
        draw();
      });
      th.append(button);
      headRow.append(th);
    });
    thead.append(headRow);
    const tbody = document.createElement("tbody");
    sorted.forEach((record) => {
      const tr = document.createElement("tr");
      if (rowId && rowId(record)) tr.classList.add("is-max");
      columns.forEach((column) => {
        const td = document.createElement("td");
        if (column.numeric) td.className = "num";
        const content = column.cell(record);
        td.append(content instanceof Node ? content : document.createTextNode(content));
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    host.append(table);
  }

  function answers(rows) {
    const trend = document.getElementById("answer-trend");
    const customer = document.getElementById("answer-customer");
    const product = document.getElementById("answer-product");
    const invoice = document.getElementById("answer-invoice");
    if (!rows.length) {
      const none = "No sales match these filters.";
      trend.textContent = none;
      customer.textContent = none;
      product.textContent = none;
      invoice.textContent = none;
      return;
    }
    const total = sum(rows, (row) => row.line_total);
    const days = group(rows, (row) => row.date).sort((a, b) => b.revenue - a.revenue);
    const topDay = days[0];
    const sortedDates = days.map((day) => day.key).sort();
    const span = daysFrom(sortedDates[0], sortedDates[sortedDates.length - 1]);
    const present = new Set(days.map((day) => day.key));
    const missing = span.filter((iso) => !present.has(iso));
    let trendText = "The strongest day in this view is " + formatDate(topDay.key) + " at " + formatRp(topDay.revenue) + ".";
    const unfiltered = KEYS.every((key) => !state[key]);
    if (days.length === 1) {
      trendText = "Every sale in this view falls on " + formatDate(topDay.key) + ", " + formatRp(topDay.revenue) + ".";
    } else if (unfiltered && missing.length && missing.length <= 4) {
      trendText += " No invoices on " + missing.map(formatDay).join(", ") + ".";
    }
    trend.textContent = trendText;

    const outlets = group(rows, (row) => row.customer_name).sort((a, b) => b.revenue - a.revenue);
    const topOutlet = outlets[0];
    customer.textContent =
      topOutlet.key +
      " in " +
      only(topOutlet.branches) +
      " leads with " +
      formatRp(topOutlet.revenue) +
      ", " +
      formatPct(topOutlet.revenue, total) +
      " of this view, across " +
      topOutlet.customers.size +
      (topOutlet.customers.size === 1 ? " customer id." : " customer ids.");

    const products = group(rows, (row) => row.product_id).sort((a, b) => b.revenue - a.revenue);
    const topProduct = products[0];
    product.textContent =
      topProduct.sample.product_name +
      " (" +
      topProduct.sample.product_line +
      ") leads with " +
      formatRp(topProduct.revenue) +
      " from " +
      formatInt(topProduct.quantity) +
      " units.";

    const invoices = group(rows, (row) => row.invoice_id).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    const topInvoice = invoices[0];
    invoice.textContent =
      topInvoice.key +
      " for " +
      only(topInvoice.names) +
      " moves " +
      formatInt(topInvoice.quantity) +
      " units on " +
      formatDate([...topInvoice.dates].sort()[0]) +
      ", " +
      formatRp(topInvoice.revenue) +
      ".";
  }

  function draw() {
    const focusId = document.activeElement && document.activeElement.id;
    ["branch", "channel", "line", "unit"].forEach((id) => {
      document.getElementById(id).value = state[id];
    });
    const rows = rowsFor(null);
    const revenue = sum(rows, (row) => row.line_total);
    const invoices = new Set(rows.map((row) => row.invoice_id));
    document.getElementById("kpi-revenue").textContent = rows.length ? formatRp(revenue) : "–";
    document.getElementById("kpi-invoices").textContent = rows.length ? formatInt(invoices.size) : "–";
    document.getElementById("kpi-units").textContent = rows.length ? formatInt(sum(rows, (row) => row.quantity)) : "–";
    document.getElementById("kpi-lines").textContent = rows.length ? formatInt(rows.length) : "–";
    document.getElementById("status").textContent = rows.length
      ? "Showing " + formatInt(rows.length) + " sale lines across " + formatInt(invoices.size) + " invoices."
      : "No sale lines match these filters.";

    renderChips();
    renderChannel(rows);
    answers(rows);
    renderTrend(rowsFor("day"));

    const outlets = group(rowsFor("customer"), (row) => row.customer_name).sort((a, b) => b.revenue - a.revenue);
    renderBars(document.getElementById("customers"), outlets, {
      measure: "revenue",
      id: (bucket) => "customer-" + slug(bucket.key),
      selected: (bucket) => state.customer === bucket.key,
      dim: () => Boolean(state.customer),
      name: (bucket) => bucket.key,
      value: (bucket) => formatRp(bucket.revenue),
      meta: (bucket) => only(bucket.branches) + " · " + formatInt(bucket.quantity) + " units",
      onClick: (bucket) => toggle("customer", bucket.key),
    });

    const products = group(rowsFor("product"), (row) => row.product_id).sort((a, b) => b.revenue - a.revenue);
    renderBars(document.getElementById("products"), products, {
      measure: "revenue",
      id: (bucket) => "product-" + slug(bucket.key),
      selected: (bucket) => state.product === bucket.key,
      dim: () => Boolean(state.product),
      name: (bucket) => bucket.sample.product_name,
      value: (bucket) => formatRp(bucket.revenue),
      meta: (bucket) => bucket.sample.product_line + " · " + formatInt(bucket.quantity) + " units",
      onClick: (bucket) => toggle("product", bucket.key),
    });

    renderDonut(rows);
    const lines = group(rowsFor("line"), (row) => row.product_line).sort((a, b) => b.revenue - a.revenue);
    const lineTotal = sum(rowsFor("line"), (row) => row.line_total);
    renderBars(document.getElementById("lines"), lines, {
      measure: "revenue",
      id: (bucket) => "line-" + slug(bucket.key),
      selected: (bucket) => state.line === bucket.key,
      dim: () => Boolean(state.line),
      name: (bucket) => bucket.key,
      value: (bucket) => formatRp(bucket.revenue),
      meta: (bucket) => formatInt(bucket.quantity) + " units · " + formatPct(bucket.revenue, lineTotal),
      fill: () => "#1c4173",
      onClick: (bucket) => toggle("line", bucket.key),
    });

    const invoiceRows = group(rows, (row) => row.invoice_id).map((bucket) => ({
      invoice_id: bucket.key,
      customer_name: only(bucket.names),
      branch: only(bucket.branches),
      date: [...bucket.dates].sort()[0],
      lines: bucket.lines,
      quantity: bucket.quantity,
      revenue: bucket.revenue,
    }));
    const maxUnits = invoiceRows.reduce((max, row) => Math.max(max, row.quantity), 0);
    renderTable(
      document.getElementById("invoices"),
      [
        {
          key: "invoice_id",
          label: "Invoice",
          cell: (row) => {
            const wrap = document.createElement("span");
            wrap.textContent = row.invoice_id;
            if (row.quantity === maxUnits) {
              const badge = document.createElement("span");
              badge.className = "badge";
              badge.textContent = "Most units";
              wrap.append(badge);
            }
            return wrap;
          },
        },
        {
          key: "customer_name",
          label: "Customer",
          cell: (row) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "linkish";
            button.textContent = row.customer_name;
            button.addEventListener("click", () => toggle("customer", row.customer_name));
            return button;
          },
        },
        { key: "branch", label: "Branch", cell: (row) => row.branch },
        { key: "date", label: "Date", cell: (row) => formatDate(row.date) },
        { key: "lines", label: "Lines", numeric: true, cell: (row) => formatInt(row.lines) },
        { key: "quantity", label: "Units", numeric: true, cell: (row) => formatInt(row.quantity) },
        { key: "revenue", label: "Revenue", numeric: true, cell: (row) => formatRp(row.revenue) },
      ],
      invoiceRows,
      invoiceSort,
      (row) => row.quantity === maxUnits
    );

    const customerRows = group(rows, (row) => row.customer_name).map((bucket) => ({
      customer_name: bucket.key,
      branch: only(bucket.branches),
      channel: only(bucket.channels),
      ids: bucket.customers.size,
      invoices: bucket.invoices.size,
      quantity: bucket.quantity,
      revenue: bucket.revenue,
    }));
    renderTable(
      document.getElementById("customer-table"),
      [
        {
          key: "customer_name",
          label: "Customer",
          cell: (row) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "linkish";
            button.textContent = row.customer_name;
            button.addEventListener("click", () => toggle("customer", row.customer_name));
            return button;
          },
        },
        { key: "branch", label: "Branch", cell: (row) => row.branch },
        { key: "channel", label: "Channel", cell: (row) => row.channel },
        { key: "ids", label: "IDs", numeric: true, cell: (row) => formatInt(row.ids) },
        { key: "invoices", label: "Invoices", numeric: true, cell: (row) => formatInt(row.invoices) },
        { key: "quantity", label: "Units", numeric: true, cell: (row) => formatInt(row.quantity) },
        { key: "revenue", label: "Revenue", numeric: true, cell: (row) => formatRp(row.revenue) },
      ],
      customerRows,
      customerSort
    );

    document.getElementById("foot-note").textContent =
      "Built from " +
      formatInt(DATA.length) +
      " sale lines in data/sales.csv, data/customers.csv, and data/products.csv. " +
      formatDate(window.KIMIA.dateStart) +
      " to " +
      formatDate(window.KIMIA.dateEnd) +
      ".";
    syncUrl();
    if (focusId) {
      const next = document.getElementById(focusId);
      if (next) next.focus();
    }
  }

  function reset() {
    KEYS.forEach((key) => {
      state[key] = "";
    });
    draw();
  }

  fillSelect("branch", unique(DATA, (row) => row.branch), "All branches");
  fillSelect("channel", unique(DATA, (row) => row.channel), "All channels");
  fillSelect("line", unique(DATA, (row) => row.product_line), "All product lines");
  fillSelect("unit", unique(DATA, (row) => row.unit), "All units");

  const params = new URLSearchParams(location.search);
  KEYS.forEach((key) => {
    if (params.has(key)) state[key] = params.get(key);
  });
  if (["units", "lines", "revenue"].includes(params.get("measure"))) view.measure = params.get("measure");
  if (["master", "unit"].includes(params.get("pack"))) view.packaging = params.get("pack");
  document.querySelectorAll("[data-measure]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-measure") === view.measure));
  });
  document.querySelectorAll("[data-pack]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.getAttribute("data-pack") === view.packaging));
  });

  ["branch", "channel", "line", "unit"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (event) => {
      state[id] = event.target.value;
      draw();
    });
  });
  document.getElementById("reset").addEventListener("click", reset);
  document.getElementById("filters").addEventListener("submit", (event) => event.preventDefault());
  document.querySelectorAll("[data-measure]").forEach((button) => {
    button.addEventListener("click", () => {
      view.measure = button.getAttribute("data-measure");
      document.querySelectorAll("[data-measure]").forEach((peer) => {
        peer.setAttribute("aria-pressed", String(peer === button));
      });
      draw();
    });
  });
  document.querySelectorAll("[data-pack]").forEach((button) => {
    button.addEventListener("click", () => {
      view.packaging = button.getAttribute("data-pack");
      document.querySelectorAll("[data-pack]").forEach((peer) => {
        peer.setAttribute("aria-pressed", String(peer === button));
      });
      draw();
    });
  });

  draw();
})();
