/**
 * チェックボックストグル機能のテスト
 */

describe("Checkbox Toggle Function", () => {
  // toggleCheckbox関数のロジックをテスト
  const toggleCheckboxInContent = (
    content: string,
    checkboxIndex: number
  ): string => {
    const checkboxPattern = /^(\s*[-*+]\s*)\[([ xX])\]/gm;
    let currentIndex = 0;
    return content.replace(
      checkboxPattern,
      (match: string, prefix: string, checked: string) => {
        if (currentIndex === checkboxIndex) {
          currentIndex++;
          const newChecked = checked === " " ? "x" : " ";
          return `${prefix}[${newChecked}]`;
        }
        currentIndex++;
        return match;
      }
    );
  };

  it("should toggle unchecked checkbox to checked", () => {
    const content = "- [ ] Task 1\n- [ ] Task 2";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("- [x] Task 1\n- [ ] Task 2");
  });

  it("should toggle checked checkbox to unchecked", () => {
    const content = "- [x] Task 1\n- [ ] Task 2";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("- [ ] Task 1\n- [ ] Task 2");
  });

  it("should toggle second checkbox", () => {
    const content = "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3";
    const result = toggleCheckboxInContent(content, 1);
    expect(result).toBe("- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3");
  });

  it("should handle uppercase X", () => {
    const content = "- [X] Task 1";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("- [ ] Task 1");
  });

  it("should handle asterisk bullets", () => {
    const content = "* [ ] Task 1";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("* [x] Task 1");
  });

  it("should handle plus bullets", () => {
    const content = "+ [ ] Task 1";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("+ [x] Task 1");
  });

  it("should handle indented checkboxes", () => {
    const content = "  - [ ] Indented Task";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("  - [x] Indented Task");
  });

  it("should not affect non-checkbox content", () => {
    const content = "Regular text\n- [ ] Task\nMore text";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("Regular text\n- [x] Task\nMore text");
  });

  it("should handle mixed checkbox states", () => {
    const content = "- [x] Done\n- [ ] Pending\n- [X] Also Done";
    const result = toggleCheckboxInContent(content, 1);
    expect(result).toBe("- [x] Done\n- [x] Pending\n- [X] Also Done");
  });

  it("should handle content with no checkboxes", () => {
    const content = "No checkboxes here";
    const result = toggleCheckboxInContent(content, 0);
    expect(result).toBe("No checkboxes here");
  });
});
