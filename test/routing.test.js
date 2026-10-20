import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createAuthHandlers } from "../worker/auth.js"
import { applicationDomain, configuredEditorOrigin, isApplicationHostname } from "../worker/routing.js"

const env = { EDITOR_ORIGIN: "https://hand.built.at" }

test("the configured application hostname uses the legacy Built.at data without capturing custom domains", () => {
  assert.equal(configuredEditorOrigin(new Request("https://hand.built.at/"), env), "https://hand.built.at")
  assert.equal(applicationDomain(new Request("https://hand.built.at/"), env), "built.at")
  assert.equal(applicationDomain(new Request("https://nathanpuls.com/"), env), "nathanpuls.com")
  assert.equal(isApplicationHostname(new Request("https://hand.built.at/signup"), env), true)
  assert.equal(isApplicationHostname(new Request("https://other.built.at/signup"), env), false)
})

test("Google authentication stays on the requesting application hostname", async () => {
  const handlers = createAuthHandlers({ editorOrigin: configuredEditorOrigin, json: Response.json, makeId: () => "id" })
  const response = await handlers.beginGoogleAuth(new Request("https://hand.built.at/api/auth/google"), {
    ...env,
    GOOGLE_CLIENT_ID: "client",
    GOOGLE_CLIENT_SECRET: "secret",
  })
  const target = new URL(response.headers.get("location"))
  assert.equal(target.searchParams.get("redirect_uri"), "https://hand.built.at/api/auth/callback")

  const invalid = await handlers.finishGoogleAuth(new Request("https://hand.built.at/api/auth/callback"), env)
  assert.equal(invalid.headers.get("location"), "https://hand.built.at/signup?error=invalid-oauth-state")
})

test("Cloudflare routes only the Hand application to this Worker", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"))
  const patterns = config.routes.map((route) => route.pattern)
  assert.ok(patterns.includes("hand.built.at/*"))
  assert.ok(!patterns.includes("*.built.at/*"))
  assert.ok(!patterns.includes("nathanpuls.com/*"))
})
