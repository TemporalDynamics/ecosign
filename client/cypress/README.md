# 🧪 Cypress E2E Tests - VerifySign

## 📋 Test Coverage

### Current Tests (23 assertions)

#### ✅ Critical Flows (`critical-flows.cy.js`)
1. **Public Verification** - No auth required (MVP killer feature)
2. **Guest Certification** - Certificate without account
3. **User Authentication** - Login/signup flow
4. **Landing Navigation** - Homepage interactions
5. **Protected Routes** - Dashboard access control
6. **Responsive Design** - Mobile/Tablet/Desktop
7. **Error Handling** - 404 pages
8. **Performance** - Load time checks

#### ✅ Authentication (`login.cy.js`)
- Login form display
- Guest navigation
- Form validation

---

## 🚀 Running Tests

### Interactive Mode (Recommended for Development)

```bash
cd client
npm run cypress:open
```

Then select the test file to run in the Cypress UI.

### Headless Mode (CI/CD)

```bash
cd client
npm run cypress:run
```

### Run Specific Test

```bash
cd client
npx cypress run --spec "cypress/e2e/critical-flows.cy.js"
```

---

## 📦 Test Structure

```
cypress/
├── e2e/                      # Test specs
│   ├── critical-flows.cy.js  # Main user flows (23 tests)
│   └── login.cy.js           # Auth tests (2 tests)
│
├── fixtures/                 # Mock data
│   └── sample.eco.json       # Mock .eco file metadata
│
├── screenshots/              # Auto-generated on failures
├── support/                  # Custom commands
│   ├── commands.js
│   └── e2e.js
│
└── README.md                 # This file
```

---

## 🎯 Writing New Tests

### Basic Structure

```javascript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.visit('/page');
  });

  it('should do something', () => {
    cy.get('[data-cy="element"]').click();
    cy.contains('Expected Text').should('be.visible');
  });
});
```

### Best Practices

1. **Use `data-cy` attributes** for stable selectors
   ```jsx
   <button data-cy="submit-button">Submit</button>
   ```

2. **Avoid hard-coded waits**
   ```javascript
   // ❌ Bad
   cy.wait(5000);
   
   // ✅ Good
   cy.get('[data-cy="result"]').should('be.visible');
   ```

3. **Test user behavior, not implementation**
   ```javascript
   // ❌ Bad
   cy.get('.css-class-123').click();
   
   // ✅ Good
   cy.contains('Iniciar Sesión').click();
   ```

4. **Group related tests**
   ```javascript
   describe('User Authentication', () => {
     describe('Login', () => { /* ... */ });
     describe('Signup', () => { /* ... */ });
   });
   ```

---

## 🔧 Custom Commands

### Current Commands

Located in `support/commands.js`:

```javascript
// Example: Add custom login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Usage
cy.login('user@example.com', 'password123');
```

---

## 📊 Test Coverage Goals

| Area | Current | Goal |
|------|---------|------|
| **Critical flows** | ✅ 80% | 100% |
| **Authentication** | ⚠️ 40% | 100% |
| **Certification** | ⚠️ 30% | 90% |
| **Verification** | ⚠️ 50% | 100% |
| **Dashboard** | ❌ 0% | 80% |
| **API integration** | ❌ 0% | 60% |

---

## 🐛 Common Issues

### Issue: Tests fail with network errors

**Solution:** Mock API calls or use Cypress intercept

```javascript
cy.intercept('POST', '/api/certify', {
  statusCode: 200,
  body: { certificate_id: 'mock-id' }
});
```

### Issue: Flaky tests due to timing

**Solution:** Use proper assertions instead of waits

```javascript
// ❌ Flaky
cy.wait(2000);
cy.get('.result').should('exist');

// ✅ Stable
cy.get('.result', { timeout: 10000 }).should('be.visible');
```

### Issue: Tests pass locally but fail in CI

**Solution:** Ensure consistent viewport and base URL

```javascript
// cypress.config.js
export default {
  baseUrl: 'http://localhost:5173',
  viewportWidth: 1280,
  viewportHeight: 720,
}
```

---

## 🔜 TODO: Tests to Write

### High Priority

- [ ] **Full certification flow** with file upload
  - Upload PDF
  - Select blockchain options
  - Generate .eco certificate
  - Download result

- [ ] **Full verification flow** with mock .eco file
  - Upload .eco
  - Validate all layers
  - Show blockchain proof
  - Display certificate details

- [ ] **Authenticated dashboard**
  - Login with test account
  - View certificate history
  - Download certificates
  - Delete certificates

### Medium Priority

- [ ] **NDA flow**
  - Create NDA link
  - Sign NDA as guest
  - Track signature

- [ ] **Pricing page interactions**
  - View tiers
  - Upgrade modal
  - Stripe checkout (mock)

### Low Priority

- [ ] **API error scenarios**
  - Network failures
  - Server errors
  - Rate limiting

- [ ] **Accessibility (a11y)**
  - Keyboard navigation
  - Screen reader support
  - Color contrast

---

## 📈 CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/cypress.yml

name: Cypress Tests

on: [push, pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: cypress-io/github-action@v5
        with:
          working-directory: client
          start: npm run dev
          wait-on: 'http://localhost:5173'
          browser: chrome
```

---

## 📚 Resources

- **Cypress Docs:** https://docs.cypress.io
- **Best Practices:** https://docs.cypress.io/guides/references/best-practices
- **Example Tests:** https://github.com/cypress-io/cypress-example-recipes

---

**Last updated:** 2025-11-13  
**Test count:** 25 tests  
**Coverage:** ~40% (goal: 80%)  
