# ECP Version Check

Small CLI tool to compare versions of services in the ECP/GB project. Currently, only services deployed using Terraform are included which means FE repos, Azure projects and AWS lambdas etc are not listed by this tool.

The tool reads a local copy of the ecp-integration-services repo and therefore it is important that you have checked out the latest version to get the most up-to-date comparison

![Example output](/example.png "Example output")

# Features

- List version number in Stage and Prod
- Highlight services that differ in version between Stage and Prod
- List Environment Varibles present in Stage but not in Prod 


# Quick Start

* [Install Deno](https://docs.deno.com/runtime/getting_started/installation/)
* Using VS Code, install the plugin simply called Deno by denoland
* Once the code is open in VS Code, run task Deno:enable from the command palette

Test by runnig:
```bash

deno run --allow-all .\main.ts <path-to-local-repo-of-ecp-integration-services>

```
To build a stand alone executable, run (more info [here](https://docs.deno.com/runtime/reference/cli/compiler/)):
```bash

deno compile -o ECPVersionCheck --allow-read --allow-env .\main.ts

```
