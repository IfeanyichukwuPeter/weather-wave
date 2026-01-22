let currentWeather, currentLat, currentLon, currentCity;
let tempUnit = localStorage.getItem("tempUnit") || "celsius";
let windUnit = localStorage.getItem("windUnit") || "kmh";
let theme = localStorage.getItem("theme") || "light";

const loader = document.getElementById("loading");

// UTILITY FUNCTIONS
function showLoader() {
  loader.classList.add("show");
}
function hideLoader() {
  loader.classList.remove("show");
}
const currentLocationBtn = document.getElementById("currentLocationBtn");

currentLocationBtn?.addEventListener("click", () => {
  if (!navigator.geolocation) return;

  showLoader();

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      const cityName = await getCityName(lat, lon);
      const weather = await getWeather(lat, lon);

      await updateWeatherDisplay(weather, lat, lon, cityName);
      hideLoader();
      localStorage.setItem("lastCityName", cityName);
      localStorage.setItem("lastCityLat", lat);
      localStorage.setItem("lastCityLon", lon);

      currentLocationBtn.style.display = "none";
    },
    async () => {
      hideLoader();
    },
  );
});

function applyTheme() {
  document.body.className = theme;
  localStorage.setItem("theme", theme);

  const dropdown = document.querySelector(".search-dropdown");
  if (dropdown) {
    dropdown.style.display = "none";
  }

  const searchInput = document.querySelector('input[type="search"]');
  if (searchInput) {
    searchInput.blur();
  }
}

function syncSettingsUI() {
  document.querySelectorAll("[data-unit]").forEach((btn) => {
    const groupSpan = btn.closest(".option-group")?.querySelector("span");
    if (!groupSpan) return;
    const groupText = groupSpan.textContent.trim();
    const isTempGroup = groupText === "Temperature";
    const isWindGroup = groupText === "Wind Speed";
    btn.classList.toggle(
      "active",
      (isTempGroup && btn.dataset.unit === tempUnit) ||
        (isWindGroup && btn.dataset.unit === windUnit),
    );
  });

  document.querySelectorAll("[data-theme]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

function applyAutoNightMode(isDay) {
  if (!isDay) {
    document.body.classList.add("night-auto");
  } else {
    document.body.classList.remove("night-auto");
  }
}

applyTheme();
syncSettingsUI();

window.addEventListener("load", async () => {
  showLoader();
  const savedName = localStorage.getItem("lastCityName");
  const savedLat = localStorage.getItem("lastCityLat");
  const savedLon = localStorage.getItem("lastCityLon");

  if (savedName && savedLat && savedLon) {
    const lat = Number(savedLat);
    const lon = Number(savedLon);
    const weather = await getWeather(lat, lon);
    await updateWeatherDisplay(weather, lat, lon, savedName);
    hideLoader();
    return;
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const cityName = await getCityName(lat, lon);
        const weather = await getWeather(lat, lon);
        await updateWeatherDisplay(weather, lat, lon, cityName);
        hideLoader();
      },
      async () => {
        const weather = await getWeather(6.3381, 5.6273);
        await updateWeatherDisplay(weather, 6.3381, 5.6273, "Benin City, NG");
        hideLoader();
      },
    );
  }
});

async function getWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=relative_humidity_2m,precipitation,wind_speed_10m,apparent_temperature,temperature_2m,is_day,weather_code,precipitation_probability,weathercode&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  const response = await fetch(url);
  return await response.json();
}

async function updateWeatherDisplay(data, lat, lon, cityName) {
  hideLoader();
  currentWeather = data;
  currentLat = lat;
  currentLon = lon;
  currentCity = cityName;

  document.getElementById("location").textContent = cityName;
  document.getElementById("date").textContent = new Date().toLocaleDateString(
    "en-NG",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  let mainTemp = data.current.temperature_2m;
  let feelsTemp = data.current.apparent_temperature;
  if (tempUnit === "fahrenheit") {
    mainTemp = (mainTemp * 9) / 5 + 32;
    feelsTemp = (feelsTemp * 9) / 5 + 32;
  }

  const degreeElement = document.querySelector(".degree");
  let tempDisplay = Math.round(mainTemp);
  let tempUnitSymbol = tempUnit === "fahrenheit" ? "°F" : "°C";

  const isFreezing = data.current.temperature_2m <= 0;
  const hasSnowIcon = [71, 73, 75, 77, 85, 86].includes(
    data.current.weather_code,
  );

  if (isFreezing && !hasSnowIcon) {
    tempDisplay = `❄️ ${tempDisplay}`;
  }

  degreeElement.innerHTML = `<span id="degree">${tempDisplay}</span>${tempUnitSymbol}`;

  document.getElementById("feels-like").querySelector("h2").textContent =
    Math.round(feelsTemp) + "°";
  document.getElementById("humidity").querySelector("h2").textContent =
    data.current.relative_humidity_2m + "%";

  let windSpeed = data.current.wind_speed_10m;
  if (windUnit === "mph") windSpeed *= 0.621371;
  document.getElementById("wind").querySelector("h2").innerHTML =
    Math.round(windSpeed) +
    ` <span>${windUnit === "mph" ? "mph" : "km/h"}</span>`;

  document.getElementById("precipitation").querySelector("h2").textContent =
    data.current.precipitation.toFixed(1) + " in";

  const isDay = data.current.is_day === 1;
  applyAutoNightMode(isDay);

  updateAlerts(data);
  updateWorldClock(data.timezone);
  updateHourlyForecast(data.hourly);
  updateDailyForecast(data.daily);
  updateWeatherIcon(data.current.weather_code, isDay);
  updateMainCard(data.current.weather_code, isDay);
}

function updateWeatherIcon(weatherCode, isDay) {
  let weatherIcon = document.querySelector(".weather-icon");
  if (!weatherIcon) {
    const forecastDiv = document.querySelector(".forecast");
    weatherIcon = document.createElement("div");
    weatherIcon.className = "weather-icon";
    forecastDiv.appendChild(weatherIcon);
  }
  weatherIcon.textContent = getWeatherIconWithDayState(weatherCode, isDay);
}

function updateMainCard(weatherCode, isDay) {
  const mainCard = document.getElementById("weatherMain");
  const weatherThemes = {
    0: {
      day: "linear-gradient(135deg, #87CEEB, #98D8E8)",
      night: "linear-gradient(135deg, #1e3c72, #2a5298)",
    },
    1: {
      day: "linear-gradient(135deg, #F9D71C, #E9B10A)",
      night: "linear-gradient(135deg, #4B5EAA, #2A3F88)",
    },
    3: {
      day: "linear-gradient(135deg, #B0B0B0, #D0D0D0)",
      night: "linear-gradient(135deg, #404040, #606060)",
    },
    61: { color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
    71: { color: "linear-gradient(135deg, #A8E6CF, #88D8A3)" },
  };
  const themeData = weatherThemes[weatherCode] || {
    day: "linear-gradient(135deg, #87CEEB, #98D8E8)",
  };
  mainCard.style.background = isDay
    ? themeData.day || themeData.color
    : themeData.night || themeData.color;

  applyCardTextContrast(mainCard);
}
function applyCardTextContrast(element) {
  const bgColor = window.getComputedStyle(element).backgroundColor;
  if (!bgColor) return;

  const rgb = bgColor.match(/\d+/g);
  if (!rgb) return;

  const r = parseInt(rgb[0], 10);
  const g = parseInt(rgb[1], 10);
  const b = parseInt(rgb[2], 10);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  element.style.color = yiq >= 128 ? "#36454f" : "#f5f5f5";
}

function updateHourlyForecast(hourly) {
  document.querySelectorAll(".hour-item").forEach((item, i) => {
    if (i < 10 && item) {
      const time = new Date(hourly.time[i]);

      item.querySelector(".hour-time").textContent = time.toLocaleTimeString(
        [],
        {
          hour: "numeric",
          hour12: false,
        },
      );

      const hour = time.getHours();
      const isDayHour = hour >= 6 && hour < 18;

      let temp = hourly.temperature_2m[i];
      if (tempUnit === "fahrenheit") temp = (temp * 9) / 5 + 32;
      item.querySelector(".hour-temp").textContent = Math.round(temp) + "°";

      item.querySelector(".hour-icon").textContent = getWeatherIconWithDayState(
        hourly.weather_code[i],
        isDayHour,
      );
    }
  });
}

function updateDailyForecast(daily) {
  document.querySelectorAll(".day-item").forEach((item, i) => {
    if (i < 7 && item) {
      item.querySelector(".day-name").textContent = new Date(
        daily.time[i],
      ).toLocaleDateString("en-US", { weekday: "short" });
      let maxTemp = daily.temperature_2m_max[i],
        minTemp = daily.temperature_2m_min[i];
      if (tempUnit === "fahrenheit") {
        maxTemp = (maxTemp * 9) / 5 + 32;
        minTemp = (minTemp * 9) / 5 + 32;
      }
      item.querySelector(".day-temps").textContent =
        Math.round(maxTemp) + "° / " + Math.round(minTemp) + "°";
      item.querySelector(".day-icon").textContent = getWeatherIcon(
        daily.weather_code[i],
      );
    }
  });
}

function getWeatherIconWithDayState(code, isDay) {
  const iconsDay = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 61: "🌧️", 71: "❄️" };
  const iconsNight = {
    0: "🌙",
    1: "🌙",
    2: "☁️",
    3: "☁️",
    61: "🌧️",
    71: "❄️",
  };

  if (isDay) {
    return iconsDay[code] || "🌤️";
  } else {
    return iconsNight[code] || "🌙";
  }
}

function getWeatherIcon(code) {
  const icons = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 61: "🌧️", 71: "❄️" };
  return icons[code] || "🌤️";
}

async function getCityName(lat, lon) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?latitude=${lat}&longitude=${lon}&language=en&format=json`,
    );
    const data = await response.json();
    return data.results?.[0]
      ? `${data.results[0].name}, ${data.results[0].country}`
      : "Your Location";
  } catch {
    return "Your Location";
  }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".tab.active")?.classList.remove("active");
    tab.classList.add("active");
    document.querySelector(".hourly-forecast").style.display =
      tab.textContent === "Hourly forecast" ? "grid" : "none";
    document.querySelector(".daily-forecast").style.display =
      tab.textContent === "Daily forecast" ? "grid" : "none";
  });
});

const searchInput = document.querySelector('input[type="search"]');
const searchBtn = document.querySelector(".search-btn");
const dropdown = document.createElement("div");
dropdown.className = "search-dropdown";
dropdown.classList.add("search-dropdown");
dropdown.style.cssText = `
  position: absolute;
  top: 100%;
  left: 0;
  right: 20px;
  max-height: 250px;
  overflow-y: auto;
  z-index: 10000;
  display: none;
  margin-top: 8px;
`;
document.querySelector(".search-bar").parentNode.style.position = "relative";
document.querySelector(".search-bar").appendChild(dropdown);

let searchSuggestions = [];
async function loadSuggestions(query) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        query,
      )}&count=5&language=en&format=json`,
    );
    return (await response.json()).results || [];
  } catch {
    return [];
  }
}
function showSuggestions(suggestions) {
  dropdown.innerHTML = "";
  if (!suggestions.length) {
    dropdown.style.display = "none";
    return;
  }
  suggestions.forEach((city) => {
    const div = document.createElement("div");
    div.style.cssText =
      "padding: 12px 16px; cursor: pointer; border-bottom: 1px solid #eee;";
    div.innerHTML = `<strong>${city.name}</strong>, ${city.country}<br><small>${
      city.admin1 || ""
    }</small>`;
    div.onclick = () => selectCity(city);
    dropdown.appendChild(div);
  });
  dropdown.style.display = "block";
}
async function selectCity(city) {
  const displayName = `${city.name}, ${city.country}`;
  searchInput.value = displayName;
  dropdown.style.display = "none";
  localStorage.setItem("lastCityName", displayName);
  localStorage.setItem("lastCityLat", city.latitude);
  localStorage.setItem("lastCityLon", city.longitude);
  showLoader();
  const weather = await getWeather(city.latitude, city.longitude);
  await updateWeatherDisplay(
    weather,
    city.latitude,
    city.longitude,
    displayName,
  );
  hideLoader();
  const currentLocationBtn = document.getElementById("currentLocationBtn");
  if (currentLocationBtn) currentLocationBtn.style.display = "inline-flex";
}
searchInput.addEventListener("input", async (e) => {
  const query = e.target.value;
  if (query.length < 2) return (dropdown.style.display = "none");
  searchSuggestions = await loadSuggestions(query);
  showSuggestions(searchSuggestions);
});
searchInput.addEventListener("focus", () => {
  if (searchInput.value && searchSuggestions.length)
    showSuggestions(searchSuggestions);
});
searchBtn.addEventListener("click", () => {
  if (searchSuggestions.length) selectCity(searchSuggestions[0]);
});

// ALERTS & CLOCK
const ALERTS = {
  55: "🌨️ Heavy Freezing Rain",
  65: "🌧️ Heavy Rain",
  71: "❄️ Light Snow",
  95: "⛈️ Thunderstorm",
};
function updateAlerts(data) {
  const alertEl = document.getElementById("alerts");
  const alertText = document.getElementById("alertText");
  const currentCode = data.current.weathercode || data.current.weather_code;
  if (ALERTS[currentCode]) {
    alertText.textContent = ALERTS[currentCode];
    alertEl.classList.add("warning");
  } else {
    alertText.textContent = "None";
    alertEl.classList.remove("warning");
  }
}

let clockInterval;
function updateWorldClock(timezone) {
  if (clockInterval) clearInterval(clockInterval);
  const tick = () => {
    const now = new Date();
    document.getElementById("clock").textContent = now.toLocaleTimeString(
      "en-US",
      {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    );
  };
  tick();
  clockInterval = setInterval(tick, 1000);
}

// SIMPLIFIED PANELS - NO CONFLICTS
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const closeBtn = document.getElementById("closeSettings");

document.addEventListener("click", (e) => {
  // Settings buttons ONLY
  if (
    e.target.matches("#settingsPanel [data-unit], #settingsPanel [data-theme]")
  ) {
    e.stopPropagation();
    const btn = e.target;
    const groupSpan = btn.closest(".option-group")?.querySelector("span");
    const groupText = groupSpan?.textContent.trim();

    if (groupText === "Temperature") {
      tempUnit = btn.dataset.unit;
      localStorage.setItem("tempUnit", tempUnit);
    } else if (groupText === "Wind Speed") {
      windUnit = btn.dataset.unit;
      localStorage.setItem("windUnit", windUnit);
    } else if (btn.dataset.theme) {
      theme = btn.dataset.theme;
      applyTheme();
    }

    syncSettingsUI();
    if (currentWeather) {
      updateWeatherDisplay(currentWeather, currentLat, currentLon, currentCity);
    }
    return;
  } // Close panels

  if (!settingsPanel?.contains(e.target) && !settingsBtn?.contains(e.target)) {
    settingsPanel?.classList.remove("show");
  }
  if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = "none";
  }
});

settingsBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsPanel?.classList.toggle("show");
});
closeBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsPanel?.classList.remove("show");
});
