# Pajemploi Auto-Fill Agent

A local browser automation agent that fills in Pajemploi declarations using data from the autodeclare webapp.

## Prerequisites

1. **Node.js 18+**

2. **1Password CLI** - Install from https://1password.com/downloads/command-line/
   - After installation, authenticate with `eval $(op signin)`

3. **1Password Item** - Create an item named "Pajemploi" in 1Password with:
   - Username/Email field
   - Password field

## Setup

```bash
cd agent
npm install
npx playwright install chromium
```

## Configuration

Edit `src/form-mapping.yaml` with the actual field selectors from Pajemploi:

1. Open https://www.pajemploi.urssaf.fr/ in your browser
2. Right-click on each form field and select "Inspect"
3. Find the field's id, name, or a unique CSS selector
4. Update the YAML file with the selectors

Example:
```yaml
pajemploi:
  login:
    url: "https://www.pajemploi.urssaf.fr/"
    email_field: "#email"
    password_field: "#password"
    submit_button: "button[type='submit']"
```

## Usage

1. Start the agent:
   ```bash
   npm run dev
   ```

2. Open the autodeclare webapp (http://localhost:3000)

3. Mark days worked in the calendar

4. Click the "Fill Pajemploi" button

5. Watch the browser open, log in, and fill the form

6. **Review the values** and submit manually (the agent never auto-submits)

## API

### `GET /health`
Health check endpoint.

### `POST /fill`
Trigger form filling.

Request body:
```json
{
  "declarations": [
    {
      "childName": "Axelle",
      "monthlySalary": 658.13,
      "majoredHoursCount": 2,
      "majoredHoursAmount": 8.58,
      "totalSalary": 666.71,
      "workedDays": 20,
      "maintenanceAllowance": 80,
      "mealAllowance": 80
    }
  ]
}
```

### WebSocket (ws://localhost:3001)
Receive real-time status updates during form filling.

## Security

- Credentials are fetched from 1Password CLI - never stored in config files
- Browser runs in visible mode so you can monitor the process
- Agent never clicks submit - you review and submit manually
