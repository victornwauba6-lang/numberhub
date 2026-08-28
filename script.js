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
