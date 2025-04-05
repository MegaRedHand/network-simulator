import { Table } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { Button } from "../basic_components/button";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { DeviceId } from "../../types/graphs/datagraph";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";

export interface RoutingTableProps {
  rows: string[][]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class RoutingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: RoutingTableProps) {
    this.container = document.createElement("div");
    this.container.className = CSS_CLASSES.ROUTING_TABLE_CONTAINER;

    const { onEdit, onDelete, onRegenerate } = this.setRoutingTableCallbacks(
      props.viewgraph,
      props.deviceId,
    );

    // Create the regenerate button
    const regenerateButton = this.createRegenerateButton(onRegenerate);

    const headers = {
      [TOOLTIP_KEYS.IP]: TOOLTIP_KEYS.IP,
      [TOOLTIP_KEYS.MASK]: TOOLTIP_KEYS.MASK,
      [TOOLTIP_KEYS.INTERFACE]: TOOLTIP_KEYS.INTERFACE,
      [TOOLTIP_KEYS.REGENERATE]: regenerateButton, // Add the regenerate button to the header
    };

    this.table = new Table({
      headers: headers,
      rows: props.rows,
      editableColumns: [false, true, true, false], // Make the last column non-editable
      onEdit: onEdit,
      onDelete: onDelete,
      tableClasses: [CSS_CLASSES.RIGHT_BAR_TABLE, CSS_CLASSES.HIDDEN],
    });

    this.toggleButton = new ToggleButton({
      text: TOOLTIP_KEYS.ROUTING_TABLE,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      onToggle: (isToggled) => {
        const tableElement = this.table.render();
        tableElement.classList.toggle(CSS_CLASSES.HIDDEN, !isToggled);
      },
      tooltip: TOOLTIP_KEYS.ROUTING_TABLE,
    });

    this.initialize();
  }

  private initialize(): void {
    this.container.appendChild(this.toggleButton.render());
    this.container.appendChild(this.table.render());
  }

  render(): HTMLElement {
    return this.container;
  }

  updateRows(newRows: string[][]): void {
    this.table.updateRows(newRows); // Use the new method in Table
  }

  // Function to create the regenerate button
  private createRegenerateButton(
    onRegenerateCallback: () => void,
  ): HTMLButtonElement {
    const regenerateAllButton = new Button({
      text: "🔄",
      className: CSS_CLASSES.REGENERATE_BUTTON,
      onClick: onRegenerateCallback,
    });

    return regenerateAllButton.render();
  }

  private OnRegenerate(): void {
    const newTableData = this.props.viewgraph
      .getDataGraph()
      .regenerateRoutingTableClean(this.props.deviceId);

    if (!newTableData.length) {
      console.warn("Failed to regenerate routing table.");
      return;
    }

    const newRows = newTableData.map((entry) => [
      entry.ip,
      entry.mask,
      `eth${entry.iface}`,
    ]);

    this.updateRows(newRows);
  }

  private setRoutingTableCallbacks(viewgraph: ViewGraph, deviceId: DeviceId) {
    const onEdit = (row: number, col: number, newValue: string) => {
      let isValid = false;
      if (
        col === ROUTER_CONSTANTS.IP_COL_INDEX ||
        col === ROUTER_CONSTANTS.MASK_COL_INDEX
      )
        isValid = isValidIP(newValue);
      else if (col === ROUTER_CONSTANTS.INTERFACE_COL_INDEX)
        isValid = isValidInterface(newValue);

      if (isValid) {
        viewgraph.getDataGraph().saveManualChange(deviceId, row, col, newValue);
      }
      return isValid;
    };

    const onDelete = (row: number) => {
      viewgraph.getDataGraph().removeRoutingTableRow(deviceId, row);
      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating routing table...");
      this.OnRegenerate();
    };

    return { onEdit, onDelete, onRegenerate };
  }
}

// Function to validate IP format
function isValidIP(ip: string): boolean {
  const ipPattern =
    /^(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|1?[0-9][0-9]?)$/;
  return ipPattern.test(ip);
}

// Function to validate Interface format (ethX where X is a number)
function isValidInterface(interfaceStr: string): boolean {
  const interfacePattern = /^eth[0-9]+$/;
  return interfacePattern.test(interfaceStr);
}
