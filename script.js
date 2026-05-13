const weddingDate = "2026-10-03T14:45:00";
const weddingTimeZone = "Europe/Paris";
const googleDriveFolderUrl =
  "https://drive.google.com/drive/folders/1eV3PYcop_AHq5qVdr1kDknaPhkYtcS3Y?usp=drive_link";
const googleDriveUploadEndpointUrl = "upload-drive.php";

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

const memoryShareForm = document.getElementById("memory-share-form");
const memoryFilesInput = document.getElementById("memory-files");
const memoryShareStatus = document.getElementById("memory-share-status");
const memoryFileList = document.getElementById("memory-file-list");
const memoryShareHelp = document.getElementById("memory-share-help");
const memoryShareSubmit = document.getElementById("memory-share-submit");
const memoryUploadProgress = document.getElementById("memory-upload-progress");
const memoryUploadProgressBar = document.getElementById(
  "memory-upload-progress-bar",
);
const memoryUploadProgressFill = document.getElementById(
  "memory-upload-progress-fill",
);
const memoryUploadProgressLabel = document.getElementById(
  "memory-upload-progress-label",
);
let isMemoryUploadInProgress = false;
let selectedMemoryFiles = [];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} octets`;
  }

  const units = ["Ko", "Mo", "Go", "To"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function updateMemoryShareAvailability() {
  if (!memoryShareSubmit || !memoryShareHelp) {
    return;
  }

  if (!googleDriveUploadEndpointUrl) {
    memoryShareSubmit.disabled = true;
    memoryShareHelp.textContent = googleDriveFolderUrl
      ? "Le dossier Google Drive est configure. Ajoutez maintenant l'URL de votre endpoint securise dans script.js pour activer l'envoi direct."
      : "Ajoutez le lien du dossier Google Drive et l'URL de votre endpoint securise dans script.js pour activer l'envoi direct.";
    return;
  }

  memoryShareSubmit.disabled = false;
  memoryShareHelp.textContent =
    "Vous pouvez selectionner vos fichiers en une ou plusieurs fois. Le bouton les envoie ensuite en arriere-plan vers votre dossier Google Drive, sans quitter le site.";
}

function setMemoryUploadState(isUploading) {
  isMemoryUploadInProgress = isUploading;

  if (!memoryShareSubmit) {
    return;
  }

  memoryShareSubmit.disabled = isUploading || !googleDriveUploadEndpointUrl;
  memoryShareSubmit.textContent = isUploading
    ? "Envoi en cours..."
    : "Envoyer les souvenirs";
}

function updateMemoryUploadProgress(percentage, isVisible = true, label = "") {
  if (
    !memoryUploadProgress ||
    !memoryUploadProgressBar ||
    !memoryUploadProgressFill ||
    !memoryUploadProgressLabel
  ) {
    return;
  }

  const safePercentage = Math.max(0, Math.min(100, Math.round(percentage)));

  memoryUploadProgress.hidden = !isVisible;
  memoryUploadProgressBar.setAttribute("aria-valuenow", String(safePercentage));
  memoryUploadProgressFill.style.width = `${safePercentage}%`;
  memoryUploadProgressLabel.textContent =
    label || `Progression de l'envoi : ${safePercentage}%`;
}

function getAcceptedFiles(fileList) {
  return Array.from(fileList || []).filter(
    (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
  );
}

function mergeMemoryFiles(existingFiles, nextFiles) {
  const filesByKey = new Map();

  [...existingFiles, ...nextFiles].forEach((file) => {
    const fileKey = [file.name, file.size, file.lastModified, file.type].join(
      "::",
    );
    filesByKey.set(fileKey, file);
  });

  return Array.from(filesByKey.values());
}

function renderSelectedFiles(fileList) {
  if (!memoryShareStatus || !memoryFileList) {
    return;
  }

  const files = Array.from(fileList || []);

  if (files.length === 0) {
    memoryShareStatus.textContent = "Aucun fichier selectionne pour le moment.";
    memoryFileList.innerHTML = "";
    updateMemoryUploadProgress(0, false);
    return;
  }

  const acceptedFiles = getAcceptedFiles(files);
  const rejectedFiles = files.length - acceptedFiles.length;
  const totalBytes = acceptedFiles.reduce((sum, file) => sum + file.size, 0);

  memoryShareStatus.textContent = `${acceptedFiles.length} fichier(s) pret(s), soit ${formatBytes(totalBytes)}.${
    rejectedFiles > 0
      ? ` ${rejectedFiles} fichier(s) ignore(s) car non pris en charge.`
      : ""
  }`;

  memoryFileList.innerHTML = acceptedFiles
    .slice(0, 5)
    .map(
      (file) => `<li>${file.name} <span>${formatBytes(file.size)}</span></li>`,
    )
    .join("");

  if (acceptedFiles.length > 5) {
    memoryFileList.insertAdjacentHTML(
      "beforeend",
      `<li>Et ${acceptedFiles.length - 5} autre(s) fichier(s) <span>${formatBytes(totalBytes)}</span></li>`,
    );
  }
}

function uploadFilesToEndpoint(files, onProgress) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("files[]", file, file.name);
  });

  formData.append("folderUrl", googleDriveFolderUrl);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", googleDriveUploadEndpointUrl, true);

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") {
        return;
      }

      onProgress((event.loaded / event.total) * 100, "uploading");
    });

    request.upload.addEventListener("load", () => {
      if (typeof onProgress !== "function") {
        return;
      }

      onProgress(100, "processing");
    });

    request.addEventListener("load", () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Erreur HTTP ${request.status}`));
        return;
      }

      const contentType = request.getResponseHeader("content-type") || "";

      if (!contentType.includes("application/json")) {
        resolve(null);
        return;
      }

      try {
        resolve(JSON.parse(request.responseText));
      } catch (error) {
        reject(new Error("Reponse JSON invalide du serveur."));
      }
    });

    request.addEventListener("error", () => {
      reject(new Error("Erreur reseau pendant l'envoi."));
    });

    request.send(formData);
  });
}

if (memoryFilesInput) {
  memoryFilesInput.addEventListener("change", (event) => {
    const acceptedFiles = getAcceptedFiles(event.target.files);
    selectedMemoryFiles = mergeMemoryFiles(selectedMemoryFiles, acceptedFiles);
    renderSelectedFiles(selectedMemoryFiles);
    event.target.value = "";
  });
}

if (memoryShareForm) {
  updateMemoryShareAvailability();

  memoryShareForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isMemoryUploadInProgress) {
      return;
    }

    const hasFiles = selectedMemoryFiles.length > 0;

    if (!hasFiles) {
      if (memoryShareStatus) {
        memoryShareStatus.textContent =
          "Selectionnez au moins une photo ou une video avant de continuer.";
      }
      return;
    }

    if (!googleDriveUploadEndpointUrl) {
      updateMemoryShareAvailability();
      return;
    }

    const acceptedFiles = selectedMemoryFiles;

    if (acceptedFiles.length === 0) {
      if (memoryShareStatus) {
        memoryShareStatus.textContent =
          "Aucun fichier compatible a envoyer. Selectionnez des photos ou des videos.";
      }
      return;
    }

    try {
      setMemoryUploadState(true);
      updateMemoryUploadProgress(0, true, "Preparation de l'envoi : 0%");

      if (memoryShareStatus) {
        memoryShareStatus.textContent =
          "Envoi en cours vers Google Drive. Merci de patienter jusqu'a la confirmation.";
      }

      const result = await uploadFilesToEndpoint(
        acceptedFiles,
        (percentage, phase) => {
          if (phase === "processing") {
            updateMemoryUploadProgress(
              92,
              true,
              "Traitement des fichiers sur le serveur...",
            );
            return;
          }

          const displayedPercentage = Math.min(
            90,
            Math.round(percentage * 0.9),
          );
          updateMemoryUploadProgress(
            displayedPercentage,
            true,
            `Televersement des fichiers : ${displayedPercentage}%`,
          );
        },
      );
      const uploadedCount =
        Number(result?.uploadedCount) || acceptedFiles.length;

      updateMemoryUploadProgress(100, true, "Envoi termine : 100%");

      if (memoryShareStatus) {
        memoryShareStatus.textContent = `${uploadedCount} fichier(s) envoye(s) avec succes vers Google Drive.`;
      }

      if (memoryFileList) {
        memoryFileList.innerHTML = "";
      }

      selectedMemoryFiles = [];
      memoryShareForm.reset();
      updateMemoryUploadProgress(0, false);
    } catch (error) {
      updateMemoryUploadProgress(0, false);

      if (memoryShareStatus) {
        memoryShareStatus.textContent =
          "L'envoi a echoue. Verifiez la configuration du service Google Drive puis reessayez.";
      }

      console.error("Google Drive upload failed", error);
    } finally {
      setMemoryUploadState(false);
      updateMemoryShareAvailability();
    }
  });
}
