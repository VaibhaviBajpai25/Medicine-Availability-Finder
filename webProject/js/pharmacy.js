(function () {
  "use strict";
  var api = window.MediFinder;
  var message = document.getElementById("dashboard-message");
  var inventoryForm = document.getElementById("inventory-form");
  var dashboard = null;

  initialize();

  inventoryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    clearMessage();
    if (!inventoryForm.reportValidity()) return;
    var formData = new FormData(inventoryForm);
    try {
      await api.request("/api/pharmacy/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: String(formData.get("name")).trim(),
          manufacturer: String(formData.get("manufacturer")).trim(),
          category: String(formData.get("category")),
          price: Number(formData.get("price")),
          quantity: Number(formData.get("quantity"))
        })
      });
      inventoryForm.reset();
      await loadDashboard();
      showMessage("Medicine added to your inventory.", true);
    } catch (error) {
      showMessage(error.message);
    }
  });

  document.getElementById("inventory-rows").addEventListener("submit", async function (event) {
    var stockForm = event.target.closest("[data-stock-form]");
    if (!stockForm) return;
    event.preventDefault();
    var formData = new FormData(stockForm);
    var submitButton = stockForm.querySelector("button");
    submitButton.disabled = true;
    clearMessage();
    try {
      await api.request("/api/pharmacy/inventory/" + encodeURIComponent(stockForm.getAttribute("data-stock-form")) + "/stock", {
        method: "PATCH",
        body: JSON.stringify({
          action: String(formData.get("action")),
          quantity: Number(formData.get("quantity")),
          note: String(formData.get("note") || "")
        })
      });
      await loadDashboard();
      showMessage("Stock updated and recorded in your history.", true);
    } catch (error) {
      submitButton.disabled = false;
      showMessage(error.message);
    }
  });

  async function initialize() {
    try {
      var result = await api.request("/api/auth/me");
      if (!result.user) {
        window.location.href = "login.html";
        return;
      }
      if (result.user.role !== "pharmacy") {
        window.location.href = result.user.role === "user" ? "index.html" : "login.html";
        return;
      }
      await loadDashboard();
    } catch (error) {
      showMessage(error.message);
    }
  }

  async function loadDashboard() {
    dashboard = await api.request("/api/pharmacy/dashboard");
    renderDashboard();
  }

  function renderDashboard() {
    var pharmacy = dashboard.pharmacy;
    var stats = dashboard.stats;
    var status = document.getElementById("approval-status");
    document.getElementById("pharmacy-name").textContent = pharmacy.name;
    document.getElementById("pharmacy-location").textContent = pharmacy.address + " · PIN " + pharmacy.pin;
    status.textContent = pharmacy.status === "pending" ? "Pending review" :
      pharmacy.status === "approved" ? "Approved" : "Rejected";
    status.className = "approval-badge " + pharmacy.status;
    document.getElementById("stat-medicines").textContent = stats.medicineCount;
    document.getElementById("stat-units").textContent = stats.totalUnits;
    document.getElementById("stat-supplied").textContent = stats.totalSupplied;

    var notice = document.getElementById("approval-notice");
    var approvalMessage = document.getElementById("approval-message");
    notice.hidden = pharmacy.status === "approved";
    if (pharmacy.status === "pending") {
      approvalMessage.textContent = "Your pharmacy account is awaiting administrator approval. You can prepare inventory now; it will stay private until approved.";
    } else if (pharmacy.status === "rejected") {
      approvalMessage.textContent = "Your pharmacy application was not approved. Inventory remains private. Contact the Medi Finder administrator for next steps.";
      inventoryForm.querySelectorAll("input, select, button").forEach(function (control) { control.disabled = true; });
    }
    renderInventory();
    renderHistory();
  }

  function renderInventory() {
    var rows = document.getElementById("inventory-rows");
    document.getElementById("inventory-count").textContent = dashboard.items.length +
      (dashboard.items.length === 1 ? " medicine" : " medicines");
    if (!dashboard.items.length) {
      rows.innerHTML = '<tr><td colspan="5" class="table-empty">Add your first medicine to start tracking stock.</td></tr>';
      return;
    }
    rows.innerHTML = dashboard.items.map(function (item) {
      return '<tr><td><strong>' + api.escapeHtml(item.name) + '</strong><small>' + api.escapeHtml(item.manufacturer) + '</small></td>' +
        '<td>' + api.escapeHtml(item.category) + '</td><td>' + api.formatPrice(item.price) + '</td><td><strong>' + item.quantity + '</strong></td>' +
        '<td><form class="stock-update-form" data-stock-form="' + api.escapeHtml(item.id) + '"><select name="action" aria-label="Stock action"><option value="restock">Add stock</option><option value="adjustment">Remove stock</option></select><input name="quantity" type="number" min="1" max="1000000" step="1" aria-label="Stock quantity" placeholder="Units" required><input name="note" type="text" maxlength="160" aria-label="Stock update note" placeholder="Note"><button type="submit">Update</button></form></td></tr>';
    }).join("");
  }

  function renderHistory() {
    var list = document.getElementById("stock-history");
    var history = dashboard.history;
    document.getElementById("history-count").textContent = history.length +
      (history.length === 1 ? " update" : " updates");
    if (!history.length) {
      list.innerHTML = '<p class="list-empty">Stock additions and adjustments will appear here.</p>';
      return;
    }
    list.innerHTML = history.map(function (entry) {
      var sign = entry.change > 0 ? "+" : "";
      var date = new Date(entry.createdAt).toLocaleString();
      return '<div class="stock-event"><span class="stock-event-icon' + (entry.change < 0 ? " adjustment" : "") + '" aria-hidden="true">' + (entry.change < 0 ? "−" : "↗") + '</span>' +
        '<div class="stock-event-copy"><strong>' + api.escapeHtml(entry.medicine) + '</strong><span>' + (entry.action === "restock" ? "Stock added" : "Stock adjusted") + ' · ' + api.escapeHtml(entry.note || date) + '</span></div>' +
        '<span class="stock-event-change' + (entry.change < 0 ? " negative" : "") + '">' + sign + entry.change + '</span></div>';
    }).join("");
  }

  function showMessage(text, success) {
    message.textContent = text;
    message.classList.toggle("success", Boolean(success));
  }

  function clearMessage() {
    message.textContent = "";
    message.classList.remove("success");
  }
}());
