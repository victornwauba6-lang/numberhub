(function () {
  const button = document.createElement("button");

  button.id = "whatsappChannelFloat";
  button.type = "button";
  button.setAttribute("aria-label", "Open NumberHub WhatsApp Channel");

  button.innerHTML = `
    <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#25D366"/>
      <path fill="#fff" d="M23.3 8.7A10.2 10.2 0 0 0 16 5.8c-5.7 0-10.3 4.6-10.3 10.2 0 1.8.5 3.5 1.3 5L5.6 26.4l5.5-1.4c1.5.8 3.1 1.2 4.9 1.2 5.7 0 10.3-4.6 10.3-10.2 0-2.7-1.1-5.3-3-7.3zm-7.3 15.7c-1.5 0-3-.4-4.3-1.1l-.3-.2-3.3.9.9-3.2-.2-.3c-.8-1.4-1.2-2.9-1.2-4.5 0-4.7 3.8-8.5 8.5-8.5 2.3 0 4.4.9 6 2.5s2.5 3.8 2.5 6c0 4.6-3.8 8.4-8.6 8.4zm4.7-6.3c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.2-1.2-.4-2.3-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.1-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.3s.9 2.6 1.1 2.8c.1.2 1.8 2.8 4.4 3.9.6.3 1.1.5 1.5.6.6.2 1.2.2 1.7.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3z"/>
    </svg>
  `;

  button.style.cssText = `
    position: fixed;
    right: 18px;
    bottom: 18px;
    width: 62px;
    height: 62px;
    border: none;
    border-radius: 50%;
    background: #25D366;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin: 0;
    cursor: pointer;
    z-index: 99999;
    box-shadow: 0 6px 18px rgba(0,0,0,.22);
  `;

  document.body.appendChild(button);

  let dragging = false;
  let moved = false;
  let offsetX = 0;
  let offsetY = 0;

  button.addEventListener("pointerdown", function (e) {
    dragging = true;
    moved = false;

    const rect = button.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    button.setPointerCapture(e.pointerId);
  });

  button.addEventListener("pointermove", function (e) {
    if (!dragging) return;

    moved = true;
    button.style.left = (e.clientX - offsetX) + "px";
    button.style.top = (e.clientY - offsetY) + "px";
    button.style.right = "auto";
    button.style.bottom = "auto";
  });

  button.addEventListener("pointerup", function () {
    dragging = false;
  });

  button.addEventListener("click", function () {
    if (!moved) {
      window.open(
        "https://whatsapp.com/channel/0029VbDRxIfD38CSw1z02m3H",
        "_blank"
      );
    }
  });
})();
