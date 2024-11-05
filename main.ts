
import { logGreen, logPinkIndend, logRed, logBlueIndend } from "./logging_utils.ts"; //Just learning about importing from local files :)
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
function extractEnvironmentVariables(fileContent: string): EnvVars {
  const result: EnvVars = {};
  const lines = fileContent.split('\n');
  
  let isInEnvVarBlock = false;
  
  for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if we're entering the environment_vars block
      if (trimmedLine === 'environment_vars = {') {
          isInEnvVarBlock = true;
          continue;
      }
      
      // Check if we're exiting the environment_vars block
      if (isInEnvVarBlock && trimmedLine === '}') {
          isInEnvVarBlock = false;
          continue;
      }
      
      // Process lines within the environment_vars block
      if (isInEnvVarBlock && trimmedLine.includes('=')) {
          // Remove quotes and commas
          const cleanLine = trimmedLine.replace(/["',]/g, '');
          const [key, ...valueParts] = cleanLine.split('=');
          
          // Join value parts in case the value contained '=' characters
          const value = valueParts.join('=');
          
          if (key && value) {
              result[key.trim()] = value.trim();
          }
      }
  }
  
  return result;
}

/**
 * Extracts all necessary information from the terraform files
 * 
 * @param path Path to the ecp-integration-services folder
 * @returns Array of ComponentVersionInfo objects
 */
function getComponentsFromPath(path: string): ComponentVersionInfo[] {
  
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
    app.AppEnvVars = extractEnvironmentVariables(Deno.readTextFileSync(dir.path));
    components.push(app);
  }
  return components;
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {

  // Set ENV VARS in VS Code launch.json for easy debuging. See help here https://docs.deno.com/runtime/reference/vscode
  const isDebug = Deno.env.get("DEBUG") 
  if (isDebug){
    Deno.args[0] = Deno.env.get("DEBUG_ARG_ZERO") || "";
  }
  
  const path = Deno.args[0];
  if (!path) {
    logRed("Please provide the path to ecp-integration-services folder as an argument."); 
    Deno.exit(1);
  }

  const prodPath = path + "/Terraform/Environments/prod/workload";
  const stagePath = path + "/Terraform/Environments/stage/workload";
  
  const prodComps: ComponentVersionInfo[] = getComponentsFromPath(prodPath);
  const stageComps: ComponentVersionInfo[] = getComponentsFromPath(stagePath);
  
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

    // Check if all the environment variables in stage are present in prod
    for (const key of Object.keys(stageComp.AppEnvVars)) {
      //Check if the key is present in stage
      if (!(key in prodComp.AppEnvVars)) {
        logPinkIndend(`Environment variable ${key} is in STAGE but not PROD! Value in STAGE is (${stageComp?.AppEnvVars[key]})`);
      }
    }

    // Check if all the environment variables in prod are present in stage
    for (const key of Object.keys(prodComp.AppEnvVars)) {
      //Check if the key is present in stage
      if (!(key in stageComp.AppEnvVars)) {
        logBlueIndend(`Environment variable ${key} is in PROD but not STAGE Value in PROD is (${prodComp?.AppEnvVars[key]})`);
      }
    }
  }
  prompt("Press Enter to exit.");
}
