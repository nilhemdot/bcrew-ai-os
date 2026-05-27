# YouTube Deep Visual Review

Generated: 2026-05-27T01:09:30.511Z
Report artifact: `batch:youtube-deep-visual-review:v1:20260527010930`
Model: `gemini-3.5-flash`

## Summary

- Videos reviewed: 1
- Timestamped visual evidence: 9
- Screen/code/tooling details: 9
- Build candidates: 8
- Missed-by-standard notes: 4

## Videos

- ICOR with Tom | AI Productivity: He Uses Claude Code for Life Management (Not Programming) (HspEwH-AkbQ)
  - URL: https://www.youtube.com/watch?v=HspEwH-AkbQ
  - Deep rank: 1; score: 145
  - Reasons: 8 screen/code/UI signals; 3 visual evidence items; 2 workflow moments; 2 build candidates; 3 missed-by-transcript notes; title indicates screen/code/UI detail
  - Visual evidence: 9; screen/code/tooling: 9

## Top Build Candidates

- Local SQLite-backed Personal Knowledge Graph (PKG) with Claude MCP
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Allows the AI OS to maintain a persistent, structured local memory of journals, meetings, and coaching history without relying on cloud databases.
  - Next: Create a local SQLite database schema with tables for journals, coaching, and meetings, and write an MCP server to query it.
  - Evidence: 07:21
- Natural Language Database Schema Generator for Personal CRM/Journals
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Enables non-technical users to generate and modify their local SQLite database schemas using simple natural language prompts via Claude.
  - Next: Develop a prompt template that guides Claude to generate and execute SQL DDL statements based on user-defined life dimensions.
  - Evidence: 07:21
- Local SQLite Schema Generator via Claude Code
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Allows non-technical users to build and update relational databases using natural language.
  - Next: Develop system prompts for Claude Code to manage SQLite migrations safely.
  - Evidence: 07:21
- AI Meeting Notes Rating & Extraction Pipeline
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Automatically extracts structured metadata and ratings from raw meeting transcripts into SQLite.
  - Next: Build an ingestion script that parses transcripts and calls Claude to populate the meeting_notes table.
  - Evidence: 07:21
- Automated Meeting Synthesizer
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Converts raw transcripts or notes into structured action items and key insights.
  - Next: Develop a prompt template that parses meeting logs and outputs structured markdown with metadata.
  - Evidence: 13:22
- Mindset Coach Agent
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Provides strategic coaching and behavioral feedback based on daily operational logs.
  - Next: Build an agent that runs asynchronously over new journal entries to append a 'Coach' section.
  - Evidence: 13:58
- Local SQLite Meeting Indexer
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Enables structured storage of meeting metadata and AI insights locally without cloud database overhead.
  - Next: Define the SQLite schema for meeting instances and write a Python script to insert Claude-structured JSON.
  - Evidence: 16:48
- AI Meeting Coach Dashboard
  - Source: ICOR with Tom | AI Productivity - He Uses Claude Code for Life Management (Not Programming)
  - Why: Renders structured meeting insights, system lenses, and follow-up questions in a clean markdown format.
  - Next: Create a frontend template that reads from the SQLite database and displays markdown outputs.
  - Evidence: 15:06
