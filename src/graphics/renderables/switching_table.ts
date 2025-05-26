import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import {
  clearSwitchingTable,
  getSwitchingTable,
  removeSwitchingTableEntry,
  saveSwitchingTableManualChange,
} from "../../types/network-modules/tables/switching_table";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Table, TableRow } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { showError, showSuccess } from "./alert_manager";

export interface SwitchingTableProps {
  rows: TableRow[]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class SwitchingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: SwitchingTableProps) {
    this.container = document.createElement("div");

    const { onEdit, onRegenerate, onDelete, onAddRow } =
      this.setSwitchingTableCallbacks();

    // Create the regenerate button
    const regenerateButton = this.createRegenerateButton(onRegenerate);

    const headers = {
      [TOOLTIP_KEYS.MAC_ADDRESS]: TOOLTIP_KEYS.MAC_ADDRESS,
      [TOOLTIP_KEYS.PORT]: TOOLTIP_KEYS.PORT,
      [TOOLTIP_KEYS.REGENERATE]: regenerateButton, // Add the regenerate button to the header
    };

    this.table = new Table({
      headers: headers,
      fieldsPerRow: 2, // MAC and Port
      rows: props.rows,
      editableColumns: [false, true], // Make the Port column editable
      onEdit: onEdit,
      onDelete: onDelete,
      onAddRow: onAddRow,
      tableClasses: [CSS_CLASSES.TABLE, CSS_CLASSES.RIGHT_BAR_TABLE],
    });

    this.toggleButton = new ToggleButton({
      text: TOOLTIP_KEYS.SWITCHING_TABLE,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      onToggle: (isToggled) => {
        const tableElement = this.table.toHTML();
        tableElement.style.display = isToggled ? "block" : "none";
      },
      tooltip: TOOLTIP_KEYS.SWITCHING_TABLE,
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

  updateRows(newRows: TableRow[]): void {
    this.table.updateRows(newRows); // Update the table with new rows
  }

  private createRegenerateButton(
    onRegenerateCallback: () => void,
  ): HTMLButtonElement {
    const regenerateButton = new Button({
      text: "🔄",
      classList: [CSS_CLASSES.TABLE_BUTTON],
      onClick: onRegenerateCallback,
    });

    return regenerateButton.toHTML();
  }

  private OnRegenerate(): void {
    const dataGraph = this.props.viewgraph.getDataGraph();

    // clear the current switching table
    clearSwitchingTable(dataGraph, this.props.deviceId);

    this.updateRows([]);

    showSuccess(ALERT_MESSAGES.SWITCHING_TABLE_CLEARED);
  }

  private setSwitchingTableCallbacks() {
    const dataGraph = this.props.viewgraph.getDataGraph();
    const onDelete = (mac: string) => {
      removeSwitchingTableEntry(dataGraph, this.props.deviceId, mac);
      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating Switching Table...");
      this.OnRegenerate();
    };

    const onEdit = (
      col: number,
      newValue: string,
      rowHash: Record<string, string>,
    ) => {
      // Only the port column should be editable
      if (col !== 1) return false;

      const isValidPort = isValidPortNumber(newValue);
      if (!isValidPort) {
        console.warn(`Invalid value: ${newValue}`);
        return false;
      }

      const mac = rowHash[TOOLTIP_KEYS.MAC_ADDRESS];
      if (!mac) {
        console.warn("MAC address not found in row.");
        return false;
      }

      saveSwitchingTableManualChange(
        dataGraph,
        this.props.deviceId,
        mac,
        parseInt(newValue, 10),
      );

      this.refreshTable();
      return true;
    };

    const onAddRow = (values: string[]) => {
      const [mac, portStr] = values;

      if (!mac || !portStr || !/^[0-9a-fA-F:]{17}$/.test(mac.trim())) {
        showError(ALERT_MESSAGES.INVALID_MAC);
        return false;
      }
      const port = parseInt(portStr, 10);
      if (isNaN(port) || port <= 0) {
        showError(ALERT_MESSAGES.INVALID_PORT);
        return false;
      }

      saveSwitchingTableManualChange(
        this.props.viewgraph.getDataGraph(),
        this.props.deviceId,
        mac.trim(),
        port,
      );

      this.refreshTable();
      return true;
    };

    return { onEdit, onRegenerate, onDelete, onAddRow };
  }

  refreshTable(): void {
    const dataGraph = this.props.viewgraph.getDataGraph();
    const updatedEntries = getSwitchingTable(dataGraph, this.props.deviceId);

    const updatedRows = updatedEntries.map((entry) => ({
      values: [entry.mac.toString(), entry.port.toString()],
      edited: entry.edited,
    }));

    this.updateRows(updatedRows);
  }
}

function isValidPortNumber(port: string): boolean {
  // verify if the port is a number
  const portNumber = parseInt(port, 10);
  const isValid = !isNaN(portNumber);

  if (!isValid) {
    showError(ALERT_MESSAGES.INVALID_PORT);
  }

  return isValid;
}
