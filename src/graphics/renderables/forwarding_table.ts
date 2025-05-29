import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import {
  clearForwardingTable,
  getForwardingTable,
  removeForwardingTableEntry,
  saveForwardingTableManualChange,
} from "../../types/network-modules/tables/forwarding_table";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import {
  InvalidMacError,
  InvalidPortError,
  FORWARDING_TABLE_CONSTANTS,
} from "../../utils/constants/table_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Table, TableRow } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { showError, showSuccess } from "./alert_manager";

export interface ForwardingTableProps {
  rows: TableRow[]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class ForwardingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: ForwardingTableProps) {
    this.container = document.createElement("div");

    const { onEdit, onRegenerate, onDelete, onAddRow } =
      this.setForwardingTableCallbacks();

    // Create the regenerate button
    const regenerateButton = this.createRegenerateButton(onRegenerate);

    const headers = {
      [TOOLTIP_KEYS.MAC_ADDRESS]: TOOLTIP_KEYS.MAC_ADDRESS,
      [TOOLTIP_KEYS.INTERFACE]: TOOLTIP_KEYS.INTERFACE,
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
      text: TOOLTIP_KEYS.FORWARDING_TABLE,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      onToggle: (isToggled) => {
        const tableElement = this.table.toHTML();
        tableElement.style.display = isToggled ? "block" : "none";
      },
      tooltip: TOOLTIP_KEYS.FORWARDING_TABLE,
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

    // clear the current forwarding table
    clearForwardingTable(dataGraph, this.props.deviceId);

    this.updateRows([]);

    showSuccess(ALERT_MESSAGES.FORWARDING_TABLE_REGENERATED);
  }

  private setForwardingTableCallbacks() {
    const dataGraph = this.props.viewgraph.getDataGraph();
    const onDelete = (mac: string) => {
      removeForwardingTableEntry(dataGraph, this.props.deviceId, mac);
      showSuccess(ALERT_MESSAGES.FORWARDING_TABLE_ENTRY_DELETED);
      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating Forwarding Table...");
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
        const changed = saveForwardingTableManualChange(
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
        showSuccess(ALERT_MESSAGES.FORWARDING_TABLE_ENTRY_EDITED);
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
        const changed = saveForwardingTableManualChange(
          this.props.viewgraph.getDataGraph(),
          this.props.deviceId,
          mac.trim(),
          FORWARDING_TABLE_CONSTANTS.PORT_COL_INDEX,
          portStr.trim(),
        );
        if (!changed) {
          return false;
        }
        this.refreshTable();
        showSuccess(ALERT_MESSAGES.FORWARDING_TABLE_ENTRY_ADDED);
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
    const updatedEntries = getForwardingTable(dataGraph, this.props.deviceId);

    const updatedRows = updatedEntries.map((entry) => ({
      values: [entry.mac.toString(), entry.port.toString()],
      edited: entry.edited,
    }));

    this.updateRows(updatedRows);
  }
}
