# Solidarites_Sudan — Supply Chain & Operations (Static Demo)

**What it is:** A robust, static demo with SI-inspired colors and official logo. Includes:
- Protected pages with demo auth & roles (staff, hr, cd, logistics, admin)
- Supply chain modules (items, warehouses, suppliers, POs, shipments, beneficiaries)
- Movement planning workflow (Staff → HR → CD → Logistics)
- Timesheet tracker (monthly entries)
- External link settings for dashboards/reports (e.g., Power BI, Kobo, ACF GTA)

**Tech:** Plain HTML/CSS/JS. Data in localStorage. No server — for demos only.

**Demo Accounts**
- staff@org / demo1234 (role: staff)
- hr@org / demo1234 (role: hr)
- cd@org / demo1234 (role: cd)
- log@org / demo1234 (role: logistics)
- admin@org / demo1234 (role: admin)

## Run locally
Open `index.html`. Click **Login** and use any demo account.

## Deploy (GitHub Pages)
1. Create a repo (e.g., `Solidarites_Sudan-pro-site`).
2. Upload all files / push with Git.
3. Settings → Pages → Source: `main`, folder: `/ (root)`.

## Important
This is for demonstration. For production you need a backend (API & DB), RBAC, encryption, audit logs, and proper SSO.
