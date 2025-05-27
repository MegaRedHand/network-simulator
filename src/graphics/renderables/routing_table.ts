import { Table, TableRow } from "../basic_components/table";
import { ToggleButton } from "../basic_components/toggle_button";
import { Button } from "../basic_components/button";
import { ViewGraph } from "../../types/graphs/viewgraph";
import { DeviceId } from "../../types/graphs/datagraph";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";
import { CSS_CLASSES } from "../../utils/constants/css_constants";
import { ALERT_MESSAGES } from "../../utils/constants/alert_constants";
import { showError, showSuccess } from "./alert_manager";
import {
  addRoutingTableEntry,
  regenerateRoutingTableClean,
  removeRoutingTableRow,
  saveRoutingTableManualChange,
} from "../../types/network-modules/tables/routing_table";
import { DataRouter } from "../../types/data-devices";
import {
  InvalidIfaceError,
  InvalidIpError,
  InvalidMaskError,
  ROUTER_TABLE_CONSTANTS,
} from "../../utils/constants/table_constants";

export interface RoutingTableProps {
  rows: TableRow[]; // Rows for the table
  viewgraph: ViewGraph; // ViewGraph instance for callbacks
  deviceId: DeviceId; // Device ID for callbacks
}

export class RoutingTable {
  private container: HTMLElement;
  private table: Table;
  private toggleButton: ToggleButton;

  constructor(private props: RoutingTableProps) {
    this.container = document.createElement("div");

    const { onEdit, onDelete, onRegenerate, onAddRow } =
      this.setRoutingTableCallbacks(props.viewgraph, props.deviceId);

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
      fieldsPerRow: ROUTER_TABLE_CONSTANTS.TABLE_FIELDS_PER_ROW,
      rows: props.rows,
      editableColumns: [true, true, true, false], // Make the last column non-editable
      onEdit: onEdit,
      onDelete: onDelete,
      onAddRow: onAddRow,
      tableClasses: [CSS_CLASSES.TABLE, CSS_CLASSES.RIGHT_BAR_TABLE],
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

  getRoutingTable(): TableRow[] {
    const router = this.props.viewgraph
      .getDataGraph()
      .getDevice(this.props.deviceId) as DataRouter;
    if (!router) {
      console.warn("Routing table not found.");
      return [];
    }
    return router.routingTable.all().map((entry) => ({
      values: [entry.ip, entry.mask, `eth${entry.iface}`],
      edited: entry.edited ?? false,
    }));
  }

  updateRows(): void {
    const newTableData = this.getRoutingTable();
    this.table.updateRows(newTableData);
  }

  // Function to create the regenerate button
  private createRegenerateButton(
    onRegenerateCallback: () => void,
  ): HTMLButtonElement {
    const regenerateAllButton = new Button({
      text: "🔄",
      classList: [CSS_CLASSES.TABLE_BUTTON],
      onClick: onRegenerateCallback,
    });

    return regenerateAllButton.toHTML();
  }

  private OnRegenerate(): void {
    regenerateRoutingTableClean(
      this.props.viewgraph.getDataGraph(),
      this.props.deviceId,
    );

    this.updateRows();

    showSuccess(ALERT_MESSAGES.ROUTING_TABLE_REGENERATED);
  }

  private setRoutingTableCallbacks(viewgraph: ViewGraph, deviceId: DeviceId) {
    const onEdit = (
      col: number,
      newValue: string,
      rowHash: Record<string, string>,
    ) => {
      const ip = rowHash[TOOLTIP_KEYS.IP];
      if (!ip) {
        console.warn("IP address not found in row.");
        return false;
      }

      try {
        const changed = saveRoutingTableManualChange(
          viewgraph.getDataGraph(),
          deviceId,
          ip,
          col,
          newValue,
        );
        if (!changed) {
          return false;
        }
        this.updateRows();
        return true;
      } catch (e) {
        if (e instanceof InvalidIpError) {
          showError(ALERT_MESSAGES.INVALID_IP);
        } else if (e instanceof InvalidMaskError) {
          showError(ALERT_MESSAGES.INVALID_MASK);
        } else if (e instanceof InvalidIfaceError) {
          showError(ALERT_MESSAGES.INVALID_IFACE);
        } else {
          console.warn("Unexpected error during routing table edit:", e);
        }
        return false;
      }
    };

    const onDelete = (key: string) => {
      removeRoutingTableRow(viewgraph.getDataGraph(), deviceId, key);
      return true;
    };

    const onRegenerate = () => {
      console.log("Regenerating routing table...");
      this.OnRegenerate();
    };

    const onAddRow = (values: string[]) => {
      const [ip, mask, ifaceStr] = values;

      try {
        addRoutingTableEntry(
          this.props.viewgraph.getDataGraph(),
          this.props.deviceId,
          ip,
          mask,
          ifaceStr,
        );
        this.updateRows();
        return true;
      } catch (e) {
        if (e instanceof InvalidIpError) {
          showError(ALERT_MESSAGES.INVALID_IP);
        } else if (e instanceof InvalidMaskError) {
          showError(ALERT_MESSAGES.INVALID_MASK);
        } else if (e instanceof InvalidIfaceError) {
          showError(ALERT_MESSAGES.INVALID_IFACE);
        } else {
          console.warn("Unexpected error during routing table add row:", e);
        }
        return false;
      }
    };

    return { onEdit, onDelete, onRegenerate, onAddRow };
  }
}
