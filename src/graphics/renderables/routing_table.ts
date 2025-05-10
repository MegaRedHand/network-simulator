import { Table } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { Button } from "../basic_components/button";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { DeviceId } from "../../types/graphs/datagraph";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ROUTER_CONSTANTS } from "../../utils/constants/router_constants";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { showError, showSuccess } from "./alert_manager";

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
      fieldsPerRow: ROUTER_CONSTANTS.TABLE_FIELDS_PER_ROW,
      rows: props.rows,
      editableColumns: [false, true, true, false], // Make the last column non-editable
      onEdit: onEdit,
      onDelete: onDelete,
      tableClasses: [
        CSS_CLASSES.TABLE,
        CSS_CLASSES.RIGHT_BAR_TABLE,
        CSS_CLASSES.ROUTER_TABLE,
      ],
    });

    this.toggleButton = new ToggleButton({
      text: TOOLTIP_KEYS.ROUTING_TABLE,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      onToggle: (isToggled) => {
        const tableElement = this.table.toHTML();
        tableElement.style.display = isToggled ? "block" : "none";
      },
      tooltip: TOOLTIP_KEYS.ROUTING_TABLE,
    });

    // Initially hide the table
    const tableElement = this.table.toHTML();
    tableElement.style.display = "none";

    this.initialize();
  }

  private initialize(): void {
    this.container.appendChild(this.toggleButton.toHTML());
    this.container.appendChild(this.table.toHTML());
  }

  toHTML(): HTMLElement {
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
      classList: [CSS_CLASSES.REGENERATE_BUTTON],
      onClick: onRegenerateCallback,
    });

    return regenerateAllButton.toHTML();
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

    showSuccess(ALERT_MESSAGES.ROUTING_TABLE_REGENERATED);
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
        viewgraph
          .getDataGraph()
          .saveRTManualChange(deviceId, row, col, newValue);
        showSuccess(ALERT_MESSAGES.ROUTING_TABLE_UPDATED);
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
  const result = ipPattern.test(ip);
  if (!result) {
    showError(ALERT_MESSAGES.INVALID_IP_MASK);
  }
  return result;
}

// Function to validate Interface format (ethX where X is a number)
function isValidInterface(interfaceStr: string): boolean {
  const interfacePattern = /^eth[0-9]+$/;
  const result = interfacePattern.test(interfaceStr);
  if (!result) {
    showError(ALERT_MESSAGES.INVALID_IFACE);
  }
  return result;
}
