 const tabs = document.querySelectorAll(".tab");
      const hourly = document.querySelector(".hourly-forecast");
      const daily = document.querySelector(".daily-forecast");
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          tabs.forEach((t) => t.classList.remove("active"));
          tab.classList.add("active");
          if (tab.textContent === "Hourly forecast") {
            hourly.style.display = "flex";
            daily.style.display = "none";
          } else {
            hourly.style.display = "none";
            daily.style.display = "grid";
          }
        });
      });

window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('Location:', position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.log('Permission denied or error');
            }
        );
    }
});
