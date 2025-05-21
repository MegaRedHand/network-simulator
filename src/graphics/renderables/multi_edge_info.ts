import { Edge } from "../../types/edge";
import { BaseInfo } from "./base_info";
import { TOOLTIP_KEYS } from "../../utils/constants/tooltips_constants";

export class MultiEdgeInfo extends BaseInfo {
  protected addCommonInfoFields(): void {
    return;
  }
  protected addCommonButtons(): void {
    return;
  }
  readonly edges: Edge[];

  constructor(edges: Edge[]) {
    super(TOOLTIP_KEYS.EDGE_INFORMATION);
    this.edges = edges;
    this.addCombinedInfoFields();
  }

  protected addCombinedInfoFields(): void {
    const visibleDevices = new Set<number>();

    this.edges.forEach((edge) => {
      const fromDevice = edge.viewgraph.getDevice(edge.data.from.id);
      const toDevice = edge.viewgraph.getDevice(edge.data.to.id);

      if (fromDevice && fromDevice.isVisible()) {
        visibleDevices.add(fromDevice.id);
      }
      if (toDevice && toDevice.isVisible()) {
        visibleDevices.add(toDevice.id);
      }
    });

    this.information.addListField(
      "Connected Devices",
      Array.from(visibleDevices),
      TOOLTIP_KEYS.MULTI_EDGE_CONNECTED_DEVICES,
    );
  }
}
