# Project evaluation tests

The tests are kept outside the application folders:

- `backend/unit/` checks backend helpers and models without MongoDB.
- `backend/integration/` checks the full Express API and MongoDB flow.
- `frontend/` checks frontend data and helper behavior.

Run all fast unit tests:

```powershell
npm run test:unit
```

Run only backend tests:

```powershell
npm run test:backend
```

Run only frontend tests:

```powershell
npm run test:frontend
```

Run integration tests after starting the test MongoDB database:

```powershell
npm run test:integration
```

Run the coverage report:

```powershell
npm run test:coverage
```

The HTML report is created in `evaluation/coverage/index.html`.
