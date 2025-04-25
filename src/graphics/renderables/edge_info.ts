import { Edge } from "../../types/edge";
import { RemoveEdgeMove } from "../../types/undo-redo";
import { urManager } from "../../types/viewportManager";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { BaseInfo } from "./base_info";
import { Dropdown } from "../basic_components/dropdown";

export class EdgeInfo extends BaseInfo {
  readonly edge: Edge;

  constructor(edge: Edge) {
    super(TOOLTIP_KEYS.EDGE_INFORMATION);
    this.edge = edge;
    this.addCommonInfoFields();
    this.addInterfaceDropdowns();
  }

  protected addCommonInfoFields(): void {
    const from = this.edge.data.from.id;
    const to = this.edge.data.to.id;

    // Get the connected devices
    const fromDevice = this.edge.viewgraph.getDataGraph().getDevice(from);
    const toDevice = this.edge.viewgraph.getDataGraph().getDevice(to);

    if (!fromDevice || !toDevice) {
      console.error("One of the devices is not found in the viewgraph.");
      return;
    }

    // Get the connected interfaces
    const fromInterface = fromDevice.interfaces[this.edge.data.from.iface];
    const toInterface = toDevice.interfaces[this.edge.data.to.iface];

    if (!fromInterface || !toInterface) {
      console.error("One of the interfaces is not found.");
      return;
    }

    // Add basic information about the edge
    this.information.addField(
      "Connected Devices",
      `${from} ↔️ ${to}`,
      TOOLTIP_KEYS.EDGE_CONNECTED_DEVICES,
    );
    this.information.addField(
      "Connected Interfaces",
      `${fromInterface.name} ↔️ ${toInterface.name}`,
      TOOLTIP_KEYS.EDGE_CONNECTED_INTERFACES,
    );
    // Add MAC addresses as separate fields
    this.information.addField(
      `MAC Address iface (Device ${from})`,
      fromInterface.mac.octets.join(":"),
      TOOLTIP_KEYS.MAC_ADDRESS_IFACE,
    );
    this.information.addField(
      `MAC Address iface (Device ${to})`,
      toInterface.mac.octets.join(":"),
      TOOLTIP_KEYS.MAC_ADDRESS_IFACE,
    );
  }

  protected addCommonButtons(): void {
    // Button to delete the edge
    const deleteEdgeButton = new Button({
      text: TOOLTIP_KEYS.DELETE_EDGE_BUTTON,
      onClick: () => {
        const viewgraph = this.edge.viewgraph;
        const from = this.edge.data.from.id;
        const to = this.edge.data.to.id;
        const move = new RemoveEdgeMove(viewgraph.getLayer(), from, to);

        urManager.push(viewgraph, move);
      },
      classList: [
        CSS_CLASSES.RIGHT_BAR_BUTTON,
        CSS_CLASSES.RIGHT_BAR_DELETE_BUTTON,
      ],
      tooltip: TOOLTIP_KEYS.DELETE_EDGE_BUTTON,
    });

    // Add the button to the inputFields array
    this.inputFields.push(deleteEdgeButton.toHTML());
  }

  protected addInterfaceDropdowns(): void {
    const from = this.edge.data.from.id;
    const to = this.edge.data.to.id;

    // Dropdown for selecting the interface for "from" device
    const fromIfaceDropdown = new Dropdown({
      label: `Interface (Device ${from})`,
      tooltip: TOOLTIP_KEYS.IFACE_EDITOR,
      options: [
        {
          value: this.edge.data.from.iface.toString(),
          text: `eth${this.edge.data.from.iface}`,
        },
        ...this.edge
          .getDeviceFreeIfaces(from)
          .filter((iface) => iface !== this.edge.data.from.iface)
          .map((iface) => ({ value: iface.toString(), text: `eth${iface}` })),
      ],
      default_text: "Iface",
      onchange: (value) => {
        const iface = parseInt(value, 10);
        this.edge.setInterface(from, iface);
        console.log(`Updated interface for device ${from}: eth${iface}`);
        this.edge.showInfo();
      },
    });

    fromIfaceDropdown.setValue(this.edge.data.from.iface.toString());

    // Dropdown for selecting the interface for "to" device
    const toIfaceDropdown = new Dropdown({
      label: `Interface (Device ${to})`,
      tooltip: TOOLTIP_KEYS.IFACE_EDITOR,
      options: [
        {
          value: this.edge.data.to.iface.toString(),
          text: `eth${this.edge.data.to.iface}`,
        },
        ...this.edge
          .getDeviceFreeIfaces(to)
          .filter((iface) => iface !== this.edge.data.to.iface)
          .map((iface) => ({ value: iface.toString(), text: `eth${iface}` })),
      ],
      default_text: "Iface",
      onchange: (value) => {
        const iface = parseInt(value, 10);
        this.edge.setInterface(to, iface);
        console.log(`Updated interface for device ${to}: eth${iface}`);
        this.edge.showInfo();
      },
    });

    toIfaceDropdown.setValue(this.edge.data.to.iface.toString());

    // Add the dropdowns to the inputFields array
    this.inputFields.push(fromIfaceDropdown.toHTML(), toIfaceDropdown.toHTML());
  }
}
