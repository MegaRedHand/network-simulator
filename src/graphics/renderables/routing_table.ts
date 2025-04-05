import { Table } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { Button } from "../basic_components/button";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { DeviceId } from "../../types/graphs/datagraph";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";

export interface RoutingTableProps {
  rows: string[][]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
  onEdit?: (row: number, col: number, newValue: string) => boolean; // Callback for editing cells
  onDelete?: (row: number) => boolean; // Callback for deleting rows
  onRegenerate?: () => void; // Callback for regenerating the table
}

export class RoutingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: RoutingTableProps) {
    this.container = document.createElement("div");
    this.container.className = "routing-table-container";

    const { onEdit, onDelete } = routingTableCallbacks(
      props.viewgraph,
      props.deviceId,
    );

    // Create the regenerate button using the provided function
    const regenerateButton = this.createRegenerateButton();

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
      onEdit: props.onEdit || onEdit,
      onDelete: props.onDelete || onDelete,
      tableClasses: ["right-bar-table", "hidden"],
    });

    this.toggleButton = new ToggleButton({
      text: TOOLTIP_KEYS.ROUTING_TABLE,
      className: "right-bar-toggle-button",
      onToggle: (isToggled) => {
        const tableElement = this.table.render();
        if (isToggled) {
          tableElement.classList.remove("hidden");
        } else {
          tableElement.classList.add("hidden");
        }
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

  // Default behavior for regenerating the table
  private defaultOnRegenerate(): void {
    console.log(`Regenerating routing table for device ${this.props.deviceId}`);
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
    console.log("Routing table regenerated successfully.");
  }

  // Function to create the regenerate button
  createRegenerateButton(): HTMLButtonElement {
    const regenerateAllButton = new Button({
      text: "🔄",
      className: "regenerate-button",
      onClick: () => {
        console.log("Regenerating routing table...");
        this.defaultOnRegenerate(); // Call the instance method
      },
    });

    return regenerateAllButton.render();
  }
}

// Function to generate callbacks for RoutingTable
export function routingTableCallbacks(
  viewgraph: ViewGraph,
  deviceId: DeviceId,
) {
  const onEdit = (row: number, col: number, newValue: string) => {
    let isValid = false;
    if (col === 0) isValid = isValidIP(newValue);
    else if (col === 1) isValid = isValidIP(newValue);
    else if (col === 2) isValid = isValidInterface(newValue);

    if (isValid) {
      viewgraph.getDataGraph().saveManualChange(deviceId, row, col, newValue);
    }
    return isValid;
  };

  const onDelete = (row: number) => {
    viewgraph.getDataGraph().removeRoutingTableRow(deviceId, row);
    return true;
  };

  return { onEdit, onDelete };
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
