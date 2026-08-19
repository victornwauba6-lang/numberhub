(function () {
  const button = document.createElement("button");

  button.id = "whatsappChannelFloat";
  button.type = "button";
  button.setAttribute("aria-label", "Open NumberHub WhatsApp Channel");

  button.innerHTML = '<span style="font-size:34px">◉</span>';

  document.body.appendChild(button);

  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;

  button.addEventListener("pointerdown", function(e) {
    dragging = true;
    moved = false;

    const rect = button.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener("pointermove", function(e) {
    if (!dragging) return;

    moved = true;

    button.style.left = (e.clientX - offsetX) + "px";
    button.style.top = (e.clientY - offsetY) + "px";
    button.style.right = "auto";
    button.style.bottom = "auto";
  });

  button.addEventListener("pointerup", function() {
    dragging = false;
  });

  button.addEventListener("click", function() {
    if (!moved) {
      window.open(
        "https://whatsapp.com/channel/0029VbDRxIfD38CSw1z02m3H",
        "_blank"
      );
    }
  });
})();
