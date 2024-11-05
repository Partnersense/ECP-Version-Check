
import { logGreen, logPinkIndend, logRed } from "./logging_utils.ts"; //Just learning about importing from local files :)
import { walkSync } from "jsr:@std/fs/walk";


type AppEnvVars = {
  [key: string]: string;
};

type ComponentVersionInfo = {
  component: string;
  version: string;
  AppEnvVars: AppEnvVars;
};

/**
 * Parses service name and version from the terraform file
 * 
 * @param path Absolute path to the component terraform file
 * @returns ComponentVersionInfo object with component name and version
 */
function extractComponentVersionInfo(path: string): ComponentVersionInfo {
  const component: ComponentVersionInfo = {} as ComponentVersionInfo;
  const fileContents = Deno.readTextFileSync(path);
  const lines = fileContents.split("\n");
  for (let line of lines) {
    //remove all whitespaces from the line
    line = line.replace(/\s/g, "");
    if (line.startsWith("app_name=")) {
      component.component = line.split("=")[1];
    }
    if (line.startsWith("container_version=")) {
      component.version = line.split("=")[1];
    }
  }

  return component;
}

interface EnvVars {
  [key: string]: string;
}

/**
 * Extracts environment variables from the terraform file
 * 
 * @param fileContent Content of the terraform file
 * @returns Object of environment variables
 */
function extractEnvVars(fileContent: string): EnvVars {
  // Find the environment_vars block
  const match = fileContent.match(/environment_vars\s*=\s*{([^}]+)}/);
  if (!match) {
      console.log('No environment_vars block found in the file');
      return {};
  }

  const envBlock = match[1];
  const envVars: EnvVars = {};

  // Match all key-value pairs
  const keyValueRegex = /"([^"]+)"\s*=\s*"([^"]+)"/g;
  let keyValueMatch;

  while ((keyValueMatch = keyValueRegex.exec(envBlock)) !== null) {
      const [_, key, value] = keyValueMatch;
      envVars[key] = value;
  }

  return envVars;
}

/**
 * Extracts all necessary information from the terraform files
 * 
 * @param path Path to the ecp-integration-services folder
 * @returns Array of ComponentVersionInfo objects
 */
function getComponentsFromPath(path: string): ComponentVersionInfo[] {
  // Create an empty array to store the components
  const components: ComponentVersionInfo[] = [];
  const dirs = walkSync(path);
  for (const dir of dirs) {
    if (dir.name.startsWith(".")) {
      continue;
    }
    if (dir.isDirectory) {
      continue;
    }
    const app = extractComponentVersionInfo(dir.path);

    if(!app.component || !app.version) {
      continue;
    }
    app.AppEnvVars = extractEnvVars(Deno.readTextFileSync(dir.path));
    components.push(app);
  }
  return components;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {


  
  // Set ENV VARS in VS Code launch.json. See help here https://docs.deno.com/runtime/reference/vscode
  const isDebug = Deno.env.get("DEBUG") 
  if (isDebug){
    Deno.args[0] = Deno.env.get("DEBUG_ARG_ZERO") || "";
  }
  
  const path = Deno.args[0];
  if (!path) {
    //If in debug mode, provide a default path
    logRed("Please provide the path to ecp-integration-services folder as an argument."); 
    Deno.exit(1);
  }

  const prodPath = path + "/Terraform/Environments/prod/workload";
  const stagePath = path + "/Terraform/Environments/stage/workload";
  

  const prodComps: ComponentVersionInfo[] = getComponentsFromPath(prodPath);
  const stageComps: ComponentVersionInfo[] = getComponentsFromPath(stagePath);

  // sort prodComps by component name
  //const sortedProdComps = prodComps.sort((a,b) => a.component.localeCompare(b.component));

  for (const prodComp of prodComps) {
    const stageComp = stageComps.find((c) => c.component === prodComp.component);
    if (!stageComp) {
      logRed(`Component ${prodComp.component} is missing in stage.`);
      continue;
    }
  
    if (stageComp?.version !== prodComp?.version) {
      logRed(`${prodComp.component} has different version in prod (${prodComp.version}) and stage (${stageComp?.version})`);
    } else {
      logGreen(`${prodComp.component} is in sync in prod (${prodComp.version}) and stage (${stageComp?.version})`);
    }

    // Check if the environment variables are present in both prod and stage
    for (const key of Object.keys(stageComp.AppEnvVars)) {
      //Check if the key is present in stage
      if (!prodComp?.AppEnvVars[key]) {
        logPinkIndend(`Environment variable ${key} is missing in prod! Value in stage is (${stageComp?.AppEnvVars[key]})`);
      }
    }
    //console.log();
  }

  prompt("Press Enter to exit.");
}
