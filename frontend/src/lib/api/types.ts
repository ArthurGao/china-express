import type { components } from "./generated/schema";

type Schemas = components["schemas"];

export type Me = Schemas["Me"];
export type Region = Schemas["Region"];
export type Product = Schemas["Product"];
export type City = Schemas["City"];
export type Estimate = Schemas["Estimate"];
export type EstimateRequest = Schemas["EstimateRequest"];
export type ProductQuote = Schemas["ProductQuote"];
export type QuoteLine = Schemas["QuoteLine"];
export type Total = Schemas["Total"];
export type FclPorts = Schemas["FclPorts"];
export type FclEstimate = Schemas["FclEstimate"];
export type FclLine = Schemas["FclLine"];
export type PreNotice = Schemas["PreNotice"];
export type PreNoticeCreate = Schemas["PreNoticeCreate"];
export type Tracking = Schemas["Tracking"];
export type WarehouseAddress = Schemas["WarehouseAddress"];
export type RateCard = Schemas["RateCard"];
export type RateVersionDetail = Schemas["RateVersionDetail"];
export type RateSimulation = Schemas["RateSimulation"];
export type LeadTouch = Schemas["LeadTouch"];
export type Problem = Schemas["Problem"];
