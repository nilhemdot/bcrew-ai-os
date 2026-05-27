# YouTube Deep Visual Review

Generated: 2026-05-26T23:51:34.290Z
Report artifact: `batch:youtube-deep-visual-review:v1:20260526235134`
Model: `gemini-3.5-flash`

## Summary

- Videos reviewed: 1
- Timestamped visual evidence: 17
- Screen/code/tooling details: 17
- Build candidates: 8
- Missed-by-standard notes: 5

## Videos

- AI Master: How to Create AI Agents That Automate Your Business (No Code Beginners Guide) (X84irN0qAG0)
  - URL: https://www.youtube.com/watch?v=X84irN0qAG0
  - Deep rank: 22; score: 139
  - Reasons: 7 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 2 missed-by-transcript notes; title indicates screen/code/UI detail
  - Visual evidence: 17; screen/code/tooling: 17

## Top Build Candidates

- Natural Language Web Scraping & Lead Gen Agent
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Automates manual prospecting and personalized drafting using browser-use LLM frameworks.
  - Next: Test browser-use or Playwright-based LLM agents with the exact prompt from 01:05.
  - Evidence: 01:05, 02:19
- Automated Competitor Pricing Monitor
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Periodically scrapes pricing pages and logs changes to Google Sheets without brittle selectors.
  - Next: Build a scheduled visual scraping workflow targeting dynamic pricing tables.
  - Evidence: 02:42
- Visual Browser Agent Scraper
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Allows scraping of highly variable websites without writing custom CSS selectors by navigating visually.
  - Next: Evaluate Twin.so API or alternative visual browser automation tools like Skyvern or MultiOn.
  - Evidence: 01:05, 02:00
- Automated Competitor Pricing Monitor
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: A scheduled visual agent that visits competitor pricing pages, extracts structured data, and highlights changes.
  - Next: Build a prototype that scrapes pricing tables and compares them to previous runs.
  - Evidence: 02:54
- Visual Web Scraper Agent
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Allows scraping websites visually using LLM vision instead of brittle CSS selectors.
  - Next: Develop a Playwright wrapper that captures screenshots and uses LLM vision to locate elements.
  - Evidence: 02:12
- Stateful Pricing Diff Monitor
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Enables scheduled monitoring of web pages with database snapshot diffing and email alerts.
  - Next: Implement SQLite snapshot storage and a diffing algorithm to detect changes in extracted data.
  - Evidence: 03:13
- Visual Browser Agent with SQLite State Diffing
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Allows agents to monitor websites without APIs, store historical snapshots, and alert users only on changes.
  - Next: Build a Playwright-based agent that saves page markdown, parses it with an LLM, and compares it to a local SQLite DB.
  - Evidence: 03:13, 03:56
- Multi-Source Real Estate Deal Sourcing Agent
  - Source: AI Master - How to Create AI Agents That Automate Your Business (No Code Beginners Guide)
  - Why: Automates complex commercial real estate sourcing by scraping listings, filtering by criteria, and enriching with demographic data.
  - Next: Develop a pipeline scraping LoopNet/Crexi, filtering by price/units, and calling a census API for enrichment.
  - Evidence: 04:53
