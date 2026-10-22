import { describe, expect, it } from "vitest";
import * as client from "../src/client/index";
import * as server from "../src/server/index";

describe("entry points", () => {
  it("server and client expose the same version", () => {
    expect(server.VERSION).toBe("0.0.0");
    expect(client.VERSION).toBe(server.VERSION);
  });
});
