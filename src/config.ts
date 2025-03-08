export const createConfigModal = () => {
  const modalContainer = document.getElementById("settingsModal");

  if (!modalContainer) {
    console.error("No se encontró el contenedor del modal.");
    return;
  }

  modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <span class="close">&times;</span>
          <h2>Settings & Shortcuts</h2>
  
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li><strong>[C]</strong> - Connect devices</li>
            <li><strong>[H]</strong> - Open Help</li>
            <li><strong>[Delete] / [Backspace]</strong> - Delete selected element</li>
            <li><strong>[Space]</strong> - Pause/resume simulation</li>
            <li><strong>[Ctrl + Z]</strong> - Undo</li>
            <li><strong>[Ctrl + Y]</strong> - Redo</li>
            <li><strong>[N]</strong> - Create a new network</li>
            <li><strong>[S]</strong> - Save your network</li>
            <li><strong>[L]</strong> - Load a saved network</li>
            <li><strong>[P]</strong> - Print the current network</li>
          </ul>
  
          <h3>General Settings</h3>
  
          <button id="saveSettings">Save Settings</button>
        </div>
      </div>
    `;

  setupModalLogic(); // Asegurar que los eventos se asignen después de inyectar el modal
};

export const openConfigModal = () => {
  const modalOverlay = document.querySelector(
    ".modal-overlay",
  ) as HTMLDivElement;
  const modalContent = document.querySelector(
    ".modal-content",
  ) as HTMLDivElement;

  if (modalOverlay && modalContent) {
    modalOverlay.style.display = "flex"; // Primero lo hacemos visible
    setTimeout(() => {
      modalOverlay.classList.add("show");
      modalContent.classList.add("show");
    }, 10); // Pequeño delay para que la animación funcione bien
  }
};

export const closeConfigModal = () => {
  const modalOverlay = document.querySelector(
    ".modal-overlay",
  ) as HTMLDivElement;
  const modalContent = document.querySelector(
    ".modal-content",
  ) as HTMLDivElement;

  if (modalOverlay && modalContent) {
    modalOverlay.classList.remove("show");
    modalContent.classList.remove("show");

    setTimeout(() => {
      modalOverlay.style.display = "none"; // Ocultar después de la animación
    }, 300);
  }
};

// Asegurar que los eventos de cierre estén bien asignados
export const setupModalLogic = () => {
  const modalOverlay = document.querySelector(
    ".modal-overlay",
  ) as HTMLDivElement;
  const closeBtn = document.querySelector(".close") as HTMLSpanElement;
  const saveSettingsButton = document.getElementById(
    "saveSettings",
  ) as HTMLButtonElement;

  if (!modalOverlay || !closeBtn || !saveSettingsButton) {
    console.error("No se encontraron algunos elementos del modal.");
    return;
  }

  // Evento para cerrar modal al hacer clic en la "X"
  closeBtn.onclick = closeConfigModal;

  // Evento para cerrar modal al hacer clic fuera de él
  modalOverlay.onclick = (event) => {
    if (event.target === modalOverlay) closeConfigModal();
  };

  // Evento para guardar la configuración y cerrar el modal
  saveSettingsButton.onclick = () => {
    // Guardar configuración en localStorage

    console.log("Configuración guardada:");

    closeConfigModal(); // Cierra el modal después de guardar
  };
};
