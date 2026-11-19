# Product

## Register

product

## Users
Developers, students and small-team engineers who have metrics flowing from their services but find Grafana and PromQL intimidating. They are mid-task: "is my API okay, and what is it doing right now?" They want an answer in seconds, not a query-language course.

## Product Purpose
Metricly turns Prometheus metrics into charts by snapping together plain-language blocks (Requests, per minute, by endpoint) instead of writing PromQL. Every block change redraws the chart instantly, and the generated PromQL stays one click away so people can learn it. Success: a first-time user has a useful chart within a minute without reading docs.

## Brand Personality
Friendly, bright, tactile. Talks like a helpful friend, not a manual. Blocks feel like physical pieces that click together. Confident saturated colour, never corporate grey.

## Anti-references
Classic Grafana: dark, dense, grey, intimidating, query-editor-first. Also avoid generic SaaS-dashboard kits (identical cards, hero-metric tiles) and cutesy mascots that get in the way of data.

## Design Principles
1. Show the chart first: the first block dropped must already produce a sensible chart.
2. Words over syntax: every control and label uses the user's language; PromQL is a peek, never a requirement.
3. Playful in the affordances, serious in the data: personality lives in blocks, copy and motion, while charts stay accurate and readable.
4. Teach as you go: the sentence under the chart and the "peek behind the curtain" query explain what the blocks mean.
5. Never colour alone: block kinds and chart series are distinguished by shape, label and position as well as hue.

## Accessibility & Inclusion
Target WCAG 2.2 AA (not yet confirmed by the owner, assumed default). Click-to-add is the keyboard and touch alternative to drag. Respect prefers-reduced-motion. Charts use direct labels plus colour-blind-safe distinctions. Light theme first; dark theme in a later pass.
