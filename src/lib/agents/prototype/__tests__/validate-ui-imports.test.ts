import { describe, it, expect } from "vitest";
import { validateUiImports, buildImportRepairMessage } from "../validate-ui-imports";

const available = ["button", "card", "select", "dropdown-menu"];

describe("validateUiImports", () => {
  it("flags a subpath import that is not installed", () => {
    const tsx = `import { RadioGroup } from "@/components/ui/radio-group";\nimport { Button } from "@/components/ui/button";`;
    expect(validateUiImports(tsx, available)).toEqual(["radio-group"]);
  });

  it("passes when all subpath imports are installed (incl. hyphenated names)", () => {
    const tsx = `import { Button } from "@/components/ui/button";\nimport { DropdownMenu } from "@/components/ui/dropdown-menu";`;
    expect(validateUiImports(tsx, available)).toEqual([]);
  });

  it("ignores barrel imports (@/components/ui) — only concrete subpaths are checked", () => {
    const tsx = `import { Button, Whatever } from "@/components/ui";`;
    expect(validateUiImports(tsx, available)).toEqual([]);
  });

  it("dedupes and sorts multiple bad imports", () => {
    const tsx = `import "@/components/ui/tabs";\nimport x from "@/components/ui/accordion";\nimport y from "@/components/ui/tabs";`;
    expect(validateUiImports(tsx, available)).toEqual(["accordion", "tabs"]);
  });
});

describe("buildImportRepairMessage", () => {
  it("names the bad imports, the allowed set, and asks for one tsx block preserving classes", () => {
    const msg = buildImportRepairMessage(
      `import { RadioGroup } from "@/components/ui/radio-group";`,
      ["radio-group"],
      available,
    );
    expect(msg).toContain("radio-group");
    expect(msg).toContain("button, card, select, dropdown-menu");
    expect(msg.toLowerCase()).toContain("preserve all classname");
    expect(msg).toContain("```tsx");
    expect(msg).toContain(`@/components/ui/radio-group`); // the file to fix is embedded
  });
});
