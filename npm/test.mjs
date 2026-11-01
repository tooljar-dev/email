// Tests for the npm package. Run after `npm run npm:build`: node --test npm/test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEmail, dataUpdated, isTempMail, normalizeEmail } from "./index.js";

test("listed domains and their subdomains are temp mail", () => {
  assert.equal(isTempMail("someone@mailinator.com"), true);
  assert.equal(isTempMail("mailinator.com"), true);
  const r = checkEmail("a@x.mailinator.com");
  assert.equal(r.listedAs, "mailinator.com");
  assert.ok(r.lists.length > 0);
});

test("providers and forwarding services are not temp mail", () => {
  assert.equal(isTempMail("john@gmail.com"), false);
  assert.equal(checkEmail("john@gmail.com").kind, "provider");
  assert.equal(isTempMail("abc@duck.com"), false);
  assert.equal(checkEmail("abc@duck.com").kind, "forwarding");
});

test("normal domains are not flagged", () => {
  assert.equal(isTempMail("someone@tooljar.dev"), false);
  assert.equal(isTempMail("someone@example.com"), false);
});

test("Gmail clean-up", () => {
  assert.equal(normalizeEmail("John.Doe+trial@gmail.com"), "johndoe@gmail.com");
  assert.equal(normalizeEmail("a.b+x@outlook.com"), "a.b@outlook.com");
  assert.equal(normalizeEmail("a@example.com"), null);
});

test("bad input", () => {
  assert.equal(checkEmail("hello"), null);
  assert.equal(checkEmail(""), null);
  assert.equal(isTempMail("@@@"), false);
  assert.equal(checkEmail(42), null);
});

test("international domains", () => {
  assert.equal(checkEmail("a@bücher.de").domain, "xn--bcher-kva.de");
});

test("data date", () => {
  assert.match(dataUpdated, /^\d{4}-\d{2}-\d{2}$/);
});
