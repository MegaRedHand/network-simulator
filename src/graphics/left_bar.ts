export class LeftBar {
  private leftBar: HTMLElement;

  constructor(leftBar: HTMLElement) {
    this.leftBar = leftBar;
  }

  static getFrom(document: Document) {
    return new LeftBar(document.getElementById("left-bar"));
  }

  addButton(src: string, onClick: () => void, label: string) {
    const button = document.createElement("button");
    button.classList.add("icon-button");
    button.setAttribute("title", label); // Shows Text

    button.onclick = onClick;
    this.leftBar.appendChild(button);

    const img = document.createElement("img");
    img.src = src;
    img.classList.add("icon-img");
    button.appendChild(img);
  }

  clear() {
    this.leftBar.textContent = "";
  }
}
