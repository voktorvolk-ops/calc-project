"use strict";

const STORAGE_KEY = "cleaning-estimate-history";
const BASE_PRICE_PER_SQM = 120;

const cleaningTypes = {
  regular: { label: "Поддерживающая", multiplier: 1 },
  general: { label: "Генеральная", multiplier: 1.7 },
  "after-renovation": { label: "После ремонта", multiplier: 2.4 }
};

const errorMessages = {
  empty: "[Я за тебя расчеты не заполню!]",
  invalid: "[Ты не словами говори, а цифорки пиши!]",
  zero: "[А ты за спасибо работать будешь?]",
  negative: "[Ты за свою работу часто доплачиваешь? Вот и тут нужна положительная цифра!]"
};

const form = document.querySelector("#estimate-form");
const areaInput = document.querySelector("#area");
const roomsInput = document.querySelector("#rooms");
const cleaningTypeSelect = document.querySelector("#cleaning-type");
const feedback = document.querySelector("#feedback");
const resultCard = document.querySelector("#result-card");
const totalElement = document.querySelector("#total");
const detailsElement = document.querySelector("#calculation-details");
const historyList = document.querySelector("#history-list");
const emptyHistory = document.querySelector("#empty-history");
const clearHistoryButton = document.querySelector("#clear-history");

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    feedback.textContent = "Не удалось сохранить журнал в этом браузере.";
  }
}

function validatePositiveNumber(rawValue) {
  const value = rawValue.trim();

  if (value === "") return { error: errorMessages.empty };

  // Разрешаем десятичную запятую или точку, но не буквы и прочие символы.
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(value)) {
    return { error: errorMessages.invalid };
  }

  const number = Number(value.replace(",", "."));

  if (!Number.isFinite(number)) return { error: errorMessages.invalid };
  if (number === 0) return { error: errorMessages.zero };
  if (number < 0) return { error: errorMessages.negative };

  return { value: number };
}

function renderHistory() {
  const history = readHistory();
  historyList.replaceChildren();
  emptyHistory.hidden = history.length > 0;

  history.forEach((entry) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    const description = document.createElement("div");
    const total = document.createElement("div");

    time.className = "history-time";
    time.dateTime = entry.timestamp;
    time.textContent = entry.time;

    description.textContent =
      `Площадь: ${entry.area} м² · Комнат: ${entry.rooms} · Уборка: ${entry.cleaningLabel}`;

    total.className = "history-total";
    total.textContent = `Итого: ${entry.total.toLocaleString("ru-RU")} ₽`;

    item.append(time, description, total);
    historyList.append(item);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  feedback.textContent = "";
  resultCard.hidden = true;

  const areaResult = validatePositiveNumber(areaInput.value);
  if (areaResult.error) {
    feedback.textContent = areaResult.error;
    areaInput.focus();
    return;
  }

  const roomsResult = validatePositiveNumber(roomsInput.value);
  if (roomsResult.error) {
    feedback.textContent = roomsResult.error;
    roomsInput.focus();
    return;
  }

  const selectedType = cleaningTypes[cleaningTypeSelect.value];
  const rawTotal = areaResult.value * BASE_PRICE_PER_SQM *
    selectedType.multiplier * (1 + Math.max(0, roomsResult.value - 1) * 0.05);
  const total = Math.round(rawTotal);

  totalElement.textContent = `${total.toLocaleString("ru-RU")} ₽`;
  detailsElement.textContent =
    `${areaResult.value} м² × ${BASE_PRICE_PER_SQM} ₽ × коэффициент уборки ${selectedType.multiplier}` +
    (roomsResult.value > 1 ? ` × коэффициент комнат ${(1 + (roomsResult.value - 1) * 0.05).toFixed(2)}` : "");
  resultCard.hidden = false;

  const now = new Date();
  const record = {
    timestamp: now.toISOString(),
    time: now.toLocaleString("ru-RU"),
    area: areaResult.value,
    rooms: roomsResult.value,
    cleaningLabel: selectedType.label,
    total
  };

  const history = readHistory();
  history.push(record);
  saveHistory(history);
  renderHistory();
});

clearHistoryButton.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    feedback.textContent = "Не удалось очистить журнал браузера.";
  }
  renderHistory();
});

renderHistory();
