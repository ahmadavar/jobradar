const btn    = document.getElementById("fillBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Filling…";
  status.className = "";
  status.textContent = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script if not already present (e.g. tab was open before extension reload)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content_script.js"],
    }).catch(() => {}); // ignore if already injected

    // Small delay to let the script initialize
    await new Promise(r => setTimeout(r, 100));

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
