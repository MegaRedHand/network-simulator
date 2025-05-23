import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Table } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { showError, showSuccess } from "./alert_manager";

export interface SwitchingTableProps {
  rows: string[][]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class SwitchingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: SwitchingTableProps) {
    this.container = document.createElement("div");

    const { onEdit, onRegenerate, onDelete } =
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

  updateRows(newRows: string[][]): void {
    this.table.updateRows(newRows); // Update the table with new rows
  }

  private createRegenerateButton(
    onRegenerateCallback: () => void,
  ): HTMLButtonElement {
    const regenerateButton = new Button({
      text: "🔄",
      classList: [CSS_CLASSES.REGENERATE_BUTTON],
      onClick: onRegenerateCallback,
    });

    return regenerateButton.toHTML();
  }

  private OnRegenerate(): void {
    const dataGraph = this.props.viewgraph.getDataGraph();

    // clear the current switching table
    dataGraph.clearSwitchingTable(this.props.deviceId);

    this.updateRows([]);

    showSuccess(ALERT_MESSAGES.SWITCHING_TABLE_CLEARED);
  }

  private setSwitchingTableCallbacks() {
    const onDelete = (row: number) => {
      // Get the current switching table
      const switchingTable = this.props.viewgraph
        .getDataGraph()
        .getSwitchingTable(this.props.deviceId);

      // Validate that the index is valid
      if (row < 0 || row >= switchingTable.length) {
        console.warn(`Invalid row index: ${row}`);
        return false;
      }

      // Get the MAC corresponding to the row
      const mac = switchingTable[row].mac;

      // Remove the entry from the switching table using the MAC
      this.props.viewgraph
        .getDataGraph()
        .removeSwitchingTableEntry(this.props.deviceId, mac);

      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating Switching Table...");
      this.OnRegenerate();
    };

    const onEdit = (row: number, _col: number, newValue: string) => {
      const isValidPort = isValidPortNumber(newValue);

      if (!isValidPort) {
        console.warn(`Invalid value: ${newValue}`);
        return false;
      }

      // Get the current switching table
      const switchingTable = this.props.viewgraph
        .getDataGraph()
        .getSwitchingTable(this.props.deviceId);

      // Validate that the index is valid
      if (row < 0 || row >= switchingTable.length) {
        console.warn(`Invalid row index: ${row}`);
        return false;
      }

      // Get the MAC corresponding to the row
      const mac = switchingTable[row].mac;

      // Update the Switching Table entry
      this.props.viewgraph
        .getDataGraph()
        .saveSwitchingTableManualChange(
          this.props.deviceId,
          mac,
          parseInt(newValue, 10),
        );

      return true;
    };

    return { onEdit, onRegenerate, onDelete };
  }

  refreshTable(): void {
    const updatedEntries = this.props.viewgraph
      .getDataGraph()
      .getSwitchingTable(this.props.deviceId);

    const updatedRows = updatedEntries.map((entry) => [
      entry.mac.toString(),
      entry.port.toString(),
    ]);

    this.updateRows(updatedRows);
  }
}

function isValidPortNumber(port: string): boolean {
  // verify if the port is a number
  const portNumber = parseInt(port, 10);
  const isValid = !isNaN(portNumber) && portNumber > 0;

  if (!isValid) {
    showError(ALERT_MESSAGES.INVALID_PORT);
  }

  return isValid;
}
