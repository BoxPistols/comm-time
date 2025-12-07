/**
 * チェックボックストグル機能のテスト（行番号ベース）
 */

describe("Checkbox Toggle Function (Line-based)", () => {
  // toggleCheckbox関数のロジックをテスト（行番号ベース）
  const toggleCheckboxByLine = (content: string, lineNumber: number): string => {
    const lines = content.split("\n");
    const lineIndex = lineNumber - 1;

    if (lineIndex < 0 || lineIndex >= lines.length) {
      return content;
    }

    const line = lines[lineIndex];
    const checkboxPattern = /^(\s*[-*+]\s*)\[([ xX])\]/;

    const newLine = line.replace(
      checkboxPattern,
      (match: string, prefix: string, checked: string) => {
        const newChecked = checked === " " ? "x" : " ";
        return `${prefix}[${newChecked}]`;
      }
    );

    if (line !== newLine) {
      lines[lineIndex] = newLine;
      return lines.join("\n");
    }

    return content;
  };

  it("should toggle unchecked checkbox to checked on line 1", () => {
    const content = "- [ ] Task 1\n- [ ] Task 2";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("- [x] Task 1\n- [ ] Task 2");
  });

  it("should toggle checked checkbox to unchecked on line 1", () => {
    const content = "- [x] Task 1\n- [ ] Task 2";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("- [ ] Task 1\n- [ ] Task 2");
  });

  it("should toggle checkbox on line 2", () => {
    const content = "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3";
    const result = toggleCheckboxByLine(content, 2);
    expect(result).toBe("- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3");
  });

  it("should handle uppercase X", () => {
    const content = "- [X] Task 1";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("- [ ] Task 1");
  });

  it("should handle asterisk bullets", () => {
    const content = "* [ ] Task 1";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("* [x] Task 1");
  });

  it("should handle plus bullets", () => {
    const content = "+ [ ] Task 1";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("+ [x] Task 1");
  });

  it("should handle indented checkboxes", () => {
    const content = "  - [ ] Indented Task";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("  - [x] Indented Task");
  });

  it("should not affect lines without checkboxes", () => {
    const content = "Regular text\n- [ ] Task\nMore text";
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("Regular text\n- [ ] Task\nMore text");
  });

  it("should toggle checkbox on line with surrounding text", () => {
    const content = "Regular text\n- [ ] Task\nMore text";
    const result = toggleCheckboxByLine(content, 2);
    expect(result).toBe("Regular text\n- [x] Task\nMore text");
  });

  it("should not affect content with out of range line number", () => {
    const content = "- [ ] Task";
    const result = toggleCheckboxByLine(content, 10);
    expect(result).toBe("- [ ] Task");
  });

  it("should handle negative line number", () => {
    const content = "- [ ] Task";
    const result = toggleCheckboxByLine(content, -1);
    expect(result).toBe("- [ ] Task");
  });

  it("should handle zero line number", () => {
    const content = "- [ ] Task";
    const result = toggleCheckboxByLine(content, 0);
    expect(result).toBe("- [ ] Task");
  });

  // コードブロック内のチェックボックス風テキストを正しく無視するテスト
  it("should only toggle the correct line when code blocks exist", () => {
    const content = "- [ ] Real task\n```\n- [ ] Fake checkbox in code\n```\n- [ ] Another real task";
    // 行1（実際のチェックボックス）をトグル
    const result = toggleCheckboxByLine(content, 1);
    expect(result).toBe("- [x] Real task\n```\n- [ ] Fake checkbox in code\n```\n- [ ] Another real task");
  });

  it("should toggle the last real checkbox correctly", () => {
    const content = "- [ ] Real task\n```\n- [ ] Fake checkbox in code\n```\n- [ ] Another real task";
    // 行5（最後の実際のチェックボックス）をトグル
    const result = toggleCheckboxByLine(content, 5);
    expect(result).toBe("- [ ] Real task\n```\n- [ ] Fake checkbox in code\n```\n- [x] Another real task");
  });
});
