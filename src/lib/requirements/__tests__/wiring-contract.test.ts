import { describe, expect, it } from "vitest";

import {
  deriveWiringObligations,
  auditWiringInSource,
  extractNavRouteTargets,
  parseRegisteredRoutes,
  auditFlowNavigation,
  type WiringObligation,
} from "../wiring-contract";
import type { PrdSpec } from "../prd-spec-types";

const SPEC: PrdSpec = {
  allComponentIds: ["CMP-001", "CMP-002"],
  pages: [
    {
      id: "PAGE-001",
      name: "Cart Page",
      route: "/cart",
      layoutRegions: ["Body"],
      staticElements: [],
      states: ["default"],
      interactiveComponents: [
        {
          id: "CMP-001",
          name: "Pay Now Button",
          type: "button",
          location: "Body",
          interaction: "Click",
          effect: "Calls POST /payments and navigates to /confirmation",
        },
        {
          id: "CMP-002",
          name: "Quantity Label",
          type: "label",
          location: "Body",
          interaction: "None (read-only)",
          effect: "Shows item count",
        },
      ],
    },
    {
      id: "PAGE-002",
      name: "Other Page",
      route: "/other",
      layoutRegions: [],
      staticElements: [],
      states: [],
      interactiveComponents: [
        {
          id: "CMP-099",
          name: "Unrelated",
          type: "button",
          location: "Body",
          interaction: "Click",
          effect: "x",
        },
      ],
    },
  ],
};

describe("deriveWiringObligations", () => {
  it("derives obligations for a covered PAGE (all its components)", () => {
    const obs = deriveWiringObligations(
      { coversRequirementIds: ["PAGE-001"] },
      SPEC,
    );
    expect(obs.map((o) => o.componentId).sort()).toEqual(["CMP-001", "CMP-002"]);
    expect(obs[0].route).toBe("/cart");
  });

  it("derives obligations for a covered CMP only", () => {
    const obs = deriveWiringObligations(
      { coversRequirementIds: ["CMP-001"] },
      SPEC,
    );
    expect(obs.map((o) => o.componentId)).toEqual(["CMP-001"]);
  });

  it("ignores pages/components the task does not cover", () => {
    const obs = deriveWiringObligations(
      { coversRequirementIds: ["PAGE-001"] },
      SPEC,
    );
    expect(obs.some((o) => o.componentId === "CMP-099")).toBe(false);
  });

  it("returns empty when task covers no PAGE/CMP ids or spec is empty", () => {
    expect(deriveWiringObligations({ coversRequirementIds: ["FR-01"] }, SPEC)).toEqual([]);
    expect(deriveWiringObligations({ coversRequirementIds: ["PAGE-001"] }, null)).toEqual([]);
  });
});

const OBLIGATIONS: WiringObligation[] = [
  {
    componentId: "CMP-001",
    name: "Pay Now Button",
    type: "button",
    interaction: "Click",
    effect: "Calls POST /payments",
    pageId: "PAGE-001",
    pageName: "Cart Page",
    route: "/cart",
  },
];

describe("auditWiringInSource", () => {
  it("flags an empty/stub handler", () => {
    const src = `export function CartPage(){ return <button onClick={() => {}}>Pay</button>; }`;
    const findings = auditWiringInSource(src, OBLIGATIONS);
    expect(findings).toHaveLength(1);
    expect(findings[0].id).toBe("PAGE-001");
    expect(findings[0].message).toMatch(/empty\/stub event handler/);
  });

  it("flags onClick={undefined}", () => {
    const src = `<button onClick={undefined}>Pay</button>`;
    expect(auditWiringInSource(src, OBLIGATIONS)).toHaveLength(1);
  });

  it("flags an interactive page with NO handlers at all (per actionable obligation)", () => {
    const src = `export function CartPage(){ return <div><button>Pay</button></div>; }`;
    const findings = auditWiringInSource(src, OBLIGATIONS);
    expect(findings).toHaveLength(1);
    expect(findings[0].componentId).toBe("CMP-001");
    expect(findings[0].message).toMatch(/no event handler wired/);
  });

  it("does NOT flag a page that wired a real handler", () => {
    const src = `
      export function CartPage(){
        const onPay = async () => { await client.post("/payments"); navigate("/confirmation"); };
        return <button onClick={onPay}>Pay</button>;
      }`;
    expect(auditWiringInSource(src, OBLIGATIONS)).toEqual([]);
  });

  it("does NOT flag when the only obligation is read-only (non-actionable)", () => {
    const readonly: WiringObligation[] = [
      { ...OBLIGATIONS[0], componentId: "CMP-002", interaction: "None (read-only)", type: "label" },
    ];
    const src = `<span>{count}</span>`;
    expect(auditWiringInSource(src, readonly)).toEqual([]);
  });

  it("returns empty for empty source or no obligations", () => {
    expect(auditWiringInSource("", OBLIGATIONS)).toEqual([]);
    expect(auditWiringInSource("<button onClick={()=>{}}/>", [])).toEqual([]);
  });
});

describe("extractNavRouteTargets", () => {
  it("extracts the route after a nav verb, ignoring API call paths", () => {
    expect(
      extractNavRouteTargets("Calls POST /payments and navigates to /confirmation"),
    ).toEqual(["/confirmation"]);
  });

  it("handles 'redirect to' / 'go to'", () => {
    expect(extractNavRouteTargets("redirects to /login")).toEqual(["/login"]);
    expect(extractNavRouteTargets("goes to /dashboard")).toEqual(["/dashboard"]);
  });

  it("returns empty when there is no navigation intent", () => {
    expect(extractNavRouteTargets("Calls POST /payments and shows a toast")).toEqual([]);
  });
});

describe("parseRegisteredRoutes", () => {
  it("parses path= and path: declarations", () => {
    const src = `
      <Route path="/cart" element={<CartPage/>} />
      { path: "/confirmation", element: <Confirm/> }
      { path: '/orders/:id' }
    `;
    expect(parseRegisteredRoutes(src).sort()).toEqual([
      "/cart",
      "/confirmation",
      "/orders/:id",
    ]);
  });
});

describe("auditFlowNavigation", () => {
  const navObligation: WiringObligation = {
    ...OBLIGATIONS[0],
    effect: "navigates to /confirmation",
  };

  it("flags a nav target that is not a registered route (flow dead-ends)", () => {
    const findings = auditFlowNavigation([navObligation], ["/cart", "/checkout"]);
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toMatch(/not a registered route/);
  });

  it("does NOT flag when the target route is registered", () => {
    expect(
      auditFlowNavigation([navObligation], ["/cart", "/confirmation"]),
    ).toEqual([]);
  });

  it("matches registered routes with :param wildcards", () => {
    const o: WiringObligation = { ...OBLIGATIONS[0], effect: "navigates to /orders/42" };
    expect(auditFlowNavigation([o], ["/orders/:id"])).toEqual([]);
  });

  it("skips dynamic targets and returns nothing when no routes are parseable", () => {
    const dyn: WiringObligation = { ...OBLIGATIONS[0], effect: "navigates to /orders/:id" };
    expect(auditFlowNavigation([dyn], ["/cart"])).toEqual([]);
    expect(auditFlowNavigation([navObligation], [])).toEqual([]);
  });
});
