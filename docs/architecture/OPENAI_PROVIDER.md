# Optional OpenAI provider

Finora is local-first. Keep `AI_PROVIDER=mock` to run without credentials or any upstream model requests. The optional OpenAI adapter lives only in NestJS. To opt in, use the API environment template, choose `openai` and supply your own server-side OpenAI key and supported model, never Expo's public variables. No account, credentials, provider-side resource or deployment is provisioned by this project.

[GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini) supports the Responses endpoint, function calls, and `reasoning.effort: none`, making it a suitable default for this bounded local tool flow. The adapter explicitly sets that mode for GPT-5.4 mini/nano. Models that emit reasoning items alongside function calls require ordered replay of the result including opaque encrypted reasoning. Finora does not retain or replay those items, so that model/turn is rejected rather than running an unverifiable continuation. See [function calling](https://developers.openai.com/api/docs/guides/function-calling) and [reasoning in stateless mode](https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-without-stored-responses).

## Trust boundary

- Server-only POST to the fixed Responses endpoint with redirects disabled. `store: false`, no model-side conversation ID, built-in tools, web search, file uploads or background mode.
- The caller supplies only approved text and minimized deterministic summaries. Do not supply raw loan files, identity data, account identifiers, credentials, or unrelated financial history. Enabling a remote provider sends allowed content outside Finora's local environment. `store: false` opts out of stored response state; it does not remove all applicable provider abuse-monitoring retention. Review [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) before using real data.
- The provider only returns either final text or one registered function proposal. It never runs functions, authorizes data access, or treats response text as facts. The application must validate the tool argument's domain schema, enforce ownership, execute the existing local financial engine and retain provenance separately.
- Per request: 32 logical messages, 12 declarations, 64 KiB JSON input, one call, 4 KiB arguments, 256 KiB upstream response and 16 KiB final text. The default is 12 seconds and 600 output tokens; the boundaries are 1–30 seconds and 16–4,096 output tokens. Bound the number of completions at the orchestration layer as well.
- Errors expose a safe code and optional numeric HTTP status, not provider response bodies, keys or model explanations. Cancellation, timeouts, rate limits, refusal and incomplete output are distinct. Completed responses report the actual reported model and optional input/output/total token counts; application streaming is separate from the provider's bounded completion.

## Local verification without a key

```sh
pnpm --filter @finora/api test -- intelligence-provider.test.ts
```

This suite injects a local fetch mock and verifies the request contract, a tool proposal and continuation, bounded parsing, sanitized errors and cancellation. It does not connect to OpenAI or verify live credentials, account entitlements, billing, or an upstream model's answers.
