(function () {
  "use strict";
  var api = window.MediFinder;
  var loginCard = document.getElementById("admin-login-card");
  var queue = document.getElementById("admin-queue");
  var applications = document.getElementById("admin-applications");
  var loginMessage = document.getElementById("admin-login-message");
  var queueMessage = document.getElementById("admin-queue-message");

  initialize();

  document.getElementById("admin-login-form").addEventListener("submit", async function (event) {
    event.preventDefault();
    clear(loginMessage);
    var form = event.currentTarget;
    if (!form.reportValidity()) return;
    try {
      await api.request("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("admin-email").value.trim().toLowerCase(),
          password: document.getElementById("admin-password").value
        })
      });
      await showQueue();
    } catch (error) {
      show(loginMessage, error.message);
    }
  });

  document.getElementById("admin-logout").addEventListener("click", async function () {
    try {
      await api.request("/api/auth/logout", { method: "POST" });
      queue.hidden = true;
      loginCard.hidden = false;
      document.getElementById("admin-password").value = "";
    } catch (error) {
      show(queueMessage, error.message);
    }
  });

  applications.addEventListener("click", async function (event) {
    var button = event.target.closest("[data-decision]");
    if (!button) return;
    button.disabled = true;
    clear(queueMessage);
    try {
      await api.request("/api/admin/pharmacies/" + encodeURIComponent(button.getAttribute("data-pharmacy-id")), {
        method: "PATCH",
        body: JSON.stringify({ status: button.getAttribute("data-decision") })
      });
      await showQueue();
    } catch (error) {
      button.disabled = false;
      show(queueMessage, error.message);
    }
  });

  async function initialize() {
    try {
      var result = await api.request("/api/admin/pharmacies");
      if (result.pharmacies) {
        await showQueue(result);
      }
    } catch (error) {
      if (error.status !== 401) show(loginMessage, error.message);
    }
  }

  async function showQueue(result) {
    var data = result || await api.request("/api/admin/pharmacies");
    loginCard.hidden = true;
    queue.hidden = false;
    clear(queueMessage);
    if (!data.pharmacies.length) {
      applications.innerHTML = '<p class="list-empty">There are no pharmacy applications waiting for review.</p>';
      return;
    }
    applications.innerHTML = data.pharmacies.map(function (pharmacy) {
      return '<article class="admin-application"><div class="admin-application-header"><div><h3>' + api.escapeHtml(pharmacy.name) + '</h3><p>Application from ' + api.escapeHtml(pharmacy.owner) + ' · ' + new Date(pharmacy.createdAt).toLocaleDateString() + '</p></div><span class="approval-badge">Pending review</span></div>' +
        '<div class="application-details"><span><strong>License / registration</strong>' + api.escapeHtml(pharmacy.licenseNumber) + '</span><span><strong>Contact</strong>' + api.escapeHtml(pharmacy.email) + ' · ' + api.escapeHtml(pharmacy.phone) + '</span><span><strong>Address</strong>' + api.escapeHtml(pharmacy.address) + '</span><span><strong>PIN code</strong>' + api.escapeHtml(pharmacy.pin) + '</span></div>' +
        '<div class="application-actions"><button class="button button-primary" type="button" data-pharmacy-id="' + api.escapeHtml(pharmacy.id) + '" data-decision="approved">Approve pharmacy</button><button class="button button-danger" type="button" data-pharmacy-id="' + api.escapeHtml(pharmacy.id) + '" data-decision="rejected">Reject</button></div></article>';
    }).join("");
  }

  function show(element, text) {
    element.textContent = text;
  }

  function clear(element) {
    element.textContent = "";
  }
}());
