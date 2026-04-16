import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders a submit button when type is submit", () => {
    const html = renderToStaticMarkup(<Button type="submit">Создать</Button>);

    expect(html).toContain('type="submit"');
  });

  it("defaults to a regular button when type is omitted", () => {
    const html = renderToStaticMarkup(<Button>Открыть</Button>);

    expect(html).toContain('type="button"');
  });

  it("preserves custom render elements", () => {
    const html = renderToStaticMarkup(
      <Button render={<a href="/docs">Документация</a>}>Документация</Button>,
    );

    expect(html).toContain('<a href="/docs"');
  });
});
