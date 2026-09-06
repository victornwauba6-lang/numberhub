async function checkBackend() {
  try {
    const response = await fetch("https://numberhub.onrender.com/api/status");
    const data = await response.json();

    console.log("NumberHub backend:", data);

    if (data.status === "online") {
      console.log("✅ Backend connected successfully");
    }
  } catch (error) {
    console.error("❌ Backend connection failed:", error);
  }
}

checkBackend();

function toggleUSA() {
  const servers = document.getElementById("usaServers");
  if (!servers) return;

  const isHidden = servers.style.display === "none";
  servers.style.display = isHidden ? "grid" : "none";
}

function selectUSA(serverName, card) {
  document.querySelectorAll(".usa-server").forEach(item => {
    item.classList.remove("selected");
  });

  card.classList.add("selected");

  window.selectedNumberType = "usa";
  window.selectedServer = serverName;

  const selected = document.getElementById("selectedServer");
  if (selected) {
    selected.innerHTML = `<span>✓ ${serverName} selected</span>`;
  }
}

/* ===== NumberHub Country & Service Search ===== */

function setupServiceAutocomplete() {
  const input = document.getElementById("serviceSearch");
  const results = document.getElementById("serviceResults");
  const select = document.getElementById("numberService");

  if (!input || !results || !select) return;

  function render(query = "") {
    if (input.disabled) return;

    const q = query.trim().toLowerCase();

    const services = Array.isArray(window.numberHubServices)
      ? window.numberHubServices
      : Array.from(select.options)
          .filter(option => option.value)
          .map(option => ({
            value: option.value,
            label: option.textContent.trim(),
            price: option.dataset.price || "0",
            stock: option.dataset.stock || "0"
          }));

    const matches = services
      .filter(item => {
        const label = String(item.label || "").toLowerCase();
        const value = String(item.value || "").toLowerCase();

        return !q ||
          label.includes(q) ||
          value.includes(q);
      })
      .slice(0, 50);

    if (!matches.length) {
      results.innerHTML =
        '<div style="padding:14px;color:#64748b;">No matching service found</div>';
      results.style.display = "block";
      return;
    }

    results.innerHTML = matches.map(item => `
      <button
        type="button"
        data-service="${item.value.replace(/"/g, "&quot;")}"
        style="
          display:block;
          width:100%;
          padding:13px 14px;
          border:0;
          border-bottom:1px solid #f1f5f9;
          background:#fff;
          text-align:left;
          cursor:pointer;
          font-size:14px;
        "
      >
        <div style="font-weight:800;">${item.label}</div>
        <div style="font-size:12px;color:#64748b;margin-top:3px;">
          ${Number(item.stock).toLocaleString()} available
        </div>
      </button>
    `).join("");

    results.style.display = "block";
  }

  input.onfocus = () => {
    if (Array.isArray(window.numberHubServices) && window.numberHubServices.length) {
      render(input.value);
    }
  };

  input.oninput = () => {
    const services = Array.isArray(window.numberHubServices)
      ? window.numberHubServices
      : [];

    const q = input.value.trim().toLowerCase();

    const matches = services
      .filter(item => {
        const label = String(item.label || "").toLowerCase();
        const value = String(item.value || "").toLowerCase();
        return !q || label.includes(q) || value.includes(q);
      })
      .slice(0, 50);

    if (!matches.length) {
      results.innerHTML =
        '<div style="padding:14px;color:#64748b;">No matching service found</div>';
      results.style.display = "block";
      return;
    }

    results.innerHTML = matches.map(item => `
      <button
        type="button"
        data-service="${item.value.replace(/"/g, "&quot;")}"
        style="
          display:block;
          width:100%;
          padding:13px 14px;
          border:0;
          border-bottom:1px solid #f1f5f9;
          background:#fff;
          text-align:left;
          cursor:pointer;
          font-size:14px;
        "
      >
        <div style="font-weight:800;">${item.label}</div>
        <div style="font-size:12px;color:#64748b;margin-top:3px;">
          ${Number(item.stock).toLocaleString()} available
        </div>
      </button>
    `).join("");

    results.style.display = "block";
  };

  results.onclick = event => {
    const button = event.target.closest("[data-service]");
    if (!button) return;

    const value = button.dataset.service;

    select.value = value;
    input.value = button.querySelector("div")?.textContent.trim() || value;
    results.style.display = "none";

    window.selectedService = value;

    const serviceText =
      document.getElementById("serviceSelectorText");

    if (serviceText) {
      serviceText.textContent = "✓ " + input.value;
    }

    if (typeof updateNumberPurchaseState === "function") {
      updateNumberPurchaseState();
    }
  };
}

async function populateNumberServices() {
  const country = document.getElementById("numberCountry");
  const service = document.getElementById("numberService");
  const serviceSearch = document.getElementById("serviceSearch");
  const serviceResults = document.getElementById("serviceResults");

  if (!country || !service) return;

  if (!country.value) {
    service.innerHTML = '<option value="">Select country first</option>';
    if (serviceSearch) serviceSearch.disabled = true;
    if (serviceResults) {
      serviceResults.innerHTML = "";
      serviceResults.style.display = "none";
    }
    return;
  }

  service.disabled = true;

  if (serviceSearch) {
    serviceSearch.disabled = true;
    serviceSearch.value = "";
  }

  if (serviceResults) {
    serviceResults.innerHTML =
      '<div style="padding:14px;color:#64748b;">Loading services...</div>';
    serviceResults.style.display = "block";
  }

  try {
    const response = await fetch(
      "https://numberhub.onrender.com/api/numbers/services?country=" +
      encodeURIComponent(country.value)
    );

    const result = await response.json();

    if (!response.ok || !Array.isArray(result.services)) {
      throw new Error(result.error || "Unable to load services");
    }

    window.numberHubServices = result.services.map(item => ({
      value: String(item.product || ""),
      label: String(item.product || "").toUpperCase(),
      price: Number(item.customerPrice || 0),
      stock: Number(item.available || 0)
    }));

    service.innerHTML =
      '<option value="">Select a service</option>' +
      result.services.map(item => {
        const name = String(item.product || "");
        const stock = Number(item.available || 0);
        const price = Number(item.customerPrice || 0);

        return `<option value="${name}" data-stock="${stock}" data-price="${price}">
          ${name.toUpperCase()} — ${stock.toLocaleString()} available
        </option>`;
      }).join("");

    if (serviceSearch && serviceResults) {
      serviceSearch.disabled = false;
      serviceSearch.placeholder = "🔎 Search service...";

      serviceResults.innerHTML = window.numberHubServices
        .slice(0, 50)
        .map(item => `
          <button
            type="button"
            data-service="${item.value.replace(/"/g, "&quot;")}"
            style="
              display:block;
              width:100%;
              padding:13px 14px;
              border:0;
              border-bottom:1px solid #f1f5f9;
              background:#fff;
              text-align:left;
              cursor:pointer;
              font-size:14px;
            "
          >
            <div style="font-weight:800;">${item.label}</div>
            <div style="font-size:12px;color:#64748b;margin-top:3px;">
              ${item.stock.toLocaleString()} available
            </div>
          </button>
        `).join("");

      serviceResults.style.display =
        window.numberHubServices.length ? "block" : "none";
    }

    setupServiceAutocomplete();

  } catch (error) {
    console.error("Service loading error:", error);

    window.numberHubServices = [];

    service.innerHTML =
      '<option value="">Unable to load services</option>';

    if (serviceSearch) {
      serviceSearch.disabled = true;
      serviceSearch.value = "";
    }

    if (serviceResults) {
      serviceResults.innerHTML =
        '<div style="padding:14px;color:#dc2626;">Unable to load services: ' +
        String(error.message || error) +
        '</div>';
      serviceResults.style.display = "block";
    }

  } finally {
    service.disabled = false;
  }
}
/* ===== NumberHub Country Search ===== */

function setupCountryAutocomplete() {
  const input = document.getElementById("countrySearch");
  const results = document.getElementById("countryResults");
  const select = document.getElementById("numberCountry");

  if (!input || !results || !select) return;

  const countries = Array.from(select.options)
    .filter(option => option.value)
    .map(option => ({
      value: option.value,
      label: option.textContent.trim()
    }));

  function render(query = "") {
    const q = query.trim().toLowerCase();

    const matches = countries
      .filter(item =>
        !q || item.label.toLowerCase().includes(q)
      )
      .slice(0, 50);

    if (!matches.length) {
      results.innerHTML =
        '<div style="padding:13px;color:#64748b;">No country found</div>';
      results.style.display = "block";
      return;
    }

    results.innerHTML = matches.map(item => `
      <button
        type="button"
        data-country="${item.value.replace(/"/g, "&quot;")}"
        style="
          display:block;
          width:100%;
          padding:12px 14px;
          border:0;
          border-bottom:1px solid #f1f5f9;
          background:#fff;
          text-align:left;
          cursor:pointer;
          font-size:14px;
        "
      >${item.label}</button>
    `).join("");

    results.style.display = "block";
  }

  input.onfocus = () => render(input.value);

  input.oninput = () => {
    select.value = "";
    window.selectedCountry = null;
    window.selectedService = null;

    const serviceInput =
      document.getElementById("serviceSearch");

    const serviceResults =
      document.getElementById("serviceResults");

    if (serviceInput) {
      serviceInput.value = "";
      serviceInput.disabled = true;
    }

    if (serviceResults) {
      serviceResults.innerHTML = "";
      serviceResults.style.display = "none";
    }

    render(input.value);
  };

  results.onclick = async event => {
    const button =
      event.target.closest("[data-country]");

    if (!button) return;

    const value = button.dataset.country;

    select.value = value;
    input.value = button.textContent.trim();
    results.style.display = "none";

    window.selectedCountry = value;
    window.selectedService = null;

    const serviceInput =
      document.getElementById("serviceSearch");

    if (serviceInput) {
      serviceInput.disabled = false;
      serviceInput.value = "";
    }

    const serviceText =
      document.getElementById("serviceSelectorText");

    if (serviceText) {
      serviceText.textContent = "Choose service";
    }

    await populateNumberServices();

    if (typeof updateNumberPurchaseState === "function") {
      updateNumberPurchaseState();
    }

    setupServiceAutocomplete();

    if (serviceInput) {
      serviceInput.disabled = false;
      serviceInput.placeholder = "🔎 Search service...";
    }
  };
}

function openNumberCountrySelector() {
  const panel =
    document.getElementById("countrySelectorPanel");

  const input =
    document.getElementById("countrySearch");

  if (!panel || !input) return;

  panel.style.display = "block";

  setupCountryAutocomplete();

  setTimeout(() => input.focus(), 50);
}

function openNumberServiceSelector() {
  const button =
    document.getElementById("serviceSelectorButton");

  const panel =
    document.getElementById("serviceSelectorPanel");

  const input =
    document.getElementById("serviceSearch");

  if (!button || !panel || !input || button.disabled) {
    return;
  }

  panel.style.display = "block";

  setupServiceAutocomplete();

  setTimeout(() => input.focus(), 50);
}

function closeNumberSelectorPanels() {
  const countryPanel =
    document.getElementById("countrySelectorPanel");

  const servicePanel =
    document.getElementById("serviceSelectorPanel");

  if (countryPanel) {
    countryPanel.style.display = "none";
  }

  if (servicePanel) {
    servicePanel.style.display = "none";
  }
}

function showCountryServiceInterface(type, serverName) {
  const config = numberInterfaceConfigs[type];
  const box = document.getElementById("buyNumberInterface");
  const title = document.getElementById("buyNumbersTitle");

  if (!config || !box || !title) return;

  window.selectedNumberType = type;
  window.selectedServer = serverName;
  window.selectedCountry = null;
  window.selectedService = null;

  title.textContent = "Select Country";

  const countryOptions = config.countries.map(country =>
    `<option value="${country}">${country}</option>`
  ).join("");

  box.innerHTML = `
    <div style="
      background:#fff;
      padding:20px;
      border-radius:16px;
      border:1px solid #e5e7eb;
    ">

      <div style="
        font-size:24px;
        font-weight:900;
        margin-bottom:6px;
      ">
        ${config.title}
      </div>

      <div style="
        color:#64748b;
        font-size:13px;
        margin-bottom:20px;
      ">
        ${serverName} selected
      </div>

      <label style="
        display:block;
        font-weight:800;
        margin-bottom:8px;
      ">
        Select Country
      </label>

      <div style="position:relative;">
        <input
          id="countrySearch"
          type="search"
          placeholder="🔎 Search country..."
          autocomplete="off"
          style="
            width:100%;
            box-sizing:border-box;
            padding:13px;
            border:1px solid #ddd;
            border-radius:9px;
            background:#fff;
            font-size:14px;
          "
        />

        <div
          id="countryResults"
          style="
            display:none;
            position:absolute;
            left:0;
            right:0;
            top:calc(100% + 5px);
            max-height:280px;
            overflow-y:auto;
            background:#fff;
            border:1px solid #e5e7eb;
            border-radius:10px;
            box-shadow:0 8px 24px rgba(0,0,0,.10);
            z-index:1000;
          "
        ></div>
      </div>

      <select
        id="numberCountry"
        onchange="updateNumberPurchaseState()"
        style="display:none;"
      >
        <option value="">Select country</option>
        ${countryOptions}
      </select>

      <div style="margin-top:20px">

        <label style="
          display:block;
          font-weight:800;
          margin-bottom:8px;
        ">
          Select Service
        </label>

        <div style="position:relative;">
          <input
            id="serviceSearch"
            type="search"
            placeholder="🔎 Search service..."
            autocomplete="off"
            disabled
            style="
              width:100%;
              box-sizing:border-box;
              padding:13px;
              border:1px solid #ddd;
              border-radius:9px;
              background:#fff;
              font-size:14px;
            "
          />

          <div
            id="serviceResults"
            style="
              display:none;
              position:absolute;
              left:0;
              right:0;
              top:calc(100% + 5px);
              max-height:300px;
              overflow-y:auto;
              background:#fff;
              border:1px solid #e5e7eb;
              border-radius:10px;
              box-shadow:0 8px 24px rgba(0,0,0,.10);
              z-index:999;
            "
          ></div>
        </div>

        <select
          id="numberService"
          onchange="updateNumberPurchaseState()"
          style="display:none;"
        >
          <option value="">Select country first</option>
        </select>

      </div>

      <div style="
        margin-top:20px;
        padding:16px;
        border-radius:12px;
        background:#f8fafc;
      ">
        <div style="font-weight:800">Price</div>

        <div
          id="numberPrice"
          style="
            font-size:24px;
            font-weight:900;
            margin-top:4px;
          "
        >
          ₦0.00
        </div>
      </div>

      <div
        id="numberPurchasePanel"
        style="
          display:none;
          margin-top:18px;
          padding:16px;
          border-radius:12px;
          background:#f8fafc;
          border:1px solid #e5e7eb;
        "
      >
        <button
          id="buyNumberButton"
          type="button"
          onclick="purchaseSelectedNumber()"
          style="
            width:100%;
            padding:14px;
            border:0;
            border-radius:10px;
            background:#16a34a;
            color:#fff;
            font-weight:900;
            font-size:15px;
            cursor:pointer;
          "
        >
          Buy Number
        </button>

        <div
          id="purchaseStatus"
          style="
            display:none;
            margin-top:14px;
          "
        >

          <div style="
            font-size:13px;
            color:#64748b;
            font-weight:700;
          ">
            Your Number
          </div>

          <div
            id="purchasedNumber"
            style="
              margin-top:5px;
              font-size:23px;
              font-weight:900;
              letter-spacing:.5px;
            "
          >
            —
          </div>

          <div
            id="otpWaiting"
            style="
              margin-top:14px;
              padding:13px;
              border-radius:10px;
              background:#fff;
              border:1px solid #e5e7eb;
              font-weight:800;
            "
          >
            ⏳ Waiting for OTP...
          </div>

          <div
            id="otpCode"
            style="
              display:none;
              margin-top:12px;
              padding:16px;
              border-radius:10px;
              background:#fff;
              border:1px solid #e5e7eb;
              text-align:center;
            "
          >
            <div style="
              font-size:12px;
              color:#64748b;
              font-weight:700;
            ">
              OTP CODE
            </div>

            <div
              id="otpValue"
              style="
                margin-top:4px;
                font-size:30px;
                font-weight:900;
                letter-spacing:5px;
              "
            >
              —
            </div>
          </div>

          <button
            id="checkOtpButton"
            type="button"
            onclick="checkPurchasedOtp()"
            style="
              width:100%;
              margin-top:12px;
              padding:12px;
              border:1px solid #d1d5db;
              border-radius:10px;
              background:#fff;
              font-weight:800;
              cursor:pointer;
            "
          >
            🔄 Check for OTP
          </button>

        </div>
      </div>

      <div style="
        margin-top:12px;
        color:#64748b;
        font-size:13px;
      ">
        ${config.countries.length === 1
          ? "USA numbers available"
          : "158 countries available"}
      </div>

      <button
        type="button"
        onclick="backToServerSelection()"
        style="
          margin-top:18px;
          padding:10px 14px;
          border:1px solid #ddd;
          border-radius:9px;
          background:#fff;
          font-weight:700;
        "
      >
        ← Back
      </button>

    </div>
  `;

  box.style.display = "block";

  // Load the real 5SIM services after the country/service
  // interface has been created.
  const countrySelect = document.getElementById("numberCountry");


  if (countrySelect) {
    countrySelect.onchange = async function () {
      window.selectedCountry = this.value;
      window.selectedService = null;

      const serviceSearch = document.getElementById("serviceSearch");
      const countrySearch = document.getElementById("countrySearch");

      if (countrySearch && this.value) {
        const option = this.options[this.selectedIndex];
        countrySearch.value =
          option ? option.textContent.trim() : this.value;
      }

      if (serviceSearch) {
        serviceSearch.disabled = !this.value;
        serviceSearch.value = "";
      }

      await populateNumberServices();

      if (serviceSearch) {
        serviceSearch.disabled = false;
        serviceSearch.value = "";
        serviceSearch.placeholder = "🔎 Search service...";
      }

      updateNumberPurchaseState();
      setupServiceAutocomplete();
    };
  }

  setupCountryAutocomplete();
  setupServiceAutocomplete();

  box.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
}

