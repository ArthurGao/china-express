import { setupServer } from "msw/node";
import { buildHandlers } from "./handlers";

export const server = setupServer(...buildHandlers());
