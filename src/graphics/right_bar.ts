import { Renderable } from "./renderables/base_info";

export class RightBar {
  private static instance: RightBar | null = null; // Singleton
  private rightBar: HTMLElement;

  private constructor(rightBar: HTMLElement) {
    this.rightBar = rightBar;
    this.initializeBaseContent();
  }

  // Static method to get the unique instance of RightBar
  static getInstance() {
    // If an instance already exists, return it. If not, create it.
    if (!RightBar.instance) {
      const rightBarElement = document.getElementById("right-bar");
      if (!rightBarElement) {
        console.error("Element with ID 'right-bar' not found.");
        return null;
      }
      RightBar.instance = new RightBar(rightBarElement);
    }
    return RightBar.instance;
  }

  // Initializes the base title and info container (called only once)
  private initializeBaseContent() {
    const infoContent = document.createElement("div");
    infoContent.id = "info-content";
    this.rightBar.appendChild(infoContent);
    this.showDefaultInfo();
  }

  // Method to clear only the content of info-content
  clearContent() {
    const infoContent = this.rightBar.querySelector("#info-content");
    if (infoContent) {
      infoContent.innerHTML = ""; // Clears only the content of info-content
    }
    this.showDefaultInfo(); // Show default info
  }

  // Shows specific information of an element in info-content
  renderInfo(info: Renderable) {
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.replaceChildren(...info.toHTML());
    }
  }

  getDefaultInfoHtml(): string {
    return `
    <div id="default-info" class="default-info">
      <h2 class="default-info-title">Welcome to GEduNet! <span class="default-info-emoji">🌐</span></h2>
      <p class="default-info-lead">
        <strong>GEduNet</strong> is a <b>Graphical Educational Computer Network Simulator</b>.
      </p>
      <p class="default-info-lead">
        It's meant as an aid to students trying to understand computer networks, along with their teachers.
      </p>

      <h3 class="default-info-section">User Manual</h3>
      <p>GEduNet consists of four main on-screen components:</p>
      <ul>
        <li><b>Right bar:</b> Shows information about the selected device, edge or packet.</li>
        <li><b>Left bar:</b> Contains buttons to add devices to the network.</li>
        <li><b>Canvas:</b> The main area where the network is built and displayed.</li>
        <li><b>Top bar:</b> Simulation controls, file operations, help, and settings.</li>
      </ul>

      <h4 class="default-info-subsection">Left Bar</h4>
      <p>Add devices by clicking their buttons. Devices appear in the center of the canvas.</p>
      <ul>
        <li><b>Host:</b> End device that sends/receives packets.</li>
        <li><b>Router:</b> Forwards packets between networks.</li>
        <li><b>Switch:</b> Forwards packets within a local network using MAC addresses.</li>
      </ul>
      <p>The available devices depend on the selected network layer:</p>
      <ul>
        <li><b>App Layer:</b> Host</li>
        <li><b>Transport Layer:</b> Host</li>
        <li><b>Network Layer:</b> Host, Router</li>
        <li><b>Link Layer:</b> Host, Router, Switch</li>
      </ul>

      <h4 class="default-info-subsection">Right Bar</h4>
      <p>Displays context-sensitive information for the selected item in the canvas. Click a device, edge or packet to inspect it.</p>

      <h4 class="default-info-subsection">Top Bar</h4>
      <p>Provides control over the simulation and file operations:</p>
      <ul>
        <li><b>New:</b> Reset the current network.</li>
        <li><b>Save:</b> Download the network as a JSON file.</li>
        <li><b>Load:</b> Upload a network from a JSON file.</li>
        <li><b>Print:</b> Save a PNG snapshot of the canvas.</li>
        <li><b>Help:</b> View shortcuts and settings.</li>
      </ul>

      <h4 class="default-info-subsection">Canvas</h4>
      <p>The main area where you interact with the network. You can:</p>
      <ul>
        <li>Drag and position devices</li>
        <li>Zoom in/out with the mouse wheel</li>
        <li>Observe packet flow across the network</li>
      </ul>
      <p>Canvas controls above the network area include:</p>
      <ul>
        <li><b>Play/Pause:</b> Start or stop the simulation</li>
        <li><b>Undo/Redo:</b> Fix recent actions</li>
        <li><b>Packet Speed:</b> Adjust how fast packets travel</li>
        <li><b>Layer Selection:</b> Switch between OSI layers</li>
      </ul>

      <h3 class="default-info-section">GitHub</h3>
      <p>GEduNet is open-source! You can find the full project on GitHub:</p>
      <a class="default-info-link" href="https://github.com/MegaRedHand/network-simulator" target="_blank" rel="noopener">View on GitHub</a>
    </div>
  `;
  }

  showDefaultInfo() {
    const infoContent = document.getElementById("info-content");
    if (infoContent) {
      infoContent.innerHTML = this.getDefaultInfoHtml();
    }
  }
}
