import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import {
  clearArpTable,
  getArpTable,
  removeArpTableEntry,
  saveARPTManualChange,
} from "../../types/network-modules/tables/arp_table";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import {
  ARP_TABLE_CONSTANTS,
  InvalidIpError,
  InvalidMacError,
} from "../../utils/constants/table_constants";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { Button } from "../basic_components/button";
import { Table, TableRow } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { showError, showSuccess } from "./alert_manager";

export interface ArpTableProps {
  rows: TableRow[]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class ArpTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: ArpTableProps) {
    this.container = document.createElement("div");

    const { onEdit, onRegenerate, onDelete, onAddRow } =
      this.setArpTableCallbacks();

    // Create the regenerate button
    const regenerateButton = this.createRegenerateButton(onRegenerate);

    const headers = {
      [TOOLTIP_KEYS.IP]: TOOLTIP_KEYS.IP,
      [TOOLTIP_KEYS.MAC_ADDRESS]: TOOLTIP_KEYS.MAC_ADDRESS,
      [TOOLTIP_KEYS.REGENERATE]: regenerateButton, // Add the regenerate button to the header
    };

    this.table = new Table({
      headers: headers,
      fieldsPerRow: ARP_TABLE_CONSTANTS.TABLE_FIELDS_PER_ROW, // IP and MAC
      rows: props.rows,
      editableColumns: [true, true], // Make the MAC address column editable
      onEdit: onEdit,
      onDelete: onDelete,
      onAddRow: onAddRow,
      tableClasses: [CSS_CLASSES.TABLE, CSS_CLASSES.RIGHT_BAR_TABLE],
    });

    this.toggleButton = new ToggleButton({
      text: TOOLTIP_KEYS.ARP_TABLE,
      className: CSS_CLASSES.RIGHT_BAR_TOGGLE_BUTTON,
      onToggle: (isToggled) => {
        const tableElement = this.table.toHTML();
        tableElement.style.display = isToggled ? "block" : "none";
      },
      tooltip: TOOLTIP_KEYS.ARP_TABLE,
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

  // Function to create the regenerate button
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

    clearArpTable(dataGraph, this.props.deviceId);

    const newTableData = getArpTable(dataGraph, this.props.deviceId);

    if (!newTableData || newTableData.length === 0) {
      console.warn("Failed to regenerate ARP table.");
      showError(ALERT_MESSAGES.ARP_TABLE_REGENERATE_FAILED);
      return;
    }

    // Convert ARP table entries to rows
    const newRows = newTableData.map((entry) => ({
      values: [entry.ip, entry.mac],
      edited: entry.edited ?? false,
    }));

    this.updateRows(newRows);

    showSuccess(ALERT_MESSAGES.ARP_TABLE_REGENERATED);
  }

  private setArpTableCallbacks() {
    const dataGraph = this.props.viewgraph.getDataGraph();

    const onDelete = (ip: string) => {
      removeArpTableEntry(dataGraph, this.props.deviceId, ip);
      showSuccess(ALERT_MESSAGES.ARP_TABLE_ENTRY_DELETED);
      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating ARP table...");
      this.OnRegenerate();
    };

    const onEdit = (
      col: number,
      newValue: string,
      rowHash: Record<string, string>,
    ) => {
      const ip = rowHash[TOOLTIP_KEYS.IP];
      if (!ip) {
        console.warn("IP not found in row.");
        return false;
      }

      try {
        const changed = saveARPTManualChange(
          dataGraph,
          this.props.deviceId,
          ip,
          col,
          newValue,
        );
        if (!changed) {
          return false;
        }
        this.refreshTable();
        showSuccess(ALERT_MESSAGES.ARP_TABLE_ENTRY_EDITED);
        return true;
      } catch (e) {
        if (e instanceof InvalidIpError) {
          showError(ALERT_MESSAGES.INVALID_IP);
        } else if (e instanceof InvalidMacError) {
          showError(ALERT_MESSAGES.INVALID_MAC);
        } else {
          console.warn("Unexpected error:", e);
        }
        return false;
      }
    };

    const onAddRow = (values: string[]) => {
      const [ip, mac] = values;

      try {
        const changed = saveARPTManualChange(
          this.props.viewgraph.getDataGraph(),
          this.props.deviceId,
          ip.trim(),
          ARP_TABLE_CONSTANTS.MAC_COL_INDEX,
          mac.trim(),
        );
        if (!changed) {
          return false;
        }
        this.refreshTable();
        showSuccess(ALERT_MESSAGES.ARP_TABLE_ENTRY_ADDED);
        return true;
      } catch (e) {
        if (e instanceof InvalidIpError) {
          showError(ALERT_MESSAGES.INVALID_IP);
        } else if (e instanceof InvalidMacError) {
          showError(ALERT_MESSAGES.INVALID_MAC);
        } else {
          console.warn("Unexpected error");
        }
        return false;
      }
    };

    return { onEdit, onRegenerate, onDelete, onAddRow };
  }

  refreshTable(): void {
    const dataGraph = this.props.viewgraph.getDataGraph();
    const updatedEntries = getArpTable(dataGraph, this.props.deviceId);

    const updatedRows = updatedEntries.map((entry) => ({
      values: [entry.ip, entry.mac],
      edited: entry.edited ?? false,
    }));

    this.updateRows(updatedRows);
  }
}
