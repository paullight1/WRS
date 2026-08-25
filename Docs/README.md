# WRS documentation

The maintained decision-oriented source of truth for World Robotic System lives in
`Docs/product`, `Docs/ia`, and `Docs/architecture`. The long-form files in the
repository root (`mobile.md`, `about.md`, `wrs2.md`, and `uiux.md`) remain useful source
material, but new product and engineering decisions should be recorded in those three
maintained directories.

`Docs/superpowers` contains dated design and implementation-planning artifacts. Those
files preserve decision history, but they are not current product authority unless a
maintained document explicitly promotes them. Where they disagree, accepted IA and
product decisions take precedence.

## Start here

1. [Product vision](product/PRODUCT_VISION.md)
2. [Feature catalog](product/FEATURE_CATALOG.md)
3. [Delivery roadmap](product/ROADMAP.md)
4. [Trust, safety, and compliance](product/TRUST_SAFETY_COMPLIANCE.md)
5. [Information architecture](ia/IA.md)
6. [Engineering architecture](architecture/README.md)

## Product specifications

- [Community leadership and ambassadors](product/COMMUNITY_LEADERSHIP.md)
- [AI validator network](product/VALIDATOR_NETWORK.md)
- [Data economy and enterprise marketplace](product/DATA_ECONOMY.md)
- [Rewards and reputation](product/REWARDS_AND_REPUTATION.md)
- [Roles and permissions](product/ROLES_AND_PERMISSIONS.md)
- [Governance model](product/GOVERNANCE.md)
- [Feature specification template](product/FEATURE_SPEC_TEMPLATE.md)

## Information architecture

- [IA overview](ia/IA.md)
- [App map](ia/SITEMAP.mmd)
- [Navigation specification](ia/NAVIGATION.md)
- [Content/domain model](ia/CONTENT_MODEL.md)
- [IA decisions](ia/DECISIONS.md)

## Architecture decisions

- [Current ownership and dependency boundaries](architecture/README.md)
- [Engineering baseline](architecture/engineering-baseline.md)
- [ADR 0002: staged validation pipeline](architecture/adr/0002-staged-validation-pipeline.md)
- [ADR 0003: separate value ledgers](architecture/adr/0003-separate-value-ledgers.md)

## Documentation rules

- Product behavior belongs in `Docs/product`.
- Navigation, naming, page hierarchy, and route decisions belong in `Docs/ia`.
- Runtime boundaries, data ownership, interfaces, and technical decisions belong in
  `Docs/architecture`.
- Every material feature must state its phase, owner, permissions, success measure,
  and compliance dependencies before implementation.
- Start new feature documents from `product/FEATURE_SPEC_TEMPLATE.md`; remove irrelevant
  sections explicitly rather than leaving safety, data, or rollout assumptions implicit.
- Use **robot profile** for the current digital product. Use **physical robot** only
  when a real device, title, custody, insurance, and deployment contract exist.
