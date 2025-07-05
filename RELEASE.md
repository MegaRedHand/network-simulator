# How to release

To make a release:

- [ ] Make sure you have the latest changes on `main`:

  ```sh
  git checkout main && git pull origin main
  ```

- [ ] Build the artifacts with `npm run build`
- [ ] Package the artifacts:

  ```sh
  tar -czvf gedusim.tar.gz dist/* README.md LICENSE
  ```

- [ ] Create a new GitHub release with the packaged artifacts.

- [ ] Add information on how to run the release:

  > To serve the files locally:
  >
  > 1. Extract the artifacts with `tar -xzf gedusim.tar.gz`
  > 2. Run `python3 -m http.server 8080`
  >
  > You'll now be able to use the simulator locally by going to `http://localhost:8080`
