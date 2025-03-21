class WeatherApp {
  constructor() {
    this.GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    this.WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
    this.elements = this.getElements();
    this.lang = 'fr';
    this.currentWeatherData = null;
    this.currentCityName = '';

    this.translations = {
      fr: {
        title: "Mon App Météo",
        searchPlaceholder: "Entrez une ville...",
        searchButton: "Rechercher",
        errorMessage: "Aucune ville trouvée.",
        weatherDescription: "Description",
        windSpeed: "Vitesse du vent",
        windDirection: "Direction",
        forecastTitle: "Prévisions sur 7 jours"
      },
      en: {
        title: "My Weather App",
        searchPlaceholder: "Enter a city...",
        searchButton: "Search",
        errorMessage: "No city found.",
        weatherDescription: "Description",
        windSpeed: "Wind Speed",
        windDirection: "Direction",
        forecastTitle: "7-day Forecast"
      }
    };

    this.init();
  }

  getElements() {
    return {
      searchBtn: document.getElementById('search-btn'),
      cityInput: document.getElementById('city-input'),
      weatherDisplay: document.querySelector('.weather-display'),
      weatherInfo: document.getElementById('weather-info'),
      cityName: document.getElementById('city-name'),
      date: document.getElementById('date'),
      temperature: document.getElementById('temperature'),
      description: document.getElementById('description'),
      weatherIcon: document.getElementById('weather-icon'),
      extraInfo: document.getElementById('extra-info'),
      errorMessage: this.createErrorMessage(),
      citySuggestions: this.createCitySuggestionList(),
      languageFlags: document.getElementById('language-flags'),
      forecastContainer: document.getElementById('forecast-container'),
      forecastCards: document.getElementById('forecast-cards')
    };
  }

  createErrorMessage() {
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message', 'hidden');
    document.querySelector('.container').appendChild(errorMessage);
    return errorMessage;
  }

  createCitySuggestionList() {
    const list = document.createElement('ul');
    list.id = 'city-suggestions';
    list.classList.add('suggestions-list', 'hidden');
    document.querySelector('.input-wrapper').appendChild(list);
    return list;
  }

  init() {
    this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    this.elements.cityInput.addEventListener('input', () => this.handleInput());
    this.elements.languageFlags.addEventListener('click', (e) => {
      const lang = e.target.getAttribute('data-lang');
      if (lang) this.changeLanguage(lang);
    });
    this.changeLanguage(this.lang);
  }

  changeLanguage(language) {
    this.lang = language;
    const t = this.translations[language];
    document.getElementById('app-title').textContent = t.title;
    this.elements.cityInput.placeholder = t.searchPlaceholder;
    this.elements.searchBtn.textContent = t.searchButton;
    const forecastTitle = document.querySelector('.forecast-title');
    if (forecastTitle) {
      forecastTitle.textContent = t.forecastTitle;
    }
    if (this.currentWeatherData) {
      this.displayWeather(this.currentWeatherData, this.currentCityName);
      this.displayForecast(this.currentWeatherData);
    }
  }

  async handleInput() {
    const city = this.elements.cityInput.value.trim();
    if (!city) {
      this.elements.citySuggestions.classList.add('hidden');
      return;
    }
    try {
      const cities = await this.getCoordinates(city);
      if (cities.length > 0) {
        this.showCitySuggestions(cities);
      } else {
        this.elements.citySuggestions.classList.add('hidden');
      }
    } catch (error) {
      this.showError('Erreur de récupération des données.');
      this.elements.citySuggestions.classList.add('hidden');
    }
  }

  async handleSearch() {
    const city = this.elements.cityInput.value.trim();
    if (!city) return;
    try {
      const cities = await this.getCoordinates(city);
      if (cities.length === 0) {
        this.showError(this.translations[this.lang].errorMessage);
      } else if (cities.length === 1) {
        await this.fetchAndDisplayWeather(cities[0]);
      } else {
        this.showCitySuggestions(cities);
      }
    } catch (error) {
      this.showError('Erreur de récupération des données.');
    }
  }

  async getCoordinates(city) {
    const url = `${this.GEOCODING_URL}?name=${encodeURIComponent(city)}&count=5&language=${this.lang}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results || data.results.length === 0) return [];
      return data.results.map(city => ({
        lat: city.latitude,
        lon: city.longitude,
        name: `${city.name}, ${city.country_code}`
      }));
    } catch (error) {
      console.error("Erreur dans getCoordinates:", error);
      return [];
    }
  }

  showCitySuggestions(cities) {
    this.elements.citySuggestions.textContent = '';
    this.elements.citySuggestions.classList.remove('hidden');
    cities.forEach(city => {
      const listItem = document.createElement('li');
      listItem.textContent = city.name;
      listItem.addEventListener('click', async () => {
        this.elements.cityInput.value = city.name;
        this.elements.citySuggestions.classList.add('hidden');
        await this.fetchAndDisplayWeather(city);
      });
      this.elements.citySuggestions.appendChild(listItem);
    });
  }

  async fetchAndDisplayWeather(city) {
    try {
      const weatherData = await this.getWeatherData(city.lat, city.lon);
      this.currentWeatherData = weatherData;
      this.currentCityName = city.name;
      this.displayWeather(weatherData, city.name);
      this.displayForecast(weatherData);
      this.showWeatherDisplay();
    } catch (error) {
      this.showError('Impossible de récupérer la météo.');
    }
  }

  async getWeatherData(lat, lon) {
    const url = `${this.WEATHER_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await fetch(url);
    return await response.json();
  }

  displayWeather(weatherData, cityName) {
    const weather = weatherData.current_weather;
    this.elements.cityName.textContent = cityName;
    this.elements.temperature.textContent = `${Math.round(weather.temperature)}°C`;
    this.elements.weatherIcon.src = this.getWeatherIcon(weather.weathercode);
    this.elements.description.textContent = this.getWeatherDescription(weather.weathercode);
    this.elements.extraInfo.textContent = `${this.translations[this.lang].windSpeed}: ${weather.windspeed} km/h`;
    this.elements.date.textContent = new Date().toLocaleDateString(this.lang);
  }

  displayForecast(weatherData) {
    if (!weatherData.daily) return;
    this.elements.forecastContainer.classList.remove('hidden');
    this.elements.forecastCards.textContent = '';
    const forecastTitle = document.querySelector('.forecast-title');
    if (forecastTitle) {
      forecastTitle.textContent = this.translations[this.lang].forecastTitle;
    }
    for (let i = 0; i < weatherData.daily.time.length; i++) {
      const card = this.createForecastCard(
        weatherData.daily.time[i],
        weatherData.daily.temperature_2m_max[i],
        weatherData.daily.temperature_2m_min[i],
        weatherData.daily.weathercode[i]
      );
      this.elements.forecastCards.appendChild(card);
    }
  }

  createForecastCard(time, maxTemp, minTemp, weatherCode) {
    const card = document.createElement('div');
    card.classList.add('forecast-card');
    const dateDiv = document.createElement('div');
    dateDiv.classList.add('forecast-date');
    dateDiv.textContent = new Date(time).toLocaleDateString(this.lang, { weekday: 'short' });
    const icon = document.createElement('img');
    icon.classList.add('forecast-icon');
    icon.src = this.getWeatherIcon(weatherCode);
    icon.alt = 'weather';
    const tempDiv = document.createElement('div');
    tempDiv.classList.add('forecast-temp');
    const maxSpan = document.createElement('span');
    maxSpan.textContent = `${Math.round(maxTemp)}°`;
    const minSpan = document.createElement('span');
    minSpan.style.color = '#666';
    minSpan.textContent = `/${Math.round(minTemp)}°`;
    tempDiv.appendChild(maxSpan);
    tempDiv.appendChild(minSpan);
    card.appendChild(dateDiv);
    card.appendChild(icon);
    card.appendChild(tempDiv);
    return card;
  }

  getWeatherDescription(code) {
    const descriptions = {
      0: { fr: "Ciel dégagé", en: "Clear sky" },
      1: { fr: "Partiellement nuageux", en: "Partly cloudy" },
      2: { fr: "Nuageux", en: "Cloudy" },
      3: { fr: "Couvert", en: "Overcast" },
      45: { fr: "Brouillard", en: "Fog" },
      48: { fr: "Brouillard givrant", en: "Freezing fog" },
      51: { fr: "Bruine légère", en: "Light drizzle" },
      53: { fr: "Bruine modérée", en: "Moderate drizzle" },
      55: { fr: "Bruine dense", en: "Dense drizzle" },
      61: { fr: "Pluie légère", en: "Light rain" },
      63: { fr: "Pluie modérée", en: "Moderate rain" },
      65: { fr: "Pluie forte", en: "Heavy rain" },
      66: { fr: "Pluie verglaçante légère", en: "Light freezing rain" },
      67: { fr: "Pluie verglaçante forte", en: "Heavy freezing rain" },
      71: { fr: "Neige légère", en: "Light snow" },
      73: { fr: "Neige modérée", en: "Moderate snow" },
      75: { fr: "Neige forte", en: "Heavy snow" },
      77: { fr: "Grains de neige", en: "Snow grains" },
      80: { fr: "Averses de pluie légère", en: "Light rain showers" },
      81: { fr: "Averses de pluie modérée", en: "Moderate rain showers" },
      82: { fr: "Averses de pluie violentes", en: "Violent rain showers" },
      85: { fr: "Averses de neige légère", en: "Light snow showers" },
      86: { fr: "Averses de neige fortes", en: "Heavy snow showers" },
      95: { fr: "Orage", en: "Thunderstorm" },
      96: { fr: "Orage avec grêle légère", en: "Thunderstorm with light hail" },
      99: { fr: "Orage avec grêle forte", en: "Thunderstorm with heavy hail" }
    };
    return descriptions[code] ? descriptions[code][this.lang] : `Code météo: ${code}`;
  }

  getWeatherIcon(weatherCode) {
    const iconMap = {
      0: '01d',
      1: '02d',
      2: '03d',
      3: '04d',
      45: '50d',
      48: '50d',
      51: '09d',
      53: '09d',
      55: '09d',
      61: '10d',
      63: '10d',
      65: '10d',
      66: '13d',
      67: '13d',
      71: '13d',
      73: '13d',
      75: '13d',
      77: '13d',
      80: '09d',
      81: '09d',
      82: '09d',
      85: '13d',
      86: '13d',
      95: '11d',
      96: '11d',
      99: '11d'
    };
    const iconCode = iconMap[weatherCode] || '01d';
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  }

  showWeatherDisplay() {
    this.elements.weatherInfo.classList.remove('hidden');
    this.elements.weatherDisplay.classList.add('active');
  }

  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
      this.elements.errorMessage.classList.add('hidden');
    }, 3500);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
  
  VANTA.CLOUDS({
    el: "#background",
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.00,
    minWidth: 200.00,
    cloudShadowColor: 0x2d4661,
    sunColor: 0xfaad4f,
    sunGlareColor: 0xfaa182,
    sunlightColor: 0xffb064
  });
});
