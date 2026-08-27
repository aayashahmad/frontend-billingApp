# Billing App

React Native (Expo) client for the Billing API. The backend lives in a separate
repo/folder and is reached over HTTP only — the two deploy independently.

## Setup

```bash
npm install
cp .env.example .env   # then point it at your API
npm start
```

## Configuration

The app talks to exactly one backend, set by a single variable in `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000
```

Use the server **origin** (no `/api` suffix) — the app appends `/api` for
endpoints and uses the bare origin for `/uploads/...` screenshots.

| Target             | Value                          |
| ------------------ | ------------------------------ |
| Android emulator   | `http://10.0.2.2:8000`         |
| iOS simulator      | `http://localhost:8000`        |
| Physical device    | `http://<your-LAN-IP>:8000`    |
| Deployed backend   | `https://api.example.com`      |

`EXPO_PUBLIC_*` variables are inlined at build time, so restart the bundler
(`npm start -- --clear`) after changing `.env`.

## Scripts

| Command            | Purpose                          |
| ------------------ | -------------------------------- |
| `npm start`        | Expo dev server                  |
| `npm run android`  | Run on Android                   |
| `npm run ios`      | Run on iOS                       |
| `npm test`         | Jest unit tests                  |
| `npm run test:watch` | Jest in watch mode             |

Requires Node 20+ (Expo SDK 57).

## Structure

```
src/
  components/   reusable UI (Button, Input, Card, BillListItem, ...)
  features/
    billing/    NewBillScreen, BillForm, PaymentTypeToggle, validation schema
    customers/  SearchScreen, CustomerDetailScreen, CustomerCard
  screens/      route-level entry points (thin re-exports of features)
  navigation/   AppNavigator (tabs + stacks)
  hooks/        useCustomerLookup, useCustomerSearch, useCustomerDetail, useCreateBill
  services/     axios instance + customerService / billService
  store/        BillingContext
  utils/        money, billing math, date, debounce
  constants/    config, payment types, theme
```

Components never call the API directly — all network access goes through
`src/services`.

## Backend endpoints used

| Method | Path                             | Purpose                          |
| ------ | -------------------------------- | -------------------------------- |
| GET    | `/api/customers/by-phone/{phone}` | Auto-fill lookup (404 = new customer) |
| GET    | `/api/customers/search?q=`        | Search by name or phone          |
| GET    | `/api/customers/{id}`             | Profile + bill history           |
| POST   | `/api/bills`                      | Create bill (multipart)          |
# frontend-billingApp
