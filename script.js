const weddingDate = "2026-10-03T14:45:00";
const weddingTimeZone = "Europe/Paris";

const countdownRoot = document.querySelector(".countdown");
const daysElement = document.getElementById("days");
const hoursElement = document.getElementById("hours");
const minutesElement = document.getElementById("minutes");
const countdownNote = document.querySelector(".countdown-note");

function parseDateTimeParts(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "00"] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function getTimeZoneOffsetMilliseconds(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  const asUtcTimestamp = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtcTimestamp - date.getTime();
}

function getZonedDate(dateTimeString, timeZone) {
  const parts = parseDateTimeParts(dateTimeString);

  if (!parts) {
    return null;
  }

  const utcGuess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );

  const offset = getTimeZoneOffsetMilliseconds(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offset);
}

function updateCountdown() {
  if (!weddingDate) {
    countdownNote.textContent =
      "Ajoutez une date dans script.js, par exemple 2026-07-18T15:00:00, pour afficher le compte a rebours en heure de Paris.";
    return;
  }

  const targetDate = getZonedDate(weddingDate, weddingTimeZone);

  if (!targetDate || Number.isNaN(targetDate.getTime())) {
    countdownNote.textContent =
      "Le format de la date est invalide. Utilisez YYYY-MM-DDTHH:MM:SS pour l'heure de Paris.";
    return;
  }

  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    daysElement.textContent = "00";
    hoursElement.textContent = "00";
    minutesElement.textContent = "00";
    countdownNote.textContent =
      "Le grand jour est arrive. Profitez pleinement de la fete.";
    return;
  }

  const totalMinutes = Math.ceil(difference / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  daysElement.textContent = String(days).padStart(2, "0");
  hoursElement.textContent = String(hours).padStart(2, "0");
  minutesElement.textContent = String(minutes).padStart(2, "0");
  countdownNote.textContent =
    "Le compte a rebours jusqu'au mariage est calcule selon l'heure de Paris.";
}

if (countdownRoot) {
  updateCountdown();
  window.setInterval(updateCountdown, 1000);
}

const menuButton = document.querySelector(".menu-toggle");
const navLinks = document.getElementById("nav-links");

if (menuButton && navLinks) {
  menuButton.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
  },
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});
