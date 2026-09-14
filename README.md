# Packlist

A packing and inventory checklist app for organizing items for trips and events. Create a trip, organize items into categories, attach photos so you know exactly what you're packing, and check things off as you go.

## Features

- **Trips** — organize packing lists by trip or event (e.g. "Two-Week Trip to Almaty")
- **Categories** — group items into custom categories, or load predefined templates (Documents, Electronics, Clothing, etc.)
- **Items with photos** — attach a photo to any item so you can visually confirm what to pack
- **Pinning** — pin up to 3 important categories to keep them at the top
- **Search** — filter items within a trip in real time
- **Drag-to-reorder** — reorder categories by dragging
- **Shared trips** — invite others by email to view and edit a trip together, with live sync
- **Installable** — works as an installable app on iOS/Android (PWA), plus a native Android build

## Tech stack

- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: [Supabase](https://supabase.com) — Postgres database, authentication, file storage, realtime sync, secured with Row Level Security
- **Hosting**: [Vercel](https://vercel.com)
- **Native mobile**: [Capacitor](https://capacitorjs.com) (Android)

## Status

Actively developed. Currently used by a small group of testers.
