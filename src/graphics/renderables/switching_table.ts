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
import {
  InvalidMacError,
  InvalidPortError,
  SWITCHING_TABLE_CONSTANTS,
} from "../../utils/constants/table_constants";
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
      editableColumns: [true, true],
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
      const mac = rowHash[TOOLTIP_KEYS.MAC_ADDRESS];
      if (!mac) {
        console.warn("MAC address not found in row.");
        return false;
      }

      try {
        const changed = saveSwitchingTableManualChange(
          dataGraph,
          this.props.deviceId,
          mac,
          col,
          newValue.trim(),
        );
        if (!changed) {
          return false;
        }
        this.refreshTable();
        showSuccess(ALERT_MESSAGES.SWITCHING_TABLE_ENTRY_EDITED);
        return true;
      } catch (e) {
        if (e instanceof InvalidMacError) {
          showError(ALERT_MESSAGES.INVALID_MAC);
        } else if (e instanceof InvalidPortError) {
          showError(ALERT_MESSAGES.INVALID_PORT);
        } else {
          console.error("Unexpected error:", e);
        }
        return false;
      }
    };

    const onAddRow = (values: string[]) => {
      const [mac, portStr] = values;

      try {
        const changed = saveSwitchingTableManualChange(
          this.props.viewgraph.getDataGraph(),
          this.props.deviceId,
          mac.trim(),
          SWITCHING_TABLE_CONSTANTS.PORT_COL_INDEX,
          portStr.trim(),
        );
        if (!changed) {
          return false;
        }
        this.refreshTable();
        showSuccess(ALERT_MESSAGES.SWITCHING_TABLE_ENTRY_ADDED);
        return true;
      } catch (e) {
        if (e instanceof InvalidMacError) {
          showError(ALERT_MESSAGES.INVALID_MAC);
        } else if (e instanceof InvalidPortError) {
          showError(ALERT_MESSAGES.INVALID_PORT);
        } else {
          console.warn("Unexpected error:", e);
        }
        return false;
      }
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
