# How to release

To make a release:

- [ ] Make sure you have the latest changes on `main`:

  ```sh
  git checkout main && git pull origin main
  ```

- [ ] Build the artifacts with:

  ```sh
  npm run build
  ```

- [ ] Package the artifacts with the readme and license:

  ```sh
  tar -czvf gedusim.tar.gz examples/* dist/* README.md LICENSE
  ```

- [ ] Create a new GitHub release with the packaged artifacts.

- [ ] Add information on how to run the release:

  > To serve the files locally:
  >
  > 1. Download the compiled artifacts (`gedusim.tar.gz`).
  > 2. Extract the artifacts with `tar -xzf gedusim.tar.gz`.
  > 3. Serve the files under `dist/` through a web server, (i.e. [http-server](https://www.npmjs.com/package/http-server)).
  >
  > You'll now be able to use the simulator locally by going to `http://localhost:8080`
