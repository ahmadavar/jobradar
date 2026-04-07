const btn    = document.getElementById("fillBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Filling…";
  status.className = "";
  status.textContent = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send fill command and wait for response
    const response = await chrome.tabs.sendMessage(tab.id, { action: "fill" });

    if (response && response.filled >= 0) {
      status.className = "success";
      status.textContent = `✅ ${response.filled} fields filled on ${response.ats}`;
    } else {
      status.className = "error";
      status.textContent = "⚠️ No fields found — wrong page?";
    }
  } catch (err) {
    status.className = "error";
    status.textContent = "❌ Could not reach page. Reload and try again.";
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ Fill This Form";
  }
});
