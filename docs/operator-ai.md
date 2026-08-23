# Operator AI architecture

Operator AI is a private, human-in-the-loop reasoning module. It never publishes, messages, changes offers, deletes data, or connects platforms.

## Request flow

`OperatorAI.jsx` → centralized `client/src/lib/api.js` → JWT-protected `/api/operator` → ownership validation → brand context retrieval → mode-specific specialist and knowledge selection → shared AI provider → saved output.

Internal specialists are Strategy, Content, Analysis, Monetization, and Performance behind one Operator Router. Knowledge is selected by mode from small server-side modules. Business and performance memory are retrieved from existing user-owned CCC OS tables; proprietary knowledge files are not exposed through the API.

## Database

Three additive, idempotent tables are created through the existing schema initializer: `operator_conversations`, `operator_outputs`, and `operator_feedback`. Foreign keys and compound ownership indexes preserve user/brand scope. Generated drafts save into existing `ideas` or `assets` only after a user action.

## Security

All routes inherit JWT authentication, validate brand ownership, limit request frequency and input length, cap context and model output, sanitize provider errors, and avoid logging prompts or generated output. Outputs distinguish stored evidence from qualitative AI judgment.

## Environment

Uses the existing `ANTHROPIC_API_KEY`. Optional `OPERATOR_AI_MODEL` selects a compatible Anthropic model; otherwise the provider default is used. No Railway configuration change is required when the existing Anthropic key is present.

## Deferred

Automatic publishing, DMs, OAuth, analytics imports, vector search, autonomous jobs, billing changes, and mutation of offers/funnels remain intentionally deferred.

## Deployment and rollback

Deploy only after reviewing and merging the feature pull request. Railway will run the additive schema initializer on startup. Back up the SQLite volume first. Roll back application code by reverting the merge commit; the unused additive Operator tables may remain safely. If removal is required later, export their data and drop them only during an approved maintenance operation.