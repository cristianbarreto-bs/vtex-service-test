import { JanusClient } from "@vtex/api";
import type { IOContext, InstanceOptions } from "@vtex/api";

interface SimulationItem {
  id: string,
  quantity: number,
  seller: string
}

interface SimulationParams {
  country?: string,
  items: SimulationItem[],
  postalCode?: string
}

export class Checkout extends JanusClient {
  constructor(ctx: IOContext, options?: InstanceOptions) {
    super(ctx, {
      ...options,
      headers: {
        VtexIdclientAutCookie: `${ctx.adminUserAuthToken ||
          ctx.storeUserAuthToken ||
          ctx.authToken}`
      },
    });
  }

  public async orderSimulation(orderForm: SimulationParams) {
    if(!orderForm.country) {
      orderForm.country = "COL"
    }

    if(!orderForm.postalCode) {
      orderForm.postalCode = "110001"
    }

    return this.http.post(`/api/checkout/pub/orderForms/simulation`, orderForm, {
      metric: "checkout-orderSimulation",
    });
  }
}
