# Operator AI Prototype architecture

Operator AI Prototype is a private, human-in-the-loop reasoning module. It never publishes, messages, changes offers, deletes data, or connects platforms. The repository knowledge modules are condensed operational summaries, not the complete Levi source library.

## Request flow

`OperatorAI.jsx` → centralized `client/src/lib/api.js` → JWT-protected `/api/operator` → ownership validation → brand context retrieval → mode-specific specialist and knowledge selection → shared AI provider → saved output.

Internal specialists are Strategy, Content, Analysis, Monetization, and Performance behind one Operator Router. Knowledge is selected by mode from small server-side modules. Business and performance memory are retrieved from existing user-owned CCC OS tables; proprietary knowledge files are not exposed through the API.

## Database

Three additive, idempotent tables are created through the existing schema initializer: `operator_conversations`, `operator_outputs`, and `operator_feedback`. Foreign keys and compound ownership indexes preserve user/brand scope. Generated drafts save into existing `ideas` or `assets` only after a user action.

## Security

All routes inherit JWT authentication, validate brand ownership, limit request frequency and input length, cap context and model output, sanitize provider errors, and avoid logging prompts or generated output. Outputs distinguish stored evidence from qualitative AI judgment.

## AI provider and environment

Operator AI centralizes its own calls through `server/services/ai/provider.js` while reusing the existing Anthropic SDK dependency and configuration convention. Existing AI Studio, Content Advisor, and other AI routes are intentionally unchanged in this prototype to avoid altering their models or behavior during hardening.

- `ANTHROPIC_API_KEY` is required for Operator generation and should remain a Railway secret.
- `OPERATOR_AI_MODEL` is an optional deployment override; the existing compatible default is used when omitted.
- No Railway variable change is required when the existing Anthropic key is already configured and the default model is acceptable.

## Future private knowledge ingestion

Do not commit private autobiographical, customer, swipe, or proprietary source documents to this public repository. A future ingestion service should store originals in private object storage and expose only permission-checked retrieval to Operator AI.

The future retrieval/RAG design should include:

- tenant and user isolation on every document, chunk, embedding, and retrieval query;
- document-level access controls plus purpose/category metadata;
- encrypted private object storage with short-lived service access;
- chunk-level citations so Operator answers can identify the exact authorized source used;
- deletion that removes the original, chunks, embeddings, caches, and derived indexes;
- deterministic re-indexing with document versions, checksums, status, and an update log;
- retrieval filters for mode, brand, knowledge category, approval status, and tenant;
- audit events that record identifiers and outcomes without logging full private source text.

External object storage, embeddings, and vector retrieval are intentionally not implemented in this prototype.

## Deferred

Automatic publishing, DMs, OAuth, analytics imports, vector search, autonomous jobs, billing changes, and mutation of offers/funnels remain intentionally deferred.

## Deployment and rollback

Deploy only after reviewing and merging the feature pull request. Railway will run the additive schema initializer on startup. Back up the SQLite volume first. Roll back application code by reverting the merge commit; the unused additive Operator tables may remain safely. If removal is required later, export their data and drop them only during an approved maintenance operation.
