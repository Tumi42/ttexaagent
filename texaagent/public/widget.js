(function () {
  var script = document.currentScript; if (!script) return;
  var botId = script.getAttribute("data-bot"); var color = script.getAttribute("data-color") || "#10b981";
  var base = new URL(script.src).origin; if (!botId) return;
  var css = document.createElement("style");
  css.textContent =
    "#hb-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:" + color + ";color:#fff;border:none;cursor:pointer;font-size:24px;box-shadow:0 4px 14px rgba(0,0,0,.25);z-index:99999}" +
    "#hb-panel{position:fixed;bottom:90px;right:20px;width:340px;max-width:calc(100vw - 32px);height:460px;max-height:70vh;background:#fff;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}" +
    "#hb-head{background:" + color + ";color:#fff;padding:12px 14px;font-weight:600;font-size:15px}" +
    "#hb-msgs{flex:1;overflow-y:auto;padding:12px;background:#f5f6f8}" +
    ".hb-m{max-width:82%;margin:6px 0;padding:8px 11px;border-radius:12px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}" +
    ".hb-u{background:" + color + ";color:#fff;margin-left:auto}.hb-b{background:#fff;color:#222;border:1px solid #e3e5ea}" +
    "#hb-form{display:flex;border-top:1px solid #e3e5ea;background:#fff}" +
    "#hb-in{flex:1;border:none;padding:12px;font-size:14px;outline:none}" +
    "#hb-send{border:none;background:none;color:" + color + ";font-weight:600;padding:0 14px;cursor:pointer;font-size:14px}";
  document.head.appendChild(css);
  var bubble = document.createElement("button"); bubble.id = "hb-bubble"; bubble.textContent = "\uD83D\uDCAC";
  var panel = document.createElement("div"); panel.id = "hb-panel";
  panel.innerHTML = '<div id="hb-head">Chat with us</div><div id="hb-msgs"></div><div id="hb-form"><input id="hb-in" placeholder="Type your question..." maxlength="500"><button id="hb-send">Send</button></div>';
  document.body.appendChild(panel); document.body.appendChild(bubble);
  var msgs = panel.querySelector("#hb-msgs"), input = panel.querySelector("#hb-in"), send = panel.querySelector("#hb-send");
  var history = [], busy = false;
  function add(text, who) { var d = document.createElement("div"); d.className = "hb-m " + (who === "user" ? "hb-u" : "hb-b"); d.textContent = text; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; }
  add("Hi! Ask me anything about us.", "bot");
  bubble.onclick = function () { panel.style.display = panel.style.display === "flex" ? "none" : "flex"; if (panel.style.display === "flex") input.focus(); };
  async function submit() {
    var text = input.value.trim(); if (!text || busy) return; busy = true; input.value = ""; add(text, "user");
    var thinking = add("...", "bot");
    try {
      var res = await fetch(base + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ botId: botId, message: text, history: history }) });
      var data = await res.json(); if (!res.ok) throw new Error(data.error || "Error");
      thinking.textContent = data.reply; history.push({ role: "user", text: text }, { role: "model", text: data.reply });
    } catch (e) { thinking.textContent = "Sorry, something went wrong. Please try again."; }
    busy = false;
  }
  send.onclick = submit; input.onkeydown = function (e) { if (e.key === "Enter") submit(); };
})();
