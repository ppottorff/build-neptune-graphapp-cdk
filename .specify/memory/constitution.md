<!--
  Sync Impact Report
  ==================
  Version change: N/A (initial) → 1.0.0
  Modified principles: None (initial adoption)
  Added sections:
    - Core Principles (4 principles: Code Quality, Testing Standards,
      User Experience Consistency, Performance Requirements)
    - Security & Compliance
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (Constitution
      Check section is generic — will resolve against these principles)
    - .specify/templates/spec-template.md ✅ compatible (MUST language
      and measurable success criteria align with principles)
    - .specify/templates/tasks-template.md ✅ compatible (phase
      structure supports testing-first and quality gates)
    - .specify/templates/checklist-template.md ✅ compatible (generic
      checklist categories can map to any principle)
  Follow-up TODOs: None
-->

# Neptune Graph App Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

- ALL infrastructure code MUST be written in TypeScript using
  AWS CDK v2 (`aws-cdk-lib`) with strict compiler options enabled.
- CDK L2 constructs MUST be used when available; L1 (`Cfn*`)
  constructs are permitted only when no L2 alternative exists,
  and the reason MUST be documented inline.
- Every CDK construct, stack, and Lambda handler MUST include
  JSDoc comments describing purpose, parameters, and side effects.
- `const` MUST be preferred over `let`; `var` is prohibited.
- Modern TypeScript idioms (async/await, optional chaining,
  nullish coalescing) MUST be used instead of legacy patterns.
- IAM permissions MUST use CDK grant methods (`grant*`) instead
  of inline policy statements. Any manual policy MUST include a
  comment justifying why a grant method is insufficient.
- CDK Nag MUST pass with zero unacknowledged errors on every
  deployment. Suppressions MUST include a rationale comment.
- Frontend code MUST follow the React + TypeScript + Vite
  conventions established in `app/web/`.

**Rationale**: Consistent, strictly-typed code across CDK stacks,
Lambda handlers, and frontend components reduces deployment failures
and accelerates onboarding.

### II. Testing Standards

- Every new CDK stack or construct MUST have at least one
  snapshot test and one fine-grained assertion test using
  `aws-cdk-lib/assertions` (`Template.fromStack`).
- Lambda handler logic MUST have unit tests exercising both
  success and error paths. Tests MUST use Jest with `ts-jest`.
- Frontend components that contain business logic MUST have
  corresponding unit or integration tests.
- All tests MUST be runnable via `npm test` from the repository
  root without external service dependencies (mock AWS SDK calls).
- Test files MUST follow the pattern `test/**/*.test.ts` for CDK
  and `app/web/src/**/*.test.{ts,tsx}` for the frontend.
- When a bug is fixed, a regression test covering the fix MUST
  be added before the fix is merged.

**Rationale**: Automated tests are the primary safety net for
infrastructure-as-code changes where a deployment failure can
affect production AWS resources.

### III. User Experience Consistency

- All UI components MUST use the shadcn/ui library from
  `app/web/src/components/ui/`; introducing a second component
  library is prohibited without a constitution amendment.
- Page routing MUST use TanStack Router following patterns
  established in `app/web/src/`.
- Every user-facing interaction (form submission, navigation,
  data fetch) MUST provide visual feedback within 200ms
  (loading spinners, skeleton screens, or optimistic updates).
- Error states MUST be handled explicitly in every data-fetching
  component — silent failures are prohibited.
- The application MUST be responsive and functional on viewports
  from 375px (mobile) to 1920px (desktop).
- Amplify authentication flows MUST follow the configuration in
  `app/web/src/config/amplify.ts` without divergent auth patterns.

**Rationale**: A single, consistent UI toolkit and interaction
model prevent visual fragmentation and reduce the surface area
for UX bugs as the frontend evolves.

### IV. Performance Requirements

- CDK stack synthesis (`npm run build && cdk synth`) MUST
  complete in under 60 seconds on a standard development machine.
- Lambda functions MUST be bundled with esbuild and MUST have
  cold-start times under 3 seconds (measured via CloudWatch).
- Lambda function memory allocation MUST be explicitly set and
  justified; the default 128 MB MUST NOT be used without
  documented rationale.
- Neptune Gremlin/SPARQL queries executed by Lambda handlers
  MUST include a timeout of no more than 30 seconds.
- Frontend production bundle (`pnpm build` in `app/web/`) MUST
  produce a gzipped JS payload under 500 KB for the initial load.
- CloudFront cache-control headers MUST be configured for static
  assets with a minimum TTL of 1 hour.

**Rationale**: Explicit performance budgets prevent incremental
degradation and ensure graph query latency and frontend load
times remain acceptable as the dataset and feature set grow.

## Security & Compliance

- Encryption at rest MUST be enabled for all stateful resources
  (S3 buckets, SNS topics, Neptune clusters) using KMS
  customer-managed keys with automatic rotation.
- WAF rules defined in `lib/waf-stack.ts` MUST be applied to all
  public-facing endpoints (CloudFront, AppSync).
- Least-privilege IAM policies MUST be enforced; wildcard (`*`)
  resource ARNs are prohibited in production stacks.
- Secrets and credentials MUST NOT appear in source code,
  CloudFormation outputs, or Lambda environment variables in
  plain text. Use AWS Secrets Manager or SSM SecureString.
- Removal policies for stateful resources MUST be set explicitly
  (`RemovalPolicy.RETAIN` for production, `RemovalPolicy.DESTROY`
  only for development/test stages).
- Dependency versions MUST be pinned in `package.json` and
  audited for known vulnerabilities before each release.

## Development Workflow

- All changes MUST be submitted via pull request against `main`.
- PRs MUST pass CI checks (build, lint, test, CDK Nag) before
  merge. Force-merging without passing checks is prohibited.
- GitHub Actions CI/CD (`main` branch push) performs automated
  backend then frontend deployment; manual deployment follows the
  steps in `README.md` § Manual Deployment.
- Commit messages MUST follow Conventional Commits format
  (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Breaking changes MUST be called out in the commit body with a
  `BREAKING CHANGE:` footer and documented in `README.md`.
- AI-created GitHub issues MUST be prefixed with `AI Created:` in
  the title per `.github/copilot-instructions.md`.

## Governance

- This constitution supersedes all ad-hoc practices. In case of
  conflict between this document and other guidance, this
  document prevails.
- Amendments require: (1) a pull request modifying this file,
  (2) review and approval by at least one maintainer, and
  (3) a version bump following semantic versioning (MAJOR for
  principle removal/redefinition, MINOR for additions, PATCH for
  clarifications).
- Every PR review MUST include a constitution compliance check
  against the applicable principles.
- Complexity beyond what these principles prescribe MUST be
  justified in the PR description with a rationale for why a
  simpler alternative is insufficient.
- Runtime development guidance is maintained in
  `.github/copilot-instructions.md`.

**Version**: 1.0.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-02-25
