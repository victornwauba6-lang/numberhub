const numberTypeServers = {
  usa: {
    title: "🇺🇸 USA Numbers — Cheap",
    description: "Affordable US numbers · Servers A & B",
    servers: [
      { name: "Server A", badge: "⭐ BEST", feature: "Quick OTP", success: 100 },
      { name: "Server B", badge: "Quick OTP", feature: "Fast Verification", success: 100 }
    ]
  },

  otherUSA: {
    title: "🇺🇸 Other USA Numbers — Cheap",
    description: "Budget-friendly US numbers · Servers C, D, E & F",
    servers: [
      { name: "Server C", badge: "⭐ BEST", feature: "Quick OTP", success: 100 },
      { name: "Server D", badge: "Quick OTP", feature: "Fast Verification", success: 99 },
      { name: "Server E", badge: "Quick OTP", feature: "Reliable OTP", success: 98 },
      { name: "Server F", badge: "Quick OTP", feature: "Fast Verification", success: 97 }
    ]
  },

  allCountries: {
    title: "🌍 All Country Numbers",
    description: "Global coverage · Servers B, C, D & F",
    servers: [
      { name: "Server B", badge: "⭐ BEST", feature: "Quick OTP", success: 100 },
      { name: "Server C", badge: "Quick OTP", feature: "Global Coverage", success: 99 },
      { name: "Server D", badge: "Quick OTP", feature: "Reliable OTP", success: 98 },
      { name: "Server F", badge: "Quick OTP", feature: "Fast Verification", success: 97 }
    ]
  },

  moreCountries: {
    title: "🌐 More Country Numbers",
    description: "Extended global coverage · Servers C & E",
    servers: [
      { name: "Server C", badge: "⭐ BEST", feature: "Global Coverage", success: 99 },
      { name: "Server E", badge: "Quick OTP", feature: "Reliable OTP", success: 98 }
    ]
  }
};

function showServers(type) {
  const container = document.getElementById("dynamicServers");
  const title = document.getElementById("serverTitle");
  const area = document.getElementById("serverSelection");

  if (!container || !title || !area) return;

  const config = numberTypeServers[type];

  if (!config) return;

  container.innerHTML = "";

  title.innerHTML = `
    <span class="server-main-title">${config.title}</span>
    <small class="server-description">${config.description}</small>
  `;

  const grid = document.createElement("div");
  grid.className = "server-card-grid";

  config.servers.forEach(server => {
    const card = document.createElement("button");

    card.type = "button";
    card.className = "dynamic-server";

    card.innerHTML = `
      <div class="server-card-top">
        <span class="server-online">
          <span class="online-dot"></span> ONLINE
        </span>
        <span class="server-badge">${server.badge}</span>
      </div>

      <div class="server-name">
        ${server.name}
      </div>

      <div class="server-feature">
        ⚡ ${server.feature}
      </div>

      <div class="server-success-row">
        <span>24H SUCCESS</span>
        <strong>${server.success}%</strong>
      </div>

      <div class="server-progress">
        <span style="width:${server.success}%"></span>
      </div>

      <div class="server-card-bottom">
        <span>Available</span>
        <span class="server-select">Select Server →</span>
      </div>
    `;

    card.addEventListener("click", () => {
      document.querySelectorAll(".dynamic-server").forEach(item => {
        item.classList.remove("selected");
      });

      card.classList.add("selected");

      window.selectedNumberType = type;
      window.selectedServer = server.name;

      const selected = document.getElementById("selectedServer");

      if (selected) {
        selected.innerHTML = `
          <span>✓ ${server.name} selected</span>
        `;
      }
    });

    grid.appendChild(card);
  });

  container.appendChild(grid);

  area.style.display = "block";

  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
