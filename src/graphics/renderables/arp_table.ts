import { DeviceId } from "../../types/graphs/datagraph";
import { ViewGraph } from "../../types/graphs/viewgraph";
import {
  clearArpTable,
  getArpTable,
  removeArpTableEntry,
  saveARPTManualChange,
} from "../../types/network-modules/arp_table";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
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

    const { onEdit, onRegenerate, onDelete } = this.setArpTableCallbacks();

    // Create the regenerate button
    const regenerateButton = this.createRegenerateButton(onRegenerate);

    const headers = {
      [TOOLTIP_KEYS.IP]: TOOLTIP_KEYS.IP,
      [TOOLTIP_KEYS.MAC_ADDRESS]: TOOLTIP_KEYS.MAC_ADDRESS,
      [TOOLTIP_KEYS.REGENERATE]: regenerateButton, // Add the regenerate button to the header
    };

    this.table = new Table({
      headers: headers,
      fieldsPerRow: 2, // IP and MAC
      rows: props.rows,
      editableColumns: [false, true], // Make the MAC address column editable
      onEdit: onEdit,
      onDelete: onDelete,
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
      edited: false,
    }));

    this.updateRows(newRows);

    showSuccess(ALERT_MESSAGES.ARP_TABLE_REGENERATED);
  }

  private setArpTableCallbacks() {
    const dataGraph = this.props.viewgraph.getDataGraph();
    const onDelete = (row: number) => {
      const arpTable = getArpTable(dataGraph, this.props.deviceId);

      // Validar que el índice es válido
      if (row < 0 || row >= arpTable.length) {
        console.warn(`Invalid row index: ${row}`);
        return false;
      }
      const ip = arpTable[row].ip;

      removeArpTableEntry(dataGraph, this.props.deviceId, ip);

      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating ARP table...");
      this.OnRegenerate();
    };

    const onEdit = (row: number, _col: number, newValue: string) => {
      const isValidMac = isValidMAC(newValue);

      if (!isValidMac) {
        console.warn(`Invalid value: ${newValue}`);
        return false;
      }

      // Obtener la tabla ARP actual
      const arpTable = getArpTable(dataGraph, this.props.deviceId);

      // Validar que el índice es válido
      if (row < 0 || row >= arpTable.length) {
        console.warn(`Invalid row index: ${row}`);
        return false;
      }

      // Obtener la IP correspondiente a la fila
      const ip = arpTable[row].ip;

      // Update the ARP table entry
      saveARPTManualChange(dataGraph, this.props.deviceId, ip, newValue);
      this.refreshTable();

      return true;
    };

    return { onEdit, onRegenerate, onDelete };
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

function isValidMAC(mac: string): boolean {
  // Expresión regular para validar direcciones MAC en formato estándar (XX:XX:XX:XX:XX:XX)
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

  const result = macRegex.test(mac);
  // Verificar si la dirección MAC coincide con el formato esperado
  if (!result) {
    showError(ALERT_MESSAGES.INVALID_MAC);
  }

  return result;
}
