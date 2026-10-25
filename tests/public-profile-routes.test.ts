import assert from "node:assert/strict";
import test from "node:test";
import { isRedirect } from "@tanstack/react-router";
import { Route } from "../src/routes/members.$slug";

for (const slug of ["existing-profile", "member-1234abcd"]) {
  test(`legacy member URLs redirect permanently without rewriting stored slug ${slug}`, () => {
    assert.throws(
      () => Route.options.beforeLoad!({ params: { slug } } as never),
      (error: unknown) => {
        assert.ok(isRedirect(error));
        assert.equal(error.options.to, "/br/$slug");
        assert.deepEqual(error.options.params, { slug });
        assert.equal(error.options.replace, true);
        assert.equal(error.status, 301);
        return true;
      },
    );
  });
}
