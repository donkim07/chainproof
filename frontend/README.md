# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

1. Start the ChainProof API on port `8080` (see `../backend`).
2. Copy `.env.example` → `.env` (leave `CHAINPROOF_API_URL` empty).
3. Run:

```bash
npm start
```

`ng serve` proxies `/api` to `http://localhost:8080`, so login works without CORS issues. Open `http://localhost:4200/`.

If you set `CHAINPROOF_API_URL=http://localhost:8080` instead, ensure the backend `CORS_ORIGINS` includes your frontend origin.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
