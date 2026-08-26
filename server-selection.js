const numberTypeServers = {
  usa: {
    title: "🇺🇸 USA Numbers — Cheap",
    description: "Affordable US numbers · Servers A & B",
    servers: [
      { name: "Server A", badge: "⭐ BEST", feature: "Quick OTP" },
      { name: "Server B", badge: "Quick OTP", feature: "Fast Verification" }
    ]
  },

  otherUSA: {
    title: "🇺🇸 Other USA Numbers — Cheap",
    description: "Budget-friendly US numbers · Servers C, D & E",
    servers: [
      { name: "Server C", badge: "⭐ BEST", feature: "Quick OTP" },
      { name: "Server D", badge: "Quick OTP", feature: "Fast Verification" },
      { name: "Server E", badge: "Quick OTP", feature: "Reliable OTP" },
    ]
  },

  allCountries: {
    title: "🌍 All Country Numbers",
    description: "Global coverage · Servers B, C & D",
    servers: [
      { name: "Server B", badge: "⭐ BEST", feature: "Quick OTP" },
      { name: "Server C", badge: "Quick OTP", feature: "Global Coverage" },
      { name: "Server D", badge: "Quick OTP", feature: "Reliable OTP" },
    ]
  },

  moreCountries: {
    title: "🌐 More Country Numbers",
    description: "Extended global coverage · Servers C & E",
    servers: [
      { name: "Server C", badge: "⭐ BEST", feature: "Global Coverage" },
      { name: "Server E", badge: "Quick OTP", feature: "Reliable OTP" }
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
