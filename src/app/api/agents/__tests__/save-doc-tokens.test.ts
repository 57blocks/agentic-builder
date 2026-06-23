import { describe, it, expect } from "vitest";
import { DOC_FILENAME } from "../save-doc/doc-filenames";

describe("DOC_FILENAME", () => {
  it("design-tokens 映射到 tokens.css", () => {
    expect(DOC_FILENAME["design-tokens"]).toBe("tokens.css");
  });
  it("保留既有映射", () => {
    expect(DOC_FILENAME.design).toBe("DesignSpec.md");
  });
});
