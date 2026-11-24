# WareOps Technologies

WareOps demonstrates how to turn a manual firmware startup check into a pull request gate. The baseline and regression are small x86 firmware ROMs. Native QEMU and the browser run the same ROMs and share the same serial-event evaluator.

## Run locally with Docker

Start Docker Desktop or a Docker Engine with Compose, then run this from the repository root:

```sh
docker compose up --build
```

Open [http://localhost:4321](http://localhost:4321). Run the baseline and regression, then expand **Serial log** to inspect the observed event order. The image includes Node.js, npm, Python, Clang, and native QEMU. Its first build downloads npm dependencies and the pinned [Qemu.js browser runtime](https://github.com/atrosinenko/qemujs-demo/tree/11f4fbfdbf06deb1eb7b516203177217d2883665/new). The browser loads the runtime when you start the demo.

Edits under `src/` are picked up by the dev server. After changing firmware, scripts, public assets, or dependencies, rerun `docker compose up --build`. Press Ctrl+C or run `docker compose down` to stop the preview.

## Verify the gate

With the preview running, execute the checks inside the container:

```sh
docker compose exec site npm test
docker compose exec site npm run firmware:check -- --verify-fixtures
docker compose exec site npm run firmware:check -- baseline
docker compose exec site npm run firmware:check -- regression
docker compose exec site npm run build
```

Fixture verification succeeds when the baseline passes and the regression fails for the expected event order. Running the regression directly exits with status 1. A runner failure exits with status 2. Reports and serial traces go to `/app/reports/` inside the container.

## GitHub setup

Use GitHub Actions as the Pages source. The Pages workflow deploys on pushes to `main` and supports manual runs. After the first firmware workflow run, configure **Firmware boot gate** as a required check on the target branch. The firmware workflow accepts a manual `regression` run to demonstrate a failed gate with an uploaded trace. The site’s **View CI runs** link points to that workflow.
