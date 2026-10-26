import { describe, expect, it } from "vitest";
import { fetchClient } from "@/lib/api/client";
import contract from "../../openapi/openapi.json";

describe("contract-driven mocks", () => {
  it("answer GET /me with the contract example verbatim", async () => {
    const { data, response } = await fetchClient.GET("/me");
    expect(response.status).toBe(200);
    expect(data).toEqual(contract.paths["/me"].get.responses["200"].content["application/json"].examples.default.value);
    expect(data?.memberNo).toBe("CE-123456-7");
  });

  it("answer POST /quotes/estimate with the documented 201 example and its backend-computed totals", async () => {
    const { data, response } = await fetchClient.POST("/quotes/estimate", {
      body: {
        destination: { region: "AKL", cityId: "akl" },
        cartons: [{ lengthCm: "30", widthCm: "20", heightCm: "20", weightKg: "7", quantity: 1 }],
        declaredValueNzd: "250.00",
      },
    });
    expect(response.status).toBe(201);
    const parcel = data?.options.find((o) => o.product === "SEA_PARCEL");
    expect(parcel?.totals).toEqual([{ currency: "NZD", amountExGst: "26.00", gstApplies: true }]);
    expect(data?.options.find((o) => o.product === "AIR")?.status).toBe("REQUIRES_REVIEW");
  });

  it("open the example whose id matches the path, so a list entry shows its own detail", async () => {
    const list = await fetchClient.GET("/shipments");
    const held = list.data?.find((card) => card.exception === "CUSTOMS_HELD");
    const { data } = await fetchClient.GET("/shipments/{shipmentId}", { params: { path: { shipmentId: held!.id } } });
    expect(data?.shipmentNo).toBe("CE-S2610-0002");
    expect(data?.status).toBe("customs_held");
  });

  it("match an example by a non-id field such as preNoticeId", async () => {
    const { data } = await fetchClient.GET("/pre-notices/{preNoticeId}/handling", {
      params: { path: { preNoticeId: "0193a5d0-3333-7000-8000-000000000001" } },
    });
    expect(data?.parcels).toEqual([]);
  });

  it("fall back to the first example for an id the contract does not list", async () => {
    const { data } = await fetchClient.GET("/shipments/{shipmentId}", {
      params: { path: { shipmentId: "0193a5e0-5555-7000-8000-0000000000ff" } },
    });
    expect(data?.shipmentNo).toBe("CE-S2610-0001");
  });

  it("answer a 204 operation with no body", async () => {
    const { response } = await fetchClient.POST("/leads/touch", {
      body: { visitorId: "8f0c2d4e-6a1b-4c3d-9e8f-0a1b2c3d4e5f", stage: "LANDING", source: {}, path: "/" },
    });
    expect(response.status).toBe(204);
  });
});
