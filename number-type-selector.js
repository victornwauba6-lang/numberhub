document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".buy-option");

  const types = [
    "usa",
    "otherUSA",
    "allCountries",
    "moreCountries"
  ];

  buttons.forEach((button, index) => {
    button.onclick = function(event) {
      event.preventDefault();

      const type = types[index];

      if (typeof showServers === "function") {
        showServers(type);
      }
    };
  });
});
