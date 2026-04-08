const btn    = document.getElementById("fillBtn");
const status = document.getElementById("status");

btn.addEventListener("click", async () => {
  btn.disabled = true;
  btn.textContent = "Filling…";
  status.className = "";
  status.textContent = "";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content script into ALL frames (including cross-origin iframes like greenhouse.io)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content_script.js"],
    }).catch(() => {});

    await new Promise(r => setTimeout(r, 150));

    // Call __jobRadarFill on every frame — collect all results
    const frameResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: function() {
        if (typeof window.__jobRadarFill === "function") return window.__jobRadarFill();
        return { filled: 0, ats: "None" };
      },
    });

    // Pick the frame that filled the most fields
    var best = { filled: 0, ats: "Generic" };
    for (var i = 0; i < frameResults.length; i++) {
      var r = frameResults[i] && frameResults[i].result;
      if (r && r.filled > best.filled) best = r;
    }

    if (best.filled > 0) {
      status.className = "success";
      status.textContent = "✅ " + best.filled + " fields filled on " + best.ats;
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
