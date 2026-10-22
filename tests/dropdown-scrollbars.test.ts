import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Command, CommandList } from "../src/components/ui/command";

test("searchable dropdown lists reuse the website scrollbar on their scrolling element", () => {
  const html = renderToStaticMarkup(
    createElement(Command, { label: "Games" }, createElement(CommandList, null, "Games")),
  );
  assert.match(
    html,
    /class="[^"]*custom-scrollbar[^"]*"[^>]*cmdk-list|cmdk-list[^>]*class="[^"]*custom-scrollbar/,
  );
});
