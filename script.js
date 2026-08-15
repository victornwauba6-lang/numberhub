async function checkBackend() {
  try {
    const response = await fetch("http://127.0.0.1:3001/api/status");
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
